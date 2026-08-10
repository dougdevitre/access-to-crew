import { z } from 'zod';

/**
 * Configuration philosophy for a serverless deployment: the process must
 * always boot, because env vars are provisioned in the hosting dashboard
 * after the first deploy. Base settings have safe defaults; every feature
 * dependency is optional here and enforced fail-closed at the endpoint
 * (a missing dependency is a 503, never a pass-through and never a crash).
 */
const BaseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(8080),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AWS_REGION: z.string().default('us-east-2'),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  corsOrigin: string;
  awsRegion: string;
  anthropicApiKey?: string;
  databaseUrl?: string;
  clerkSecretKey?: string;
  clerkJwtKey?: string;
  csbOpen311Url?: string;
  evidenceBucket?: string;
  /** Names of unset feature dependencies, for /healthz and the boot log. */
  missing: string[];
}

function optional(name: string, missing: string[], validate?: (v: string) => boolean): string | undefined {
  const value = process.env[name];
  if (value === undefined || value === '') {
    missing.push(name);
    return undefined;
  }
  if (validate && !validate(value)) {
    console.warn(`config: ${name} is set but invalid; treating as missing`);
    missing.push(name);
    return undefined;
  }
  return value;
}

function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function loadConfig(): AppConfig {
  const base = BaseSchema.parse(process.env);
  const missing: string[] = [];

  const config: AppConfig = {
    nodeEnv: base.NODE_ENV,
    port: base.PORT,
    corsOrigin: base.CORS_ORIGIN,
    awsRegion: base.AWS_REGION,
    anthropicApiKey: optional('ANTHROPIC_API_KEY', missing),
    databaseUrl: optional('DATABASE_URL', missing, isUrl),
    clerkSecretKey: optional('CLERK_SECRET_KEY', missing),
    clerkJwtKey: process.env.CLERK_JWT_KEY || undefined,
    csbOpen311Url: optional('CSB_OPEN311_URL', missing, isUrl),
    evidenceBucket: optional('EVIDENCE_BUCKET', missing),
    missing,
  };

  if (missing.length > 0) {
    console.warn(
      `config: not configured: ${missing.join(', ')} — dependent endpoints will return 503`,
    );
  }

  return config;
}
