import { verifyToken } from '@clerk/backend';
import type { NextFunction, Request, Response } from 'express';
import type { AppConfig } from '../env.js';
import { HttpError } from './error.js';

export interface AuthedRequest extends Request {
  auth?: { memberId: string; roles: string[] };
}

/**
 * Clerk-verified bearer auth. Deny by default at every layer: no secret
 * configured is a 503 (never an open door), a missing or invalid token is
 * a 401. On success req.auth carries the Clerk subject and any roles from
 * a `metadata.roles` claim in the JWT template.
 */
export function requireAuth(config: AppConfig) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!config.clerkSecretKey) {
      return next(new HttpError(503, 'Auth is not configured (CLERK_SECRET_KEY missing)'));
    }
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Missing bearer token'));

    verifyToken(header.slice('Bearer '.length), {
      secretKey: config.clerkSecretKey,
      // With a PEM public key set, verification is fully networkless.
      ...(config.clerkJwtKey ? { jwtKey: config.clerkJwtKey } : {}),
    })
      .then((payload) => {
        const metadata = payload.metadata as { roles?: unknown } | undefined;
        const roles = Array.isArray(metadata?.roles)
          ? metadata.roles.filter((r): r is string => typeof r === 'string')
          : [];
        req.auth = { memberId: payload.sub, roles };
        next();
      })
      .catch(() => next(new HttpError(401, 'Invalid or expired token')));
  };
}

export function requireRole(role: string) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.auth?.roles.includes(role)) return next(new HttpError(403, 'Insufficient role'));
    next();
  };
}
