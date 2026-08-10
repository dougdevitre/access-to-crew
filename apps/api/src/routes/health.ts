import { Router } from 'express';
import { RUBRIC_VERSION } from '@blockcrew/tier0';

export const healthRouter: Router = Router();

healthRouter.get('/healthz', (_req, res) => {
  res.json({ ok: true, rubricVersion: RUBRIC_VERSION });
});
