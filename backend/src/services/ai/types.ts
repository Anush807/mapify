export interface GenerateOptions {
  /** Appended to the base prompt on the retry attempt. */
  previousError?: string;
}

/**
 * The whole contract an AI provider has to satisfy: topic in, raw text out.
 * Parsing and validation happen one level up in roadmap.service, identically
 * for every provider — so swapping providers is a one-file change plus an env
 * var flip.
 */
export interface AiAdapter {
  readonly name: string;
  generateRoadmap(topic: string, options?: GenerateOptions): Promise<string>;
}

/** Thrown when the provider itself fails (network, auth, quota, timeout). */
export class AiProviderError extends Error {
  readonly provider: string;

  constructor(provider: string, message: string, options?: { cause?: unknown }) {
    super(message, options as ErrorOptions);
    this.name = 'AiProviderError';
    this.provider = provider;
  }
}

export const AI_TIMEOUT_MS = 60_000;
