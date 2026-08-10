import pg from 'pg';
import type { Classification, TaskProposal } from '@blockcrew/tier0';
import type { AppConfig } from './env.js';

/**
 * Lazy singleton pool. Null when DATABASE_URL is unset — callers treat the
 * database as an optional dependency and degrade honestly. Sized small for
 * serverless: point DATABASE_URL at a pooled endpoint (pgbouncer / Neon
 * pooler) with sslmode=require.
 */
let pool: pg.Pool | null | undefined;

export function getPool(config: AppConfig): pg.Pool | null {
  if (pool !== undefined) return pool;
  pool = config.databaseUrl
    ? new pg.Pool({
        connectionString: config.databaseUrl,
        max: 3,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
      })
    : null;
  return pool;
}

/**
 * Audit-trail write for a classification (see docs/liability-posture.md).
 * Best-effort while the database is an optional dependency: the caller
 * reports `persisted` honestly instead of failing the request.
 */
export async function insertClassification(
  db: pg.Pool,
  args: { model: string; proposal: TaskProposal; classification: Classification },
): Promise<void> {
  await db.query(
    `INSERT INTO classifications (rubric_version, model, proposal, result, verdict, confidence)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      args.classification.rubricVersion,
      args.model,
      JSON.stringify(args.proposal),
      JSON.stringify(args.classification),
      args.classification.verdict,
      args.classification.confidence,
    ],
  );
}
