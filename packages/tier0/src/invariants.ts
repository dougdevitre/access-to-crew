import type { Classification, TaskProposal } from './schema.js';

/**
 * Below this, a classification is never trusted unattended. Exported so the
 * threshold is auditable alongside the rubric rather than buried in code.
 */
export const CONFIDENCE_FLOOR = 0.7;

/**
 * The deterministic safety layer. The model proposes; this code disposes.
 * Every classification passes through here before anything downstream sees
 * it, so the hard limits hold regardless of what the model output.
 */
export function enforceInvariants(c: Classification, proposal: TaskProposal): Classification {
  const out: Classification = {
    ...c,
    gates: [...c.gates],
    kit: [...c.kit],
    escalation: [...c.escalation],
  };

  // G9: sessions are bounded at 90 minutes, full stop.
  out.durationMinutes = Math.min(out.durationMinutes, 90);

  // E2: never solo.
  out.crewMin = Math.max(out.crewMin, 2);
  out.crewMax = Math.max(out.crewMax, out.crewMin);

  if (out.confidence < CONFIDENCE_FLOOR) out.needsHumanReview = true;

  // An unknown gate is an unestablished safety fact, not a pass.
  if (out.gates.some((g) => g.result === 'unknown')) out.needsHumanReview = true;

  // G7: no documented authority over the ground -> a human checks before
  // anything publishes. This is intentionally broader than csb_311 alone.
  if (!proposal.consentOnFile) out.needsHumanReview = true;

  // A failing gate can never ride out under a pass or downgrade verdict.
  if (out.gates.some((g) => g.result === 'fail') && out.verdict !== 'reject') {
    out.verdict = 'reject';
    out.needsHumanReview = true;
    if (out.escalation.length === 0) out.escalation.push('skilled_partner');
  }

  return out;
}

/** A task publishes without human review only when nothing above flagged it. */
export function canAutoPublish(c: Classification): boolean {
  return (
    c.verdict === 'pass' &&
    !c.needsHumanReview &&
    c.gates.every((g) => g.result === 'pass') &&
    c.durationMinutes <= 90 &&
    c.crewMin >= 2
  );
}
