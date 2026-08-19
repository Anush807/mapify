import { env } from '../../config/env';
import { claudeAdapter } from './claude.adapter';
import { geminiAdapter } from './gemini.adapter';
import { mockAdapter } from './mock.adapter';
import { openaiAdapter } from './openai.adapter';
import type { AiAdapter, GenerateOptions } from './types';

const adapters: Record<string, AiAdapter> = {
  gemini: geminiAdapter,
  openai: openaiAdapter,
  claude: claudeAdapter,
  mock: mockAdapter,
};

export function getAdapter(): AiAdapter {
  const adapter = adapters[env.AI_PROVIDER];
  if (!adapter) throw new Error(`Unknown AI_PROVIDER: ${env.AI_PROVIDER}`);
  return adapter;
}

/** Raw provider text — parsing and validation happen in roadmap.service. */
export async function generateRoadmap(
  topic: string,
  options?: GenerateOptions,
): Promise<string> {
  return getAdapter().generateRoadmap(topic, options);
}

export { AiProviderError } from './types';
export type { AiAdapter, GenerateOptions } from './types';
