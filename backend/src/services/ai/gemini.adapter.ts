import { ApiError, FinishReason, GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';
import { buildRetryPrompt, buildRoadmapPrompt, SYSTEM_PROMPT } from './prompt';
import { AI_TIMEOUT_MS, AiProviderError, type AiAdapter, type GenerateOptions } from './types';

/**
 * Configurable, because pinned ids expire: `gemini-2.5-flash` is retired and the
 * API now 404s it. Defaults to the `gemini-flash-latest` alias — see
 * `GEMINI_MODEL` in config/env.ts.
 */
const MODEL = env.GEMINI_MODEL;

/**
 * Generous on purpose. Gemini 3 thinks before answering, and thinking tokens
 * are charged against this same ceiling while being excluded from
 * `response.text`. A measured run used ~830 thinking + ~2,280 output tokens, so
 * 8,192 left little headroom: a dense roadmap could spend the budget and return
 * truncated JSON (or nothing) with no obvious cause.
 */
const MAX_OUTPUT_TOKENS = 16384;

/**
 * This model returns 503 "high demand" often enough to see it in a handful of
 * consecutive calls. That is transient and worth re-sending as-is — distinct
 * from the *validation* retry one layer up, which re-prompts because the output
 * was wrong rather than because the call never landed.
 */
const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 700;

/**
 * The API returns a RetryInfo hint with 429s. A short one means a per-minute
 * rate limit worth waiting out; a long one means the daily quota is gone, and
 * sleeping on it would just hold the request open until it times out anyway.
 */
const MAX_RETRY_AFTER_MS = 5_000;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new AiProviderError('gemini', 'GEMINI_API_KEY is not configured');
  }
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export const geminiAdapter: AiAdapter = {
  name: 'gemini',

  async generateRoadmap(topic: string, options: GenerateOptions = {}): Promise<string> {
    const prompt = options.previousError
      ? buildRetryPrompt(topic, options.previousError)
      : buildRoadmapPrompt(topic);

    // One deadline for the whole operation, shared by every attempt, so retries
    // can't multiply the timeout budget.
    const signal = AbortSignal.timeout(AI_TIMEOUT_MS);
    let lastTransient: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await requestOnce(prompt, signal);
      } catch (err) {
        if (err instanceof AiProviderError) throw err;

        const transient = transientInfoOf(err);
        const waitTooLong =
          transient?.retryAfterMs != null && transient.retryAfterMs > MAX_RETRY_AFTER_MS;

        if (transient === null || waitTooLong || attempt === MAX_ATTEMPTS || signal.aborted) {
          throw new AiProviderError('gemini', explain(err, transient), { cause: err });
        }

        lastTransient = err;
        const backoff = Math.max(BASE_BACKOFF_MS * 2 ** (attempt - 1), transient.retryAfterMs ?? 0);
        console.warn(
          `[ai:gemini] transient ${transient.status} on attempt ${attempt}/${MAX_ATTEMPTS}, retrying in ${backoff}ms`,
        );
        await delay(backoff, signal);
      }
    }

    throw new AiProviderError('gemini', explain(lastTransient, transientInfoOf(lastTransient)));
  },
};

async function requestOnce(prompt: string, signal: AbortSignal): Promise<string> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      // Ask the provider itself for JSON where it supports it — one less way
      // for the output to arrive wrapped in prose.
      responseMimeType: 'application/json',
      temperature: 0.4,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: signal,
    },
  });

  // Why the model stopped decides whether a retry is even worth spending.
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== FinishReason.STOP) {
    throw new AiProviderError('gemini', describeFinishReason(finishReason));
  }

  const text = response.text;
  if (!text) throw new AiProviderError('gemini', 'Gemini returned an empty response');
  return text;
}

interface TransientInfo {
  status: number;
  /** From the API's RetryInfo, when it supplies one. */
  retryAfterMs: number | null;
}

/** Details if this failure is worth re-sending, otherwise null. */
function transientInfoOf(err: unknown): TransientInfo | null {
  const message = err instanceof Error ? err.message : '';

  // Not every failure arrives as an ApiError; some carry the API's JSON body in
  // the message instead.
  const fromMessage = /"code"\s*:\s*(\d{3})/.exec(message);
  const status =
    err instanceof ApiError
      ? err.status
      : fromMessage?.[1]
        ? Number(fromMessage[1])
        : Number.NaN;

  if (!TRANSIENT_STATUSES.has(status)) return null;

  const retry = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(message);
  return {
    status,
    retryAfterMs: retry?.[1] ? Math.round(Number(retry[1]) * 1000) : null,
  };
}

/**
 * Quota exhaustion is the one provider failure an operator has to act on rather
 * than wait out, so it gets named explicitly instead of being folded into a
 * generic request failure.
 */
function explain(err: unknown, transient: TransientInfo | null): string {
  if (transient?.status === 429) {
    const quota = /"quotaId"\s*:\s*"([^"]+)"/.exec(err instanceof Error ? err.message : '');
    const wait = transient.retryAfterMs ? ` Retry in ~${Math.ceil(transient.retryAfterMs / 1000)}s.` : '';
    return `Gemini quota or rate limit exceeded${quota?.[1] ? ` (${quota[1]})` : ''}.${wait}`;
  }
  return `Gemini request failed: ${describe(err)}`;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason as Error);
      },
      { once: true },
    );
  });
}

/**
 * Without this, a truncated response surfaces one layer up as "the response was
 * not parseable JSON", which points at the prompt instead of the token ceiling
 * and burns the single validation retry on a problem retrying cannot fix.
 */
function describeFinishReason(reason: FinishReason): string {
  switch (reason) {
    case FinishReason.MAX_TOKENS:
      return `Gemini (${MODEL}) hit the ${MAX_OUTPUT_TOKENS}-token output limit and returned a truncated roadmap`;
    case FinishReason.SAFETY:
    case FinishReason.PROHIBITED_CONTENT:
      return 'Gemini declined to generate a roadmap for this topic';
    case FinishReason.RECITATION:
      return 'Gemini stopped generating to avoid reciting training data';
    default:
      return `Gemini stopped unexpectedly (${reason})`;
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default geminiAdapter;
