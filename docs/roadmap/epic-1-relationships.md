# Epic 1 — Make relationships feel alive

**Read [README.md](README.md) first** for orientation. This epic builds on the
temporal relationship data the sim already tracks (per-relationship short/long-term
scores, labels, and last-seen/last-spoke timestamps) to produce emergent, believable
behavior — the point where the town stops feeling like a spreadsheet.

## Goal

Drive multiple behaviors from the same temporal relationship data: reunion events,
approval/disapproval reactions, group activities, and a milestone progression that
deepens bonds over time — with everything recorded as memories and surfaced as
logs/alerts/tickets.

## What this epic unlocks

- The "feels alive" quality the whole project is aiming for.
- The memory/milestone substrate that the default-town stories (Epic 5) depend on
  (grief, long friendships, foster relationships).

## Prerequisites

- **Epic 0.1** (alerts/tickets evaluator surface) — reunion/approval events file here.
- **Epic 0.2/0.3** (traits/values) — approval/disapproval keys off traits; group and
  milestone activities fulfill values.

## Current state to build on

- Relationships: `frontend/src/stores/utils/relationshipRuntime.ts` (events, decay),
  `relationshipAvailability.ts` (availability incl. `isDeceasedTarget`), and the
  `Relationship` schema with short/long-term scores, labels, last-seen/last-spoke.
- Memories: short/long-term memory model exists; `MemoryTimeline.vue` and
  `CharacterRelationshipsTab.vue` already filter by `eventType`.
- Social coordination: pairwise `chat_friend`/`date` with reservation already exists
  (the multi-participant coordination machinery to extend for groups). Animal
  reunion is partly imaginable via the existing `pet_animal` interaction.

---

## Work items (in order)

### 1.1 — Memory daily summary `[M]`

**Status:** Not started. Characters have `shortTermMemories` and `longTermMemories`;
no rollup mechanism.

**What to build.** Every 24 in-sim hours, convert the day's short-term memories into a
summarized long-term memory ("daily summary"), pruning short-term. This keeps memory
bounded and creates the long-term record milestones and relationship history read from.

**Where it plugs in.** The sim advances time in `utils/tickExecution.ts` /
`utils/simulationCalendar.ts`; hook the day boundary. Memory helpers live in
`utils/characterState.ts` (short-term) and the long-term memory path in the store.

**Done when.** After a simulated day, short-term memories are summarized into a dated
long-term entry visible in the memory timeline; short-term list resets.

---

### 1.2 — Reunion & ambient relationship events (R8) `[M]` — high delight

**Status:** Not started.

**What to build.** Generate events from relationship-event *evaluators* (not
hardcoded strings):
- **Hug on reunion** when two characters with a good relationship meet after a long
  absence (use last-seen + relationship score).
- **Cat meow reunion** for a pet reuniting with its person, using the same last-seen
  logic via the animal runtime.
- Events post to the **log stream** and, where notable, raise a friendly **alert**
  ("X and Y reunited"). Notifications must come from generic evaluators so the same
  temporal data powers many behaviors — explicitly *not* a cat-only special case.

**Where it plugs in.** `utils/relationshipRuntime.ts` for human↔human;
`utils/animalRuntime.ts` for pet reunions; reuse the alert/log evaluator pattern
from Epic 0.1. Record the event in both parties' memories.

**Done when.** Two long-separated friends hug on meeting and both gain a memory + a
log entry; a returning owner is greeted by their cat; no behavior is hardcoded to a
specific species or character.

---

### 1.3 — Approval / disapproval & reactions `[M]`

**Status:** Not started.

**What to build.** Characters react to what they witness, based on traits/values:
- A character who disapproves of a behavior (e.g. haze use — a fictional recreational
  herb) loses approval toward someone they see doing it → files a **ticket**
  ("disapproves of <X>").
- Sadness/anger rolls up a desire: complain to someone they have a good relationship
  with, and/or a comfort action (e.g. eat ice cream). Surface as a ticket/desire.
- A "good person" gains happiness seeing others happy; a "bitter person" gains
  happiness seeing others unhappy.

**Where it plugs in.** Co-presence is already known each tick (same lot/space checks
exist in the runtime). Add reaction evaluators keyed off witnessing + traits (0.2) +
the disapproval data (what a character approves/disapproves of — needs a small data
field on the character, editable later in Epic 2). Reactions adjust relationship
scores and mood and file tickets via Epic 0.1's surface.

**Done when.** A character who witnesses a disapproved act loses approval and files a
ticket; a sad character rolls up a complain-to-friend desire; good/bitter reactions
to others' moods are observable.

---

### 1.4 — Group situations `[M]`

**Status:** Not started. Only pairwise `chat_friend`/`date` exist today.

**What to build.**
- `chat_friend` can involve **1–3** other participating people (not just one).
- `date` requires **exactly one** other person.
- Characters autonomously socialize with someone in the **same household** when the
  social need calls for it.
- When bored, a character prefers a **group** fun activity first, falling back to
  solo only if a group isn't possible.
- Group activities add a memory to each participant's autobiographical memory and to
  the relevant relationships.

**Where it plugs in.** Extend the existing pairwise coordination/reservation in
`utils/tickExecution.ts` + `utils/intentPlanner.ts` to N participants. Reuse the
reservation idea (already used for chat/date and for animal petting) so a group of
specific people is locked in for the tick.

**Done when.** A 3-person chat forms and all three gain shared memories; characters
default to group fun before solo; household-mates autonomously hang out.

---

### 1.5 — Relationship milestone progression `[L]`

**Status:** Not started.

**What to build.** A tiered milestone system that deepens relationships through varied
shared experiences — deliberately requiring a *mix* of activities from one tier before
the next tier unlocks (to avoid Sims-style repetitive grinding). Each achieved
milestone is recorded in **both** characters' memories. The full milestone catalog
(tiers 1–4: shared meals, trips, surviving hardship together, becoming roommates,
etc.) is captured in [epic-5-content-shipping.md](epic-5-content-shipping.md) under
"Relationship milestone catalog."

**Where it plugs in.** Reads the long-term memory record (1.1) and group/shared
events (1.2–1.4). Milestones gate on accumulated distinct experiences, not raw
repetition. Surface milestones in the relationship detail view.

**Note / cut.** The tier-4 "best friends photo shoot" reward is image-based and is
**cut** (text-only). Replace with a text milestone if a tier-4 capstone is wanted.

**Done when.** Two characters who share a varied mix of tier-1 experiences unlock a
tier-2 milestone, recorded in both memories and shown in the relationship view;
pure repetition does not advance tiers.

---

### 1.6 — Workplace & routine bonding (R9) `[M]`

**Status:** Not started. Work shifts exist; co-presence at work is derivable.

**What to build.** Shared lunch at work (co-workers on overlapping shifts) generates
memories and relationship change. **Co-presence alone is not enough** — a shared
*event* (the lunch) must be generated. Repeated lunches contribute toward milestones
(1.5) rather than directly forcing "best friend."

**Where it plugs in.** Work scheduling already drives characters to workplaces
(employment/shifts). Add a shared-event generator for overlapping breaks, feeding the
memory + milestone systems.

**Done when.** Two coworkers who repeatedly share lunch accumulate shared memories
that count toward a friendship milestone; merely working the same shift without the
shared event does not.

---

## Out of scope for this epic

- Death/grief (Epic 4) — though it reuses this epic's memory/relationship model.
- Family-tree relationship-type filters and relationship/memory *editing* UI (Epic 2).
- Any image-based milestone reward (cut).

## Open decisions

- Exact thresholds for "long absence" (1.2) and milestone tier requirements (1.5).
- Where disapproval data is authored — recommend adding it to the character editor in
  Epic 2.1, with a sensible default (no disapprovals) until then.
