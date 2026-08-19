import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from '../lib/httpError';

/**
 * Parses and *replaces* req.body with the schema output, so downstream handlers
 * get the transformed value (trimmed topic, lowercased email) and not raw input.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(
        HttpError.badRequest(
          'Invalid request body',
          result.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        ),
      );
      return;
    }
    req.body = result.data;
    next();
  };
}
