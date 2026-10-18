import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Block Crew has no frontend yet, so the API is the product surface. Every
 * client (the host console and member PWA to come, or anyone calling the
 * API directly) must be able to show the Access To disclaimer from one
 * source: a public endpoint with the full text, a Link header on every
 * response, and the short notice on the AI classifier's output.
 */

const DISCLAIMER_URL = 'https://github.com/dougdevitre/access-to-crew/blob/main/DISCLAIMER.md';

vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn(async () => ({ sub: 'member_test', metadata: { roles: [] } })),
}));

vi.mock('@blockcrew/tier0', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@blockcrew/tier0')>();
  return {
    ...actual,
    classify: vi.fn(async () => ({
      rubricVersion: actual.RUBRIC_VERSION,
      verdict: 'pass',
      gates: [{ gate: 'G1_SKILL', result: 'pass', reason: 'Litter pickup needs no training.' }],
      downgradedTask: null,
      crewMin: 6,
      crewMax: 12,
      durationMinutes: 90,
      kit: [{ item: 'litter grabber', qty: 6 }],
      doneState: 'Alley swept, bags staged at the north end.',
      escalation: [],
      confidence: 0.9,
      needsHumanReview: false,
    })),
  };
});

let server: Server;
let base: string;

beforeAll(async () => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_x');
  vi.stubEnv('DATABASE_URL', '');
  const { app } = await import('../src/app.js');
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('disclaimer', () => {
  it('serves the full disclaimer publicly, with 911 and 988 as tel: links', async () => {
    const res = await fetch(`${base}/v1/disclaimer`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      title: string;
      notice: string;
      fullText: string[];
      url: string;
      emergency: { number: string; href: string }[];
    };
    expect(body.title).toBe('Block Crew');
    expect(body.notice).toMatch(/^Educational information only\. Block Crew is not legal/);
    expect(body.notice).toContain('Call 911');
    expect(body.notice).toContain('call or text 988');
    expect(body.url).toBe(DISCLAIMER_URL);
    expect(body.fullText).toHaveLength(8);
    expect(body.fullText.join(' ')).toContain('AI output can be incorrect.');
    expect(body.fullText.join(' ')).toContain('No warranty.');
    expect(body.emergency.map((e) => e.href)).toEqual(['tel:911', 'tel:988']);
  });

  it('links the disclaimer from every response, including health checks and 404s', async () => {
    for (const path of ['/healthz', '/no-such-route']) {
      const res = await fetch(`${base}${path}`);
      expect(res.headers.get('link'), path).toContain(`<${DISCLAIMER_URL}>; rel="terms-of-service"`);
    }
  });

  it('attaches the short notice to every classifier result', async () => {
    const res = await fetch(`${base}/v1/classify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({
        description: 'Loose litter along the alley.',
        source: 'host',
        consentOnFile: true,
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { disclaimer?: { notice: string; url: string } };
    expect(body.disclaimer?.notice).toContain('Call 911');
    expect(body.disclaimer?.notice).toContain('call or text 988');
    expect(body.disclaimer?.url).toBe(DISCLAIMER_URL);
  });
});
