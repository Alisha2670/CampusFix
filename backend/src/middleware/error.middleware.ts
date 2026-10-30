import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response.util.js';
import { ENV } from '../config/env.js';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'Request validation failed', 'VALIDATION_ERROR', 400, details);
    return;
  }

  // Handle Mongo duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    sendError(
      res,
      `An account with this ${field} already exists.`,
      'DUPLICATE_ENTRY',
      409,
      { field, value: err.keyValue?.[field] }
    );
    return;
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    sendError(
      res,
      `Invalid identifier format for ${err.path}`,
      'INVALID_ID',
      400
    );
    return;
  }

  // Handle JSON parsing error
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'Malformed JSON in request body', 'BAD_REQUEST', 400);
    return;
  }

  // Log unknown/internal errors in non-test mode
  if (ENV.NODE_ENV !== 'test') {
    console.error('[Unhandled Server Error]', err);
  }

  sendError(
    res,
    ENV.NODE_ENV === 'production'
      ? 'An unexpected server error occurred.'
      : err.message || 'Internal server error',
    'INTERNAL_SERVER_ERROR',
    500
  );
};
