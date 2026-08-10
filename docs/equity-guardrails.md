# Equity Guardrails

**This document is load-bearing. Read it before changing the ingest job.**

## The problem

St. Louis publishes 311 service requests, and illegal dumping is reported at
roughly four times the rate in majority-Black neighborhoods as in
majority-white ones (City of St. Louis Equity Indicators, 2016 data).

Route sessions purely by complaint density and the algorithm sends weekend
volunteers — disproportionately from elsewhere — into North City. That is not
community rebuilding. That is outsiders performing service on someone else's
block, and it is the fastest way to lose the legitimacy the project depends on.

The organizers who did this well after the May 2025 tornado said so plainly:
recovery has to include the people who were impacted, or they get displaced by
it.

## The rules

1. **The algorithm proposes; a resident host disposes.**
   No session publishes without a confirming human anchored in that
   neighborhood. `ingest-csb.ts` produces DRAFTS only. There is no code path
   from 311 data to a published session. Do not add one.

2. **Crew leads are paid.**
   $50 per session (`sessions.lead_stipend_cents`), prioritized to residents of
   the block. This converts the model from extracting free labor to circulating
   money locally. It is the cheapest credibility available and it is not a
   line item to cut.

3. **Publish the flow, both directions.**
   `hour_ledger` records `neighborhood_served` and `member_neighborhood`
   precisely so the served-vs-led ratio is reportable. If a neighborhood
   consistently receives labor but never leads it, that is a metric to fix,
   not to hide.

4. **The host org is the front door.**
   Sessions carry the host's name. The platform is infrastructure, not brand.

## Review trigger

Any PR touching `ingest-csb.ts`, session publication, or ledger reporting
requires a reviewer who has read this file.
