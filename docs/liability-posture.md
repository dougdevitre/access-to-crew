# Liability Posture

**Educational framing only. Not legal advice. Get an opinion from counsel and
a broker before the first public session.**

## Chosen model: marketplace, not organizer

| | Organizer model | Marketplace model (chosen) |
|---|---|---|
| Volunteer's org of record | Platform | Host org |
| Carries coverage | Platform | Host, verified at onboarding |
| UX quality | Better | Slightly worse |
| Platform exposure | High | Materially lower |

The platform is booking and verification software. The host org owns the
volunteer relationship and carries its own coverage.

## Enforced in code

- `hosts.coverage_verified` and `hosts.coverage_expires_on` — a host cannot
  publish with unverified or expired coverage.
- `members.waiver_signed_at` — waiver at signup, re-affirmed at check-in.
- `incidents` table — the reporting path exists from week one, not after the
  first sprained ankle.
- `sites.ownership` with a CHECK constraint requiring `consent_doc` for
  private property.

## Open questions for counsel

- Scope and exceptions of federal volunteer protection provisions, and any
  Missouri counterpart, as applied to a *platform* rather than an organizing
  nonprofit. Do not assume any of it shields the platform.
- Whether paid crew leads create an employment or worker's-comp question that
  unpaid volunteers do not.
- Minors: current assumption is 16+ with adult present, 18+ unaccompanied.
  Unconfirmed.
- Whether Tier-0 rubric adherence is usefully evidenced in a claim, and if so
  what retention period the classification audit trail needs.
