import type Anthropic from '@anthropic-ai/sdk';
import { enforceInvariants } from './invariants.js';
import { ESCALATION_ROUTES, GATE_IDS, renderRubricPrompt, RUBRIC_VERSION } from './rubric.js';
import { ClassificationSchema, type Classification, type TaskProposal } from './schema.js';

/** Overridable per-deployment; recorded in the classifications audit table. */
export const TIER0_MODEL = process.env.TIER0_MODEL ?? 'claude-opus-5';

/**
 * The model refused, or twice failed to produce a schema-valid
 * classification. Fail closed: no synthetic verdict ever enters the audit
 * trail. The API maps this to a 502.
 */
export class ClassifierOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClassifierOutputError';
  }
}

/**
 * JSON schema for structured output. Cross-field rules (reject needs an
 * escalation route, downgrade needs a task) and numeric bounds are enforced
 * client-side by ClassificationSchema — structured outputs support neither.
 */
const CLASSIFICATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'rubricVersion',
    'verdict',
    'gates',
    'downgradedTask',
    'crewMin',
    'crewMax',
    'durationMinutes',
    'kit',
    'doneState',
    'escalation',
    'confidence',
    'needsHumanReview',
  ],
  properties: {
    rubricVersion: { type: 'string' },
    verdict: { type: 'string', enum: ['pass', 'downgrade', 'reject'] },
    gates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['gate', 'result', 'reason'],
        properties: {
          gate: { type: 'string', enum: [...GATE_IDS] },
          result: { type: 'string', enum: ['pass', 'fail', 'unknown'] },
          reason: { type: 'string' },
        },
      },
    },
    downgradedTask: { type: ['string', 'null'] },
    crewMin: { type: 'integer' },
    crewMax: { type: 'integer' },
    durationMinutes: { type: 'integer' },
    kit: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'qty'],
        properties: { item: { type: 'string' }, qty: { type: 'integer' } },
      },
    },
    doneState: { type: 'string' },
    escalation: { type: 'array', items: { type: 'string', enum: [...ESCALATION_ROUTES] } },
    confidence: { type: 'number' },
    needsHumanReview: { type: 'boolean' },
  },
} as const;

function renderProposal(proposal: TaskProposal): string {
  return [
    `Source: ${proposal.source}`,
    `Consent on file: ${proposal.consentOnFile}`,
    `Photos provided: ${proposal.photos.length}`,
    '',
    'Description:',
    proposal.description,
  ].join('\n');
}

async function requestClassification(
  proposal: TaskProposal,
  client: Anthropic,
): Promise<Classification | null> {
  const response = await client.messages.create({
    model: TIER0_MODEL,
    max_tokens: 4096,
    // The rubric prompt is byte-identical across calls; cache it.
    system: [
      { type: 'text', text: renderRubricPrompt(), cache_control: { type: 'ephemeral' } },
    ],
    output_config: {
      format: { type: 'json_schema', schema: CLASSIFICATION_JSON_SCHEMA },
    },
    messages: [{ role: 'user', content: renderProposal(proposal) }],
  });

  if (response.stop_reason === 'refusal') {
    throw new ClassifierOutputError('Classifier declined the request (refusal stop reason).');
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }

  const parsed = ClassificationSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Classify a proposal against the Tier-0 rubric. One retry on invalid
 * output, then fail closed. The returned classification has already been
 * through enforceInvariants, and rubricVersion is always ours — the audit
 * key is never trusted from the model.
 */
export async function classify(
  proposal: TaskProposal,
  opts: { client: Anthropic },
): Promise<Classification> {
  let classification = await requestClassification(proposal, opts.client);
  if (classification === null) {
    classification = await requestClassification(proposal, opts.client);
  }
  if (classification === null) {
    throw new ClassifierOutputError('Classifier produced invalid output twice; refusing to guess.');
  }

  classification.rubricVersion = RUBRIC_VERSION;
  return enforceInvariants(classification, proposal);
}
