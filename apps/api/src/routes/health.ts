import { Router } from 'express';
import { RUBRIC_VERSION } from '@blockcrew/tier0';
import type { AppConfig } from '../env.js';

/**
 * Always 200, no network calls, no secret values — safe to expose and safe
 * to hit before any environment variable exists. Reports which dependencies
 * are configured so a fresh deployment is diagnosable at a glance.
 */
export function healthRouter(config: AppConfig): Router {
  const router = Router();

  router.get('/healthz', (_req, res) => {
    const dep = (present: unknown) => (present ? 'configured' : 'missing');
    res.json({
      ok: true,
      rubricVersion: RUBRIC_VERSION,
      env: config.nodeEnv,
      deps: {
        anthropic: dep(config.anthropicApiKey),
        clerk: dep(config.clerkSecretKey),
        database: dep(config.databaseUrl),
        csb: dep(config.csbOpen311Url),
        evidenceBucket: dep(config.evidenceBucket),
      },
    });
  });

  return router;
}
