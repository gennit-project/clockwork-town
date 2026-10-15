# Epic 1 — Make relationships feel alive

**Read [README.md](README.md) first** for orientation. This epic builds on the
temporal relationship data the sim already tracks (per-relationship short/long-term
scores, labels, and last-seen/last-spoke timestamps) to produce emergent, believable
behavior — the point where the town stops feeling like a spreadsheet.

## Goal

Deepen bonds over time with a milestone progression, and bring workplace routines into
the same system, recorded as memories and surfaced as logs/alerts/tickets. (Reunions,
approval/disapproval and group situations are already built; see `completed/`.)

## What this epic unlocks

- The memory/milestone substrate that the default-town stories (Epic 5) depend on
  (grief, long friendships, foster relationships).

## Prerequisites

- Epics 0 and 1.1–1.4 (done): alerts/tickets, traits/values, daily summaries, group
  situations. Milestone activities fulfill values.

## Current state to build on

- Relationships: `relationshipRuntime.ts` (events, decay, `recordSharedMeal`,
  `recordSharedViewingExperience`), `relationshipAvailability.ts`, and the `Relationship`
  schema with short/long-term scores, labels, last-seen/last-spoke.
- Memories: short/long-term model, daily summaries, group memories; `MemoryTimeline.vue`
  and `CharacterRelationshipsTab.vue` filter by `eventType`.
- Group/shared events (chats, movies, art) already record memories for every participant.

---

## Work items (in order)

> **Done:** 1.1 memory daily summary, 1.2 reunion events, 1.3 approval/disapproval,
> 1.4 group situations. See [completed/epic-1-relationships-done.md](completed/epic-1-relationships-done.md).
> The numbering below is kept so cross-references still hold.

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

**Status:** Partly exists. `relationshipRuntime.ts` already has a lunch-time window,
`recordSharedMeal` (`ate_lunch_together` memories and score changes) and
`recordSharedViewingExperience` (`watched_a_movie_together`). Not yet built: a generator for
overlapping *work breaks* specifically, and counting repeated lunches toward milestones (1.5).

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

- Milestone tier requirements (1.5).
