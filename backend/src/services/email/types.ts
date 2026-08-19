export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * The whole contract a provider has to satisfy. Composing the message happens
 * one level up in `templates.ts`, identically for every provider — so swapping
 * providers is a one-file change plus an env flip, same as the AI layer.
 */
export interface EmailAdapter {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

export class EmailProviderError extends Error {
  readonly provider: string;

  constructor(provider: string, message: string, options?: { cause?: unknown }) {
    super(message, options as ErrorOptions);
    this.name = 'EmailProviderError';
    this.provider = provider;
  }
}
