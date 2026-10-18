import { Router } from 'express';
import {
  DISCLAIMER_FULL_TEXT,
  DISCLAIMER_NOTICE,
  DISCLAIMER_TITLE,
  DISCLAIMER_URL,
  EMERGENCY_CONTACTS,
} from '../disclaimer.js';

/**
 * Public, no auth, no dependencies: the one place a client fetches the
 * disclaimer it must show. 911 and 988 come with tel: hrefs so a client
 * renders them as tappable links.
 */
export function disclaimerRouter(): Router {
  const router = Router();

  router.get('/disclaimer', (_req, res) => {
    res.json({
      title: DISCLAIMER_TITLE,
      notice: DISCLAIMER_NOTICE,
      fullText: DISCLAIMER_FULL_TEXT,
      url: DISCLAIMER_URL,
      emergency: EMERGENCY_CONTACTS,
    });
  });

  return router;
}
