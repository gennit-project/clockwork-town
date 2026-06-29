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

**Status:** Not started. Routes `/alerts` and `/tickets` currently render
`frontend/src/views/ServiceDeskStub.vue`.

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

**Status:** Not started. Backend `Trait` type exists with `basicNeedModifiers` and
`emotionalNeedModifiers` (arrays of `Need`); `Character.traits` and `traitIds` are
wired in `src/resolvers/character.ts`. **No frontend behavior or editor.**

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

**Status:** Not started. Backend `Value` type (id, name, description),
`Character.values`, and `valueIds` exist (`src/resolvers/character.ts`). **No UI, no
sim behavior.**

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

**Status:** Not started.

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
