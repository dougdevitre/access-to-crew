# Architecture

## Build order

The order is deliberate and reflects where the value actually is.

1. **`packages/tier0`** — the standard and its gate. This is the IP.
2. **Hour ledger + export** — the sellable asset. Sponsors and grant reporting
   both read from here.
3. **Host console** — propose, confirm, publish, close out with evidence.
4. **Member PWA** — last. Supply of confirmed sessions is the constraint,
   not demand.

There is no frontend in this repo yet. That is intentional, not an omission.

## Why the platform, not the labor

One session of 10 volunteers for 90 minutes yields 15 verified volunteer-hours.
At $10/hour sponsor-paid, contribution is roughly $77 after crew-lead stipend,
kit, insurance and platform cost. Twenty sessions a week is ~$80K/year of
contribution — a healthy civic organization, not a venture-scale business, and
no amount of session growth in one city changes that.

St. Louis is the reference deployment. The sellable product is the software:
Tier-0 classifier, 311-to-session pipeline, verified-hour ledger, grant-ready
reporting. Build the ledger clean and exportable from day one.

## What is deliberately not AI

Proximity matching, scheduling, waitlists, kit sizing. These are SQL, PostGIS,
and arithmetic. Dressing them up as AI adds latency, cost, and nondeterminism
to problems that have exact answers.

AI earns its place in exactly four jobs:
1. Cluster-to-session synthesis
2. The Tier-0 gate
3. Crew-lead brief generation
4. Impact report narrative

## Stack

- Node 20 + Express + TypeScript
- Postgres 15 + PostGIS
- S3 for evidence photos (before/after)
- Clerk for auth
- Stripe for sponsor credit blocks
- Secrets from SSM SecureString; nothing hardcoded

## Retention model

Fixed weekly slot, persistent crew of 8-12, status ladder made of
responsibility rather than swag (5 sessions to crew-lead eligibility, 15 to
propose sessions). The retention object is people, not tasks.
