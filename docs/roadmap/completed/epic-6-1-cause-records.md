# Epic 6.1 — Cause records and the "why" view (COMPLETED)

> Completed work, kept for reference. The rest of the epic is in
> [../epic-6-friction-and-drama.md](../epic-6-friction-and-drama.md).

### 6.1 — Cause records and the "why" view `[M]` — do this first

**Status:** Built (first adopters). `utils/causes.ts` holds the pure builders and the
plain-language formatter; `WhyCause.vue` shows a one-line reason inline with the factors on
click, in Activity Log rows, Tickets, Recent events and the grievance list. Causes are built
at decision time from the real numbers, never reconstructed.
- **Adopted:** declined invitations (typed: prefers_other with the need and both utilities,
  trait_disabled, unreachable, unavailable, cannot_coordinate), idle (no candidates, or idle
  after being turned down, listing who and why), and disapproval (grievance, ticket and feed
  entry carry the witnessed act, stance and tick). Existing `details` strings are unchanged.
- **Deferred:** memories do not persist causes yet (needs a DB schema change; do it with 6.3);
  the `antisocial` invariant lands with the first antisocial act (6.3). The invitation/idle
  invariant is covered by a need-grid sweep in `causes.test.ts`. Activity log cap raised
  100 -> 300 so a cause stays visible long enough to read.

**What to build.** The audit trail, before any antisocial behavior exists, so nothing is
ever built without it.
- A `Cause` type: `{ kind, summary, factors: [{ label, value, threshold? }] }`, e.g.
  trait *Loses temper easily*, irritation 0.84 vs threshold 0.70, hungry (food 12%).
- Carry it on intents and activity-log entries (`reason`), on tickets, and into memories.
- A **"Why did this happen?"** view reachable from a log line or ticket, listing the
  factors in plain language.
- Start by using it for what is already opaque: typed reasons for declined invitations
  ("declined: wanted to sleep (sleep 4%)", not just "preferred sleep"), and for
  residents who idle.
- An invariant test: every action flagged `antisocial` must carry a non-empty cause.

**Done when.** Declined invitations and idles show a readable "why"; a test fails if an
antisocial act is created without a cause.
