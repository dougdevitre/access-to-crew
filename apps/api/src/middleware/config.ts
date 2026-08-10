import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './error.js';

/**
 * Fail closed when a feature dependency is unconfigured: the endpoint says
 * exactly which variable is missing and returns 503. Nothing ever runs in
 * a degraded-but-pretending mode.
 */
export function requireService(name: string, configured: () => boolean) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    if (!configured()) {
      return next(new HttpError(503, `Service unavailable: ${name} is not configured`));
    }
    next();
  };
}
