/**
 * The Tier-0 Task Standard, v1.0 — machine-readable form.
 *
 * This file is canonical. docs/tier0-standard.md is generated prose; edit
 * here first, then update the doc. The classifier prompt is rendered from
 * these tables so the model and the docs can never drift apart silently.
 */

export const RUBRIC_VERSION = '1.0.0';

export const GATE_IDS = [
  'G1_SKILL',
  'G2_TOOL',
  'G3_GROUND',
  'G4_LOAD',
  'G5_HAZARD',
  'G6_STRUCTURE',
  'G7_CONSENT',
  'G8_REVERSIBLE',
  'G9_BOUNDED',
] as const;

export type GateId = (typeof GATE_IDS)[number];

export interface GateDefinition {
  id: GateId;
  name: string;
  test: string;
}

export const GATES: readonly GateDefinition[] = [
  {
    id: 'G1_SKILL',
    name: 'No skill',
    test: 'Explainable in under 60 seconds. No certification, license, or prior experience. A first-timer performs it correctly on the first attempt.',
  },
  {
    id: 'G2_TOOL',
    name: 'Hand tools only',
    test: 'Approved hand tools only. No powered tools of any kind, including battery. No blades longer than hand loppers.',
  },
  {
    id: 'G3_GROUND',
    name: 'Feet on ground',
    test: 'Both feet on the ground at all times. Nothing above standing reach. No ladders, roofs, scaffolds, or bucket work.',
  },
  {
    id: 'G4_LOAD',
    name: 'Load limit',
    test: 'No solo lift over 25 lb. No two-person carry over 50 lb. No mattresses, appliances, tires, or construction debris.',
  },
  {
    id: 'G5_HAZARD',
    name: 'No hazards',
    test: 'No chemicals beyond water. No sharps, syringes, unknown liquids, drums, batteries, or suspected asbestos. Broken glass may be swept or shoveled — never hand-picked.',
  },
  {
    id: 'G6_STRUCTURE',
    name: 'No structures',
    test: 'No entry into vacant, damaged, or condemned structures. No tarping, boarding, shoring, or demolition. No work near downed lines.',
  },
  {
    id: 'G7_CONSENT',
    name: 'Consent',
    test: 'Public right-of-way, or ground the host has documented authority over. Private property requires named owner consent on file.',
  },
  {
    id: 'G8_REVERSIBLE',
    name: 'Reversible',
    test: 'Worst realistic outcome is "it looks unchanged." Never property damage, ecological harm, or destruction of anything a resident wanted kept.',
  },
  {
    id: 'G9_BOUNDED',
    name: 'Bounded',
    test: 'Finishable by the stated crew within 90 minutes, against a written done-state.',
  },
];

export type SessionGateId = 'E1' | 'E2' | 'E3' | 'E4';

export interface SessionGateDefinition {
  id: SessionGateId;
  name: string;
  test: string;
}

/** Applied at scheduling and again at start time — not by the classifier. */
export const SESSION_GATES: readonly SessionGateDefinition[] = [
  { id: 'E1', name: 'Daylight', test: 'Start and end within daylight hours.' },
  { id: 'E2', name: 'Never solo', test: 'Minimum 2 people, named crew lead present.' },
  {
    id: 'E3',
    name: 'Weather',
    test: 'Auto-cancel on heat advisory, lightning within 10 miles, ice, or air quality alert.',
  },
  { id: 'E4', name: 'Meet point', test: 'Publicly accessible, on a mapped street.' },
];

export const ESCALATION_ROUTES = [
  'bulk_pickup',
  'dumping_report',
  'forestry',
  'hazmat',
  'structure',
  'skilled_partner',
] as const;

export type EscalationRoute = (typeof ESCALATION_ROUTES)[number];

export const APPROVED_TOOLS: readonly string[] = [
  'litter grabber',
  'push broom',
  'leaf rake',
  'flat shovel',
  'snow shovel',
  'hand loppers',
  'hand shears',
  'trowel',
  'wheelbarrow',
  'watering can',
  'work gloves',
  'safety glasses',
  'trash bag',
  'rubble bag',
  'recycling cart',
];

/**
 * Render the classifier system prompt from the rubric. Byte-stable across
 * calls so the prompt-cache prefix always hits.
 */
export function renderRubricPrompt(): string {
  const gateLines = GATES.map((g) => `- ${g.id} (${g.name}): ${g.test}`).join('\n');

  return [
    `You are the Tier-0 task classifier for Block Crew, a St. Louis civic volunteering platform (rubric v${RUBRIC_VERSION}).`,
    '',
    'A Tier-0 task is safe for untrained volunteers. A task is Tier-0 only if it passes EVERY gate below. Any failure means REJECT or DOWNGRADE.',
    '',
    'Task gates:',
    gateLines,
    '',
    'Verdicts:',
    '- "pass": every gate passes. Publishes after host confirmation.',
    '- "downgrade": the Tier-0 slice of a non-Tier-0 request (e.g. "tree down across alley" -> the crew does NOT cut; they clear already-cut small limbs and sweep after a licensed crew has been through). A downgrade MUST name the downgraded task in downgradedTask, and the done-state must state the dependency.',
    '- "reject": no safe Tier-0 slice exists. A reject MUST name at least one escalation route.',
    '',
    `Escalation routes (the only valid values): ${ESCALATION_ROUTES.join(', ')}.`,
    '',
    `Approved tools (anything else fails G2_TOOL): ${APPROVED_TOOLS.join(', ')}.`,
    '',
    'Output rules:',
    '- Respond with a single JSON object matching the required schema. No prose outside the JSON.',
    `- rubricVersion is "${RUBRIC_VERSION}".`,
    '- gates: one entry per gate you evaluated, each with result "pass", "fail", or "unknown" and a one-sentence factual reason. Use "unknown" when the description does not establish the fact — never guess a pass.',
    '- crewMin/crewMax: realistic crew size (minimum 2 — never solo). durationMinutes: 90 or less (G9).',
    '- kit: items from the approved tools list only, with positive integer quantities sized to the crew.',
    '- doneState: a written, checkable done-state in one or two sentences.',
    '- confidence: 0 to 1, your honest calibration. Low confidence or any "unknown" gate routes the task to human review downstream.',
    '- Public-facing language says "low risk", never "no risk".',
  ].join('\n');
}
