/**
 * St. Louis CSB (311) ingest.
 *
 * The city exposes service requests over an Open311-spec API and as a
 * weekly CSV. Residents have already told the city what is broken; this job
 * turns those complaints into candidate work sessions.
 *
 * Pipeline:
 *   fetch  -> filter to Tier-0-eligible service codes
 *          -> cluster within ~250m
 *          -> summarise cluster
 *          -> Tier-0 classifier gate
 *          -> park as a DRAFT proposal for a resident host to confirm
 *
 * A draft NEVER auto-publishes. See docs/equity-guardrails.md — routing
 * volunteers purely by complaint density sends outsiders into the
 * neighborhoods that report most, which is the failure mode this whole
 * design exists to avoid.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { classify, type Classification } from '@blockcrew/tier0';
import { centroid, cluster, type Clusterable } from '../lib/geo.js';

/** Service codes worth looking at. Everything else is out of scope by design. */
export const TIER0_ELIGIBLE_CODES: Record<string, string> = {
  'Debris-Alley/Street': 'alley_sweep',
  'Debris-Vacant Lot': 'lot_litter',
  'Debris-Vacant Bldg': 'lot_litter',
  'Debris-Occupied Bldg': 'lot_litter',
  'Weeds/High Grass': 'sidewalk_clearing',
  'Litter Pickup': 'lot_litter',
};

/** Never propose from these, whatever the description says. */
export const EXCLUDED_KEYWORDS = [
  'tire', 'mattress', 'appliance', 'refrigerator', 'asbestos', 'syringe',
  'needle', 'chemical', 'drum', 'oil', 'tree down', 'limb', 'power line',
];

export interface Open311Request {
  service_request_id: string;
  service_code?: string;
  service_name?: string;
  description?: string;
  lat?: number;
  long?: number;
  requested_datetime?: string;
  status?: string;
}

export interface Proposal {
  clusterKey: string;
  taskProfile: string;
  requestIds: string[];
  center: { lat: number; lng: number };
  summary: string;
  classification: Classification;
}

export async function fetchRequests(baseUrl: string, sinceIso: string): Promise<Open311Request[]> {
  const url = new URL('/requests.json', baseUrl);
  url.searchParams.set('start_date', sinceIso);

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`CSB fetch failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as Open311Request[];
}

export function isEligible(r: Open311Request): boolean {
  const code = r.service_code ?? r.service_name ?? '';
  if (!(code in TIER0_ELIGIBLE_CODES)) return false;
  if (typeof r.lat !== 'number' || typeof r.long !== 'number') return false;

  const haystack = `${r.description ?? ''} ${r.service_name ?? ''}`.toLowerCase();
  return !EXCLUDED_KEYWORDS.some((kw) => haystack.includes(kw));
}

/**
 * Summarise a cluster for the classifier. Deliberately terse and factual —
 * the model should reason about the work, not about a resident's tone.
 */
export function summariseCluster(requests: Open311Request[]): string {
  const codes = [...new Set(requests.map((r) => r.service_code ?? r.service_name ?? 'unknown'))];
  const lines = requests
    .slice(0, 12)
    .map((r) => `- ${r.service_code ?? r.service_name}: ${(r.description ?? '').slice(0, 160)}`)
    .join('\n');

  return [
    `${requests.length} open 311 requests reported within about two blocks of each other.`,
    `Categories: ${codes.join(', ')}.`,
    '',
    'Individual reports:',
    lines,
  ].join('\n');
}

export async function buildProposals(
  requests: Open311Request[],
  client: Anthropic,
): Promise<Proposal[]> {
  const eligible = requests.filter(isEligible);

  const points: Array<Clusterable & { req: Open311Request }> = eligible.map((r) => ({
    id: r.service_request_id,
    lat: r.lat!,
    lng: r.long!,
    req: r,
  }));

  const groups = cluster(points, 250, 3);
  const proposals: Proposal[] = [];

  for (const group of groups) {
    const reqs = group.map((g) => g.req);
    const summary = summariseCluster(reqs);
    const firstCode = reqs[0]?.service_code ?? reqs[0]?.service_name ?? '';

    const classification = await classify(
      {
        description: summary,
        photos: [],
        source: 'csb_311',
        // 311 data alone never establishes authority over the ground. G7 will
        // force human review, which is the intended behaviour.
        consentOnFile: false,
      },
      { client },
    );

    if (classification.verdict === 'reject') continue;

    proposals.push({
      clusterKey: group.map((g) => g.id).sort().join(':').slice(0, 64),
      taskProfile: TIER0_ELIGIBLE_CODES[firstCode] ?? 'lot_litter',
      requestIds: group.map((g) => g.id),
      center: centroid(group),
      summary,
      classification,
    });
  }

  return proposals;
}
