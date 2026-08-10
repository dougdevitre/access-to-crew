# The Tier-0 Task Standard — v1.0

The canonical machine-readable version is
[`packages/tier0/src/rubric.ts`](../packages/tier0/src/rubric.ts). The
classifier prompt is generated from it. Edit the code, then update this file.

A task is Tier-0 only if it passes **every** gate. Any failure means REJECT or
DOWNGRADE.

## Task gates

| ID | Name | Test |
|---|---|---|
| G1 | No skill | Explainable in under 60 seconds. No certification, license, or prior experience. A first-timer performs it correctly on the first attempt. |
| G2 | Hand tools only | Approved hand tools only. No powered tools of any kind, including battery. No blades longer than hand loppers. |
| G3 | Feet on ground | Both feet on the ground at all times. Nothing above standing reach. No ladders, roofs, scaffolds, or bucket work. |
| G4 | Load limit | No solo lift over 25 lb. No two-person carry over 50 lb. No mattresses, appliances, tires, or construction debris. |
| G5 | No hazards | No chemicals beyond water. No sharps, syringes, unknown liquids, drums, batteries, or suspected asbestos. Broken glass may be swept or shoveled — never hand-picked. |
| G6 | No structures | No entry into vacant, damaged, or condemned structures. No tarping, boarding, shoring, or demolition. No work near downed lines. |
| G7 | Consent | Public right-of-way, or ground the host has documented authority over. Private property requires named owner consent on file. |
| G8 | Reversible | Worst realistic outcome is "it looks unchanged." Never property damage, ecological harm, or destruction of anything a resident wanted kept. |
| G9 | Bounded | Finishable by the stated crew within 90 minutes, against a written done-state. |

## Session gates

Applied at scheduling and again at start time.

- **E1 Daylight** — start and end within daylight hours.
- **E2 Never solo** — minimum 2 people, named crew lead present.
- **E3 Weather** — auto-cancel on heat advisory, lightning within 10 miles, ice, or air quality alert.
- **E4 Meet point** — publicly accessible, on a mapped street.

## Verdicts

- **PASS** — publishes after host confirmation.
- **DOWNGRADE** — the Tier-0 slice of a non-Tier-0 request. *"Tree down across alley"* → the crew does **not** cut. They clear already-cut small limbs and sweep the pad after a licensed crew has been through. State the dependency in the done-state.
- **REJECT** — no safe Tier-0 slice exists. **Must name at least one escalation route.**

## Escalation routes

`bulk_pickup` · `dumping_report` · `forestry` · `hazmat` · `structure` · `skilled_partner`

## Approved tools

Litter grabber, push broom, leaf rake, flat shovel, snow shovel, hand loppers,
hand shears, trowel, wheelbarrow, watering can, work gloves, safety glasses,
trash bag, rubble bag, recycling cart.

Anything not on this list fails G2.

## Language

Public-facing copy says **low risk**, never *no risk*. A waiver, an incident
path, and coverage are carried regardless.
