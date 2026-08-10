# Block Crew

A St. Louis civic volunteering backend. Resident 311 complaints become
candidate cleanup sessions, and an AI **Tier-0 classifier** gates whether a
task is safe for untrained volunteers (nine gates, G1–G9 — see
[docs/tier0-standard.md](docs/tier0-standard.md)).

## Layout

| Path | What it is |
|---|---|
| `packages/tier0` | The Tier-0 task standard and classifier — the core IP |
| `apps/api` | Express API (`GET /healthz`, `POST /v1/classify`) |
| `apps/api/migrations` | Raw SQL schema (Postgres 15+, PostGIS, pgcrypto) |
| `api/` + `vercel.json` | Vercel serverless entry wrapping the Express app |
| `docs/` | Architecture, standard, equity and liability posture |

## Getting started

Requires Node 22 and npm.

```sh
npm install        # also builds packages/tier0 via its prepare script
npm run typecheck
npm test           # 13 tier0 tests
npm run dev -w @blockcrew/api   # http://localhost:8080
```

## Configuration

Copy `.env.example` and fill in what you have. **The API boots with zero
secrets**: `/healthz` always answers and reports per-dependency status;
endpoints missing a dependency return `503` (fail closed) rather than
pretending. The required variables per feature:

| Variable | Unlocks |
|---|---|
| `ANTHROPIC_API_KEY` | `POST /v1/classify` (the classifier model call) |
| `CLERK_SECRET_KEY` | Authenticated endpoints (without it: 503, never open) |
| `DATABASE_URL` | Classification audit persistence (pooled + `sslmode=require` for serverless; needs PostGIS — Neon or Supabase work) |
| `CSB_OPEN311_URL` | The 311 ingest job |
| `CORS_ORIGIN` | Set to the real frontend origin in production |

## Database

Migrations are plain SQL in `apps/api/migrations`, applied in filename order
by a tiny transactional runner:

```sh
DATABASE_URL=postgres://... npm run migrate -w @blockcrew/api
```

Run migrations from a trusted machine — the Vercel deployment never runs
them itself.

## Deployment (Vercel)

The repo root is the Vercel project root. `vercel.json` routes every path to
`api/index.ts`, which exports the Express app; `npm install` builds tier0
and `npm run build` compiles both workspaces. After deploying, add the
environment variables above in the Vercel dashboard and redeploy to unlock
the full API.

Platform notes:
- Request bodies are capped at 4 MB (Vercel's limit); larger photo payloads
  await the S3 presigned-upload path.
- The rate limiter is per-instance in-memory — best-effort on serverless.
  A shared store (e.g. Upstash) is future work.

## Auth

`Authorization: Bearer <Clerk session token>` verified with
`@clerk/backend`. Role checks read a `metadata.roles` array claim — add it
to the Clerk JWT template if you use `requireRole`. Set `CLERK_JWT_KEY`
(PEM public key) for fully networkless verification.

## What is deliberately not built yet

S3 evidence uploads, Stripe sponsor credits, session/signup/attendance
routes, weather session gates (E1–E4) enforcement, and the ingest
scheduler are documented designs (`docs/architecture.md`) awaiting
implementation.
