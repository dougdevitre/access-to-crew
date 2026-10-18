import type { NextFunction, Request, Response } from 'express';

/**
 * The Access To disclaimer, as this API serves it. Block Crew has no
 * frontend yet, so the API is the product surface: any client renders the
 * notice from here rather than restating it. The wording mirrors
 * DISCLAIMER.md (synced from dougdevitre/access-to); keep the two in step.
 */
export const DISCLAIMER_TITLE = 'Block Crew';

export const DISCLAIMER_URL = 'https://github.com/dougdevitre/access-to-crew/blob/main/DISCLAIMER.md';

/** Short notice: what a client shows persistently, on every screen. */
export const DISCLAIMER_NOTICE =
  `Educational information only. ${DISCLAIMER_TITLE} is not legal, medical, mental health, ` +
  'financial or safety advice, and using it creates no professional relationship. ' +
  'In danger now? Call 911. For crisis support, call or text 988. ' +
  'Confirm anything important with the official source or a licensed professional.';

/** Full text: for a client's disclaimer page or first-use acknowledgment. */
export const DISCLAIMER_FULL_TEXT: readonly string[] = [
  `${DISCLAIMER_TITLE} provides general educational information only. It is not legal, medical, ` +
    'mental health, financial or safety advice. Using it does not create an attorney-client, ' +
    'clinician-patient or any other professional relationship with Doug Devitre, CoTrackPro or any contributor.',
  'Not for emergencies. If anyone is in danger, call 911. For crisis support, call or text 988.',
  'Not a substitute for a professional. Talk with a licensed attorney, clinician or trained advocate about your situation.',
  'Information can be wrong or out of date. Laws, programs, phone numbers, eligibility rules and deadlines ' +
    'change. Confirm everything with the official source before you rely on it.',
  'AI output can be incorrect. Review everything it produces. You are responsible for the decisions you ' +
    'make and anything you file or send.',
  'Protect privacy. Do not enter names, case numbers, addresses or other details that identify a person.',
  'No endorsement. Not affiliated with or endorsed by any court, agency or organization it mentions.',
  'No warranty. Provided "as is," without warranties of any kind. To the fullest extent the law allows, ' +
    'the maintainers and contributors are not liable for damages arising from its use.',
];

export const EMERGENCY_CONTACTS = [
  { number: '911', label: 'In danger now? Call 911.', href: 'tel:911' },
  { number: '988', label: 'For crisis support, call or text 988.', href: 'tel:988' },
] as const;

/** Compact form attached to responses that carry AI output. */
export const disclaimerSummary = { notice: DISCLAIMER_NOTICE, url: DISCLAIMER_URL } as const;

/** Links the full disclaimer from every response, errors and 404s included. */
export function disclaimerLink(_req: Request, res: Response, next: NextFunction): void {
  res.append('Link', `<${DISCLAIMER_URL}>; rel="terms-of-service"`);
  next();
}
