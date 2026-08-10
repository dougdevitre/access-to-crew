import Anthropic from '@anthropic-ai/sdk';
import { Router } from 'express';
import { canAutoPublish, classify, TaskProposalSchema } from '@blockcrew/tier0';
import { HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';

export function classifyRouter(client: Anthropic): Router {
  const router = Router();

  router.post('/classify', requireAuth, async (req, res, next) => {
    const parsed = TaskProposalSchema.safeParse(req.body);
    if (!parsed.success) return next(new HttpError(400, 'Invalid proposal', parsed.error.issues));

    try {
      const result = await classify(parsed.data, { client });
      // TODO: persist to classifications table before responding.
      res.json({ classification: result, autoPublishable: canAutoPublish(result) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
