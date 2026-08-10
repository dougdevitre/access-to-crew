import { z } from 'zod';
import { ESCALATION_ROUTES, GATE_IDS } from './rubric.js';

export const TaskProposalSchema = z.object({
  description: z.string().min(1),
  /** Base64 payloads or storage keys. Photos are optional context, never required. */
  photos: z.array(z.string()).default([]),
  source: z.enum(['host', 'csb_311']),
  /** Documented authority over the ground (G7). 311 data alone never establishes this. */
  consentOnFile: z.boolean(),
});

export type TaskProposal = z.infer<typeof TaskProposalSchema>;

export const GateResultSchema = z.object({
  gate: z.enum(GATE_IDS),
  result: z.enum(['pass', 'fail', 'unknown']),
  reason: z.string().min(1),
});

export type GateResult = z.infer<typeof GateResultSchema>;

export const KitItemSchema = z.object({
  item: z.string().min(1),
  qty: z.number().int().positive(),
});

export type KitItem = z.infer<typeof KitItemSchema>;

export const ClassificationSchema = z
  .object({
    rubricVersion: z.string().min(1),
    verdict: z.enum(['pass', 'downgrade', 'reject']),
    gates: z.array(GateResultSchema).min(1),
    downgradedTask: z.string().nullable(),
    crewMin: z.number().int().positive(),
    crewMax: z.number().int().positive(),
    durationMinutes: z.number().int().positive(),
    kit: z.array(KitItemSchema),
    doneState: z.string().min(1),
    escalation: z.array(z.enum(ESCALATION_ROUTES)),
    confidence: z.number().min(0).max(1),
    needsHumanReview: z.boolean(),
  })
  .superRefine((c, ctx) => {
    if (c.verdict === 'reject' && c.escalation.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['escalation'],
        message: 'A reject must name at least one escalation route.',
      });
    }
    if (c.verdict === 'downgrade' && c.downgradedTask === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['downgradedTask'],
        message: 'A downgrade must name the downgraded task.',
      });
    }
  });

export type Classification = z.infer<typeof ClassificationSchema>;
