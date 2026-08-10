import type Anthropic from '@anthropic-ai/sdk';
import { Router } from 'express';
import {
  canAutoPublish,
  ClassifierOutputError,
  classify,
  TaskProposalSchema,
  TIER0_MODEL,
} from '@blockcrew/tier0';
import { getPool, insertClassification } from '../db.js';
import type { AppConfig } from '../env.js';
import { requireAuth } from '../middleware/auth.js';
import { requireService } from '../middleware/config.js';
import { HttpError } from '../middleware/error.js';

export function classifyRouter(config: AppConfig, client: Anthropic | null): Router {
  const router = Router();

  router.post(
    '/classify',
    requireService('ANTHROPIC_API_KEY', () => client !== null),
    requireAuth(config),
    async (req, res, next) => {
      const parsed = TaskProposalSchema.safeParse(req.body);
      if (!parsed.success) return next(new HttpError(400, 'Invalid proposal', parsed.error.issues));

      try {
        const result = await classify(parsed.data, { client: client! });

        // Audit-trail write: best-effort while the DB is optional; the
        // response says honestly whether the row landed.
        let persisted = false;
        const pool = getPool(config);
        if (pool) {
          try {
            await insertClassification(pool, {
              model: TIER0_MODEL,
              proposal: parsed.data,
              classification: result,
            });
            persisted = true;
          } catch (err) {
            console.error('classification persistence failed', err);
          }
        }

        res.json({ classification: result, autoPublishable: canAutoPublish(result), persisted });
      } catch (err) {
        if (err instanceof ClassifierOutputError) {
          return next(new HttpError(502, 'Classifier unavailable or produced invalid output'));
        }
        next(err);
      }
    },
  );

  return router;
}
