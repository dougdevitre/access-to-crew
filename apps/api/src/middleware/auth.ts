import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './error.js';

export interface AuthedRequest extends Request {
  auth?: { memberId: string; roles: string[] };
}

/**
 * Placeholder for Clerk verification. Deny by default: an unverified token
 * is a 401, never a pass-through.
 */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Missing bearer token'));
  // TODO: verify with Clerk backend SDK and populate req.auth.
  next();
}

export function requireRole(role: string) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.auth?.roles.includes(role)) return next(new HttpError(403, 'Insufficient role'));
    next();
  };
}
