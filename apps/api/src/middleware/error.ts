import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly detail?: unknown) {
    super(message);
  }
}

/**
 * Never leak internals to the client. Log the real error, return a shape.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, detail: err.detail ?? null });
    return;
  }
  console.error('unhandled', err);
  res.status(500).json({ error: 'Internal server error' });
}
