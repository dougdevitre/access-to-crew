import { z } from 'zod';

/**
 * Secrets come from the environment, which in deployment is populated from
 * SSM SecureString. Nothing is hardcoded and nothing has a default that
 * would let the service boot misconfigured.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(8080),
  DATABASE_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  EVIDENCE_BUCKET: z.string().min(1),
  AWS_REGION: z.string().default('us-east-2'),
  CSB_OPEN311_URL: z.string().url(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail loudly at boot rather than at first request.
    throw new Error(`Invalid environment:\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return parsed.data;
}
