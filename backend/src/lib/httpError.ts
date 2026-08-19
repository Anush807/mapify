/**
 * Errors thrown anywhere below the controller layer carry their own status and
 * a client-safe message, so `errorHandler` never has to guess.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Not authenticated'): HttpError {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }
  static notFound(message = 'Not found'): HttpError {
    return new HttpError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string): HttpError {
    return new HttpError(409, 'CONFLICT', message);
  }
  /** AI output failed validation after the retry. */
  static unprocessable(message: string, details?: unknown): HttpError {
    return new HttpError(422, 'UNPROCESSABLE', message, details);
  }
  /** Upstream AI provider failed or timed out. */
  static badGateway(message: string): HttpError {
    return new HttpError(502, 'BAD_GATEWAY', message);
  }
}
