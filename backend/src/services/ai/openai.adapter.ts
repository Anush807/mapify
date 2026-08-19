import OpenAI from 'openai';
import { env } from '../../config/env';
import { buildRetryPrompt, buildRoadmapPrompt, SYSTEM_PROMPT } from './prompt';
import { AI_TIMEOUT_MS, AiProviderError, type AiAdapter, type GenerateOptions } from './types';

const MODEL = 'gpt-4o-mini';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new AiProviderError('openai', 'OPENAI_API_KEY is not configured');
  }
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: AI_TIMEOUT_MS });
  return client;
}

export const openaiAdapter: AiAdapter = {
  name: 'openai',

  async generateRoadmap(topic: string, options: GenerateOptions = {}): Promise<string> {
    const prompt = options.previousError
      ? buildRetryPrompt(topic, options.previousError)
      : buildRoadmapPrompt(topic);

    try {
      const response = await getClient().chat.completions.create({
        model: MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      });

      const text = response.choices[0]?.message?.content;
      if (!text) throw new AiProviderError('openai', 'OpenAI returned an empty response');
      return text;
    } catch (err) {
      if (err instanceof AiProviderError) throw err;
      throw new AiProviderError('openai', `OpenAI request failed: ${describe(err)}`, {
        cause: err,
      });
    }
  },
};

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default openaiAdapter;
