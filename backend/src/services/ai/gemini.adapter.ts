import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';
import { buildRetryPrompt, buildRoadmapPrompt, SYSTEM_PROMPT } from './prompt';
import { AI_TIMEOUT_MS, AiProviderError, type AiAdapter, type GenerateOptions } from './types';

const MODEL = 'gemini-2.5-flash';

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

    try {
      const response = await getClient().models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          // Ask the provider itself for JSON where it supports it — one less
          // way for the output to arrive wrapped in prose.
          responseMimeType: 'application/json',
          temperature: 0.4,
          maxOutputTokens: 8192,
          abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
        },
      });

      const text = response.text;
      if (!text) throw new AiProviderError('gemini', 'Gemini returned an empty response');
      return text;
    } catch (err) {
      if (err instanceof AiProviderError) throw err;
      throw new AiProviderError('gemini', `Gemini request failed: ${describe(err)}`, {
        cause: err,
      });
    }
  },
};

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default geminiAdapter;
