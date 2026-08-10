import { describe, expect, it } from 'vitest';
import { buildKit, canAutoPublish, ClassificationSchema, enforceInvariants, RUBRIC_VERSION, type Classification, type TaskProposal } from '../src/index.js';

const hostProposal: TaskProposal = {
  description: 'Alley behind the 4200 block is covered in loose litter and leaves.',
  photos: [],
  source: 'host',
  consentOnFile: true,
};

function base(overrides: Partial<Classification> = {}): Classification {
  return {
    rubricVersion: RUBRIC_VERSION,
    verdict: 'pass',
    gates: [{ gate: 'G1_SKILL', result: 'pass', reason: 'Litter pickup needs no training.' }],
    downgradedTask: null,
    crewMin: 6,
    crewMax: 12,
    durationMinutes: 90,
    kit: [{ item: 'litter grabber', qty: 6 }],
    doneState: 'Alley pad swept curb-to-curb, bags staged at the north end.',
    escalation: [],
    confidence: 0.9,
    needsHumanReview: false,
    ...overrides,
  } as Classification;
}

describe('invariants', () => {
  it('caps session length at 90 minutes regardless of model output', () => {
    const out = enforceInvariants(base({ durationMinutes: 240 }), hostProposal);
    expect(out.durationMinutes).toBe(90);
  });

  it('never allows a solo crew', () => {
    const out = enforceInvariants(base({ crewMin: 1, crewMax: 1 }), hostProposal);
    expect(out.crewMin).toBeGreaterThanOrEqual(2);
    expect(out.crewMax).toBeGreaterThanOrEqual(out.crewMin);
  });

  it('flags low confidence for human review', () => {
    const out = enforceInvariants(base({ confidence: 0.4 }), hostProposal);
    expect(out.needsHumanReview).toBe(true);
  });

  it('flags an unknown gate for human review even at high confidence', () => {
    const out = enforceInvariants(
      base({ gates: [{ gate: 'G5_HAZARD', result: 'unknown', reason: 'Container contents not visible.' }] }),
      hostProposal,
    );
    expect(out.needsHumanReview).toBe(true);
  });

  it('flags 311-sourced proposals without consent on file (G7)', () => {
    const out = enforceInvariants(base(), { ...hostProposal, source: 'csb_311', consentOnFile: false });
    expect(out.needsHumanReview).toBe(true);
  });

  it('downgrades a pass that contains a failing gate', () => {
    const out = enforceInvariants(
      base({ gates: [{ gate: 'G2_TOOL', result: 'fail', reason: 'Requires a chainsaw.' }] }),
      hostProposal,
    );
    expect(out.verdict).toBe('reject');
    expect(out.escalation.length).toBeGreaterThan(0);
  });
});

describe('schema', () => {
  it('rejects a reject verdict with no escalation route', () => {
    const r = ClassificationSchema.safeParse(base({ verdict: 'reject', escalation: [] }));
    expect(r.success).toBe(false);
  });

  it('rejects a downgrade with no downgraded task', () => {
    const r = ClassificationSchema.safeParse(base({ verdict: 'downgrade', downgradedTask: null }));
    expect(r.success).toBe(false);
  });

  it('accepts a well-formed pass', () => {
    expect(ClassificationSchema.safeParse(base()).success).toBe(true);
  });
});

describe('auto-publish', () => {
  it('allows a clean pass', () => {
    expect(canAutoPublish(base())).toBe(true);
  });

  it('blocks anything flagged for review', () => {
    expect(canAutoPublish(base({ needsHumanReview: true }))).toBe(false);
  });
});

describe('kit sizing', () => {
  it('scales with crew size and rounds up', () => {
    const kit = buildKit('alley_sweep', 10);
    expect(kit.find((k) => k.item === 'push broom')?.qty).toBe(3);
    expect(kit.find((k) => k.item === 'trash bag')?.qty).toBe(30);
  });

  it('never returns a zero quantity', () => {
    for (const item of buildKit('greening', 2)) expect(item.qty).toBeGreaterThan(0);
  });
});
