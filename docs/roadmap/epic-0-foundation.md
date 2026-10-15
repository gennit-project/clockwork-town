# Epic 0 — Make the reskin real + data foundation

**Read [README.md](README.md) first** for project orientation, stack, and how the
simulation is structured.

## Goal

Turn the Grafana service-desk reskin from "pretty shell with stub pages" into
something that reacts to the simulation, and make **Traits** and **Values** —
which currently exist in the schema but do nothing — into live inputs to the sim.
Almost everything later in the roadmap (fulfillment redesign, approval/disapproval,
relationship milestones, the default-town cast, difficulty) depends on this epic.

## What this epic unlocks

- A functioning Alerts/Tickets surface that every later system (grief, disapproval,
  death warnings, value-neglect) can file signals into instead of inventing its own UI.
- Traits and Values that actually change behavior — the prerequisite for defining
  characters by who they are, not just their need bars.
- A believable need hierarchy.

## Prerequisites

None. This is the starting epic.

---

## Work items (in order)

### 0.1 — Alerts + Tickets wired to real data `[S–M]`

**Status:** Implemented and verified in a live session against the seeded Desert Willow town. `/alerts` is `AlertsView.vue`
and `/tickets` is `TicketsView.vue`, both fed by `frontend/src/stores/serviceDesk.ts`, which
re-evaluates every sim tick. Rules are pure evaluators in `stores/utils/alertEvaluators.ts`
and `ticketEvaluators.ts`; thresholds are in `frontend/src/config/serviceDesk.ts`; ticket
lifecycle (dedup, auto-resolve, transitions) is in `ticketLifecycle.ts`. Tickets are
in-memory only and reset with the sim. Only one ticket generator exists (sustained critical
need); later epics add evaluators to `TICKET_EVALUATORS`.

**What to build.** Replace the two stubs with real pages computed from existing sim
state (no new backend needed — the data already lives in the Pinia store).

- **Alerts** = threshold conditions on current state. Start with:
  - a need below a critical threshold (e.g. any need < 0.2),
  - "hasn't left home lot in N days" (derive from location history / time-at-lot),
  - "friend count below target" (count of relationships above a score threshold),
  - "purpose/fulfillment trending downward" (slope over the happiness-history ring buffer).
- **Tickets** = discrete resident incidents with a lifecycle (open → ack → resolved).
  Seed it now with unmet-want tickets derived from sustained low needs; later epics
  file richer tickets (grief, disapproval, complaints). Build the ticket list +
  filtering UI now even though only a couple of generators exist.

**Where the data is.** `frontend/src/stores/simulation.ts` (`characterStates`,
`happinessHistory`), `utils/happinessMetrics.ts`. Severity coloring should reuse the
Grafana tokens in `frontend/src/style.css`.

**Design note.** Keep alert/ticket *generation* in small pure evaluator functions
(one per rule) under `frontend/src/stores/utils/` so later systems add evaluators
rather than touching the views. This mirrors the relationship-event evaluator pattern
that Epic 1 will lean on.

**Done when.** `/alerts` and `/tickets` show live, severity-sorted entries that
change as the sim runs; each entry links to the relevant resident; rules are
individual evaluator functions with unit tests.

---

### 0.2 — Traits as live modifiers `[M]`

**Status:** Implemented and verified live (behavioral subset only). Note: the original
status claim that traits were "wired" was wrong; only create-time `traitIds` existed. Shipped now:
trait catalog in `src/traits.ts` (ensured at server startup and in the seed; ids like
`trait-asexual`), `traits` query, `Character.traits` resolver, `traitIds` on `updateCharacter`,
frontend `traitIds` on `CharacterState`, declarative `config/traitEffects.ts` + pure
`utils/traitEffects.ts`, per-character decay in `tickExecution.ts`, planner/invitation gating,
greyed "off" need bars with a "disabled because of trait" tooltip, and a trait picker in
`CharacterEditor.vue`. Behavioral traits: needs little/lots of sleep (×0.5 / ×1.5 sleep decay),
big/small appetite (×1.5 / ×0.6 food decay), asexual and aromantic (both switch off the romance
need: pinned full, excluded from happiness, romance-need actions dropped for the resident and as
a target). The seed assigns a few to demo residents.

**Known gaps / follow-ups:** the canonical trait list from Epic 5 is not loaded; asexual and
aromantic are identical until a physical-intimacy mechanic exists; `invite_over` is a
romance-need action, so these residents won't host `invite_over` hang-outs (chat_friend is
unaffected); `NeedSummaryStrip` group averages still include a pinned romance need; trait chips
have no effect tooltips; traits are not editable on template characters; `useTownDataLoader.ts`
and `RegionOverview.vue` duplicate character-loading logic and must be kept in sync.

**What to build.**
1. Load each character's traits into their `CharacterState` (the sim store) at
   initialization (alongside the existing `traits: string[]`, but as structured
   trait data carrying modifiers).
2. Apply trait modifiers in the sim:
   - **Decay-rate / capacity modifiers:** "needs little sleep" / "needs a lot of
     sleep", "big appetite" / "small appetite" → scale the relevant entry in
     `NEED_DECAY_RATES` (`frontend/src/stores/config/needs.ts`) per-character.
   - **Disabling traits:** "asexual" → romance need disabled (no decay, no romance
     actions offered); the UI shows the romance bar greyed with a tooltip
     "disabled because of trait: asexual". "Aromantic" similar for romantic actions.
   - Keep a small, data-driven `TRAIT_EFFECTS` map (new file under `config/`) so
     traits are declarative, not hardcoded in the planner.
3. Surface traits read-only on the character dashboard, and editable in the editor
   (see 0.2-UI below).

**Where it plugs in.** Per-character need decay happens in
`utils/tickExecution.ts` (Phase 1 of the tick) using `NEED_DECAY_RATES`; today it's
global. Introduce a per-character effective decay derived from base rates + trait
modifiers. Action availability is decided in `utils/intentPlanner.ts` /
`utils/decisionMaking.ts`; a disabled need should suppress its actions there.

**0.2-UI — trait editing.** Extend `frontend/src/views/CharacterEditor.vue` (which
today only edits name/age/bio/schedule) with a trait picker backed by the existing
`traitIds` mutation path. The full canonical trait list lives in
[epic-5-content-shipping.md](epic-5-content-shipping.md) ("Traits & values content");
for this item, support the behavioral subset above plus free display-only traits.

**Done when.** A character with "needs little sleep" visibly sleeps less often than
a baseline character; an asexual character never pursues romance and shows the
greyed bar + tooltip; traits are editable and persist.

---

### 0.3 — Values system `[M–L]` — highest-leverage item in the epic

**Status:** Implemented and verified live (initial value set only). Same story as traits: only
create-time `valueIds` existed, with no catalog, resolver, query or rank. Shipped now: value catalog in
`src/values.ts` (ensured at startup and in the seed), `Character.valueOrder` (ranked ids, migrated
and backfilled) with `HAS_VALUE` edges mirroring membership, `values` query, rank-ordered
`Character.values`, `valueIds` on `updateCharacter`, per-character `values` state
(`ticksSinceFulfilled`) merged on reload, declarative `config/valueDefs.ts` (`VALUE_DEFS`,
`VALUE_TUNING`) with pure `utils/valueEffects.ts`, a drain on fulfillment from neglected values
(rank-weighted; folded into fulfillment, no new need axis), fulfillment reset in `applyActionEffects`,
a planner utility nudge for actions that serve a neglected value (scaled down while basic or
emotional needs are unsatisfied), a "value neglected" alert and a ticket when a value is neglected for
its whole window, a Values panel on the dashboard (`ValuesPanel.vue`), and a ranked list in
`CharacterEditor.vue` (up/down buttons). Initial values: take care of animals, read books, write
books, be a good friend, have a happy family, have a good romantic relationship (switched off by
asexual/aromantic), do a good job at work. The seed gives every resident two to three.

**Related fix:** residents whose best intent was an invitation that got rejected used to idle (and repeat the same invitation every tick). `tickExecution.ts` now backs off from that target for 6 ticks (`utils/inviteBackoff.ts`, per action + target) and falls through to the next-best intent in the same tick, up to 3 attempts; the planner skips backed-off invitations.

**Decisions:** the fulfillment need stays in the needs gauge (it still drives happiness, gating and
the planner); the Values panel sits beside it instead of replacing it.

**Known gaps / follow-ups:** the rest of the canonical value list needs new activities (create art,
play games, nature, religion, learn about science, ...); value windows and the drain/nudge sizes are
first guesses, tune after watching a full simulated day; `lastFulfilled` is in-memory only and
restarts fresh on reload; the nudge cannot pull a resident across town (travel cost ~2 outweighs
it), so a value whose activity is far away goes neglected and files a ticket, which is intended (pets now live at their owner's home, so "take care of animals" is reachable for owners);
the "no values yet" prompt is untested visually;
trait chips and value rows have no effect tooltips beyond the disabled-trait one.

**What to build.** Values are a character's *ranked* sources of meaning, each mapped
to fulfilling activities, each tracking "time since last fulfilled." Neglected values
drag down mood. This replaces the single generic "fulfillment" bar with a richer,
per-character model — the core of the "service desk for the soul" theme.

1. **Data:** give each character an ordered list of values; each value maps to one or
   more in-sim activities that fulfill it (e.g. value "take care of animals" →
   `pet_animal`; "read books" → `read`; "be a good friend" → `chat_friend`/group
   activities). Track `lastFulfilledTick` per value.
2. **Mechanics:** when a character performs an activity, mark the matching value(s)
   fulfilled (reset the clock). A value unfulfilled for too long generates a
   downward pull on mood/fulfillment and an Alert/Ticket ("value neglected:
   <value>"). This is where 0.1's evaluator surface pays off.
3. **Fulfillment redesign (your "instead of one bar" idea):** on the character
   dashboard, replace the single fulfillment bar with **one bar per value** showing
   time-since-last-fulfilled. If a character has no values defined, show a prompt to
   edit them rather than a blank bar.
4. **Editing:** values tab in `CharacterEditor.vue` — ranked, reorderable list;
   show, per value, which activities can fulfill it.

**Interactions with traits (0.2).** Some values should be trait-gated (e.g. "have
sex" is absent/decays differently for an asexual character). Reuse the disable/tooltip
pattern from 0.2.

**Note on need decay spawning.** A roadmap idea: intellectual activities (e.g.
reading) "spawn a higher need that decays" — model this as a value with its own
time-since-fulfilled clock rather than a brand-new need axis, to keep the need set stable.

**Done when.** A character has a ranked values list editable in the UI; performing a
mapped activity resets that value's clock; a long-neglected value lowers mood and
raises an alert; the dashboard shows per-value fulfillment bars (or the edit prompt).

---

### 0.4 — Need gating `[S]`

**Status:** Implemented. Tiers and thresholds live in `frontend/src/stores/config/needGating.ts`;
pure helpers in `utils/needGating.ts`. Gating is applied in one place, `calculateUtility`
(`utils/actionUtility.ts`), which every planner candidate routes through: need-driven utility
for a locked tier is multiplied by 0.1 (a penalty, not a hard block, so a resident with nothing
else to do can still act). Shipped alongside a **decay rebalance** (`NEED_DECAY_RATES` cut ~5-10x
to match 5-minute ticks; `work`'s per-tick sleep cost cut from -0.15 to -0.002) and a fix for a
loader bug (`useTownDataLoader.ts` dropped `Shift.activity`, so every nightly sleep block ran as a
work shift). Verified live for the first ~20 ticks including the 22:00 sleep block; a full simulated
day has not been observed, so expect to tune rates.

**What to build.** Maslow-style gating in the planner: a character cannot meaningfully
pursue emotional needs (friends/family/romance) unless basic needs
(food/sleep/bladder/hygiene/health) are at least ~⅓ satisfied, and cannot pursue
higher needs (fulfillment/values) unless emotional needs are at least ~⅓ satisfied.

**Where it plugs in.** Candidate filtering / utility weighting in
`utils/intentPlanner.ts` and `utils/decisionMaking.ts`. Simplest implementation:
when a tier's average is below threshold, zero out or heavily penalize candidates
that target a higher tier. Keep thresholds in `config/`.

**Done when.** A starving character prioritizes eating over socializing even when a
social option scores well; thresholds are config-driven and unit-tested.

---

## Out of scope for this epic

- No new backend tables are required (traits/values/employment schema already exist).
- No images.
- No NPC generation, finances, or grief — those file *into* the alerts/tickets
  surface built here, but are later epics.

## Open decisions

- Exact thresholds for alerts and need-gating (start with the values above; tune later).
- Whether "value neglect" lowers `fulfillment` directly or is a separate mood term.
  Recommended: fold into fulfillment to avoid adding a need axis.
