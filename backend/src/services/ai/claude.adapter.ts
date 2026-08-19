import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { buildRetryPrompt, buildRoadmapPrompt, SYSTEM_PROMPT } from './prompt';
import { AI_TIMEOUT_MS, AiProviderError, type AiAdapter, type GenerateOptions } from './types';

const MODEL = 'claude-opus-5';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AiProviderError('claude', 'ANTHROPIC_API_KEY is not configured');
  }
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: AI_TIMEOUT_MS });
  return client;
}

export const claudeAdapter: AiAdapter = {
  name: 'claude',

  async generateRoadmap(topic: string, options: GenerateOptions = {}): Promise<string> {
    const prompt = options.previousError
      ? buildRetryPrompt(topic, options.previousError)
      : buildRoadmapPrompt(topic);

    try {
      const response = await getClient().messages.create({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        // Structured generation is a shallow task — keep thinking on (disabling
        // it on Opus 5 has its own failure modes) but spend little on it.
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: prompt }],
      });

      if (response.stop_reason === 'refusal') {
        throw new AiProviderError('claude', 'Claude declined to generate this roadmap');
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      if (!text.trim()) {
        throw new AiProviderError('claude', 'Claude returned an empty response');
      }
      return text;
    } catch (err) {
      if (err instanceof AiProviderError) throw err;
      if (err instanceof Anthropic.APIError) {
        throw new AiProviderError('claude', `Claude API error ${err.status}: ${err.message}`, {
          cause: err,
        });
      }
      throw new AiProviderError('claude', `Claude request failed: ${describe(err)}`, {
        cause: err,
      });
    }
  },
};

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default claudeAdapter;
