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

**Status:** Implemented and verified live. Design differs from the original idea: short-term
memory (`state.memories`) is only a 20-action ring (about 100 minutes), nowhere near a day, so
residents keep a lightweight per-day tally instead (`utils/dailySummary.ts`: actions, places,
people). When the sim date changes (midnight), each resident with something remarkable gets one
long-term `daily_summary` memory (templated, deterministic text, dated to the day that ended;
persisted via the structured-memory call), then their tally and short-term memories reset.
Idle time, toilet visits and other unremarkable actions are left out. The memory timeline shows a
"Daily Summary" filter chip. Known gaps: the tally is in memory only (a reload loses the current
day's partial tally); summaries are one-to-two short sentences, not a diary; the tick that crosses
midnight counts toward the day that just ended.

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

**Status:** Implemented and verified live (human reunions and pet reunions). Reunion memories for
people already existed in `relationshipRuntime.ts`; reunions are now the first of a generic list of
relationship-event evaluators (`utils/relationshipEvents.ts`). A reunion after 6+ hours is a **hug**
when the pair's average long-term score is at least 0.5, otherwise a quiet "saw them again" memory
with no notification. **Pet reunions** (`utils/petReunions.ts`, `PET_EVENT_EVALUATORS`): each pet has
an owner (`OWNS_ANIMAL`), a home (its owner's household lot) and a last-together time; when owner and
pet are on the same lot again after 6+ hours, the owner gets a `pet_reunion` memory and the pet,
unless it has an `aloof` trait (`PET_QUIET_TRAITS`) or low affection, greets them (log entry, feed
entry, affection boost, `play` animation). Species-agnostic: only the animal's state, never its
name or kind, matters. Notable events go to the activity log and a capped recent-events feed
(`events` in the simulation store) shown in a "Recent events" panel on the Alerts page (alerts are
derived conditions, so one-off events need their own feed). Pets are now **homebodies**
(`PET_HOMEBODY` in `config/animalConfig.ts`): they stay home, rarely wander, and drift back; before,
they teleported to a random lot most ticks, which made absences meaningless and made owners'
pet-petting unreachable (an owner's "take care of animals" value now has a pet at home to pet).
Known gaps: only the owner is greeted (housemates could be too); the greeting warmth rule is a first
guess (the affection need self-corrects, since a low need triggers play, so traits do most of the
work); because the threshold is 6 hours, housemates hug and pets greet every evening after a 9-to-5
shift, so raise the threshold for notable events if the feed gets noisy.

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

**Status:** Implemented and verified live. What a resident approves or disapproves of is stored per
character as `stances` (`{topicId, stance}`; anything not listed is neutral; backend `src/stances.ts`,
a `Character.stances` column with migration, GraphQL `stances` field and `updateCharacter` /
`createCharacter` inputs, included in world backup/restore and in `npm run check:backup`). Topics
live in `config/approvalTopics.ts`: public romance (a date), daytime napping (sleeping in waking
hours outside the scheduled sleep block), watching movies, reading, volunteering, caring for
animals. They match behaviors that already exist; the roadmap's example, haze, becomes one more
entry once the action exists. After each tick (`recordWitnessReactions` in `simulationRuntime.ts`,
pure detection in `utils/witnessReactions.ts`) every awake resident on the same lot as someone doing
a topic act, with a stance on it, reacts, with a 2-hour cooldown per person and topic. Disapproval
lowers the witness's feelings toward the actor (-0.15 short-term, -0.03 long-term), leaves a
`disapproval` memory, adds a **grievance** (fades after 3 sim days, refreshed and counted if it
happens again, at most 6 held) and puts a notable event in the Recent events feed; approval warms the
relationship slightly and leaves a quiet `approval` memory. Each grievance becomes a ticket ("Elena
disapproves of Manny napping in the daytime") that resolves itself when the grievance fades. The
dashboard shows "On their mind" and the resident's opinions. **Upset and venting**
(`utils/venting.ts`, tuning in `VENTING` in `config/social.ts`): a resident with a grievance they
haven't talked over is drawn to chat with a friend they can complain to (long-term score 0.4 or more,
not the person they're upset with; weaker if their basics aren't met) and to comfort-eat. Chatting
with such a friend marks the grievance talked over (it fades twice as fast, never vanishes), and
leaves a `complaint` memory for them and a `listened` memory for the friend; a comfort meal takes 15%
off every grievance; if the offender does it again the grievance reopens. **Mood traits:** the trait
catalog gains Good-hearted and Bitter; each tick a good-hearted resident gains a little fulfillment
for each happy person on their lot, a bitter one for each unhappy person (`utils/witnessMood.ts`,
`witnessMood` in the trait effects, capped per tick). The character editor has an Opinions section
(disapproves / neutral / approves per topic). The seed gives several residents opinions (retired
Elena disapproves of Manny's daytime naps) and Sara and Tom the mood traits. Known gaps: only
existing behaviors can be topics; reactions only change the witness's side of a relationship;
venting is a planner nudge rather than its own action, and a complaint is not remembered by the
person complained about beyond "listened"; the numbers (cooldown, decay, bonuses) are first guesses.

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

**Status:** Implemented and verified live (group chats, household preference, group fun before
solo). A chat can include 1-3 other people (`Intent.groupTargetIds` carries the extras beyond
`socialTargetId`, max `GROUP_SOCIAL.maxGroupExtras` in `config/social.ts`). The planner builds one
group candidate per item from the best pair candidate plus extras (housemates first), bounded by the
item's `maxSimultaneousUsers`; it scores a little above the same pair and, for chats, counts the
relationship bonus the relationship-ranked chats get (without that, groups never won for people who
love each other). Coordination (`tickExecution.ts`, `assignSocialParticipation`) invites the primary
partner, then the extras; the group forms with whoever accepts, an extra who declines is backed off,
one who is simply busy is skipped. `date` is always exactly one other person (enforced in the
planner and in coordination). `recordGroupInteraction` records a group chat, movie or art viewing
once: every pair is updated in both directions (people who have not met get first-met handling) and
each person gets one memory (`group_chat`, `group_movie`, `group_art`: "Chatted with X and Y.")
linked to their relationships. Housemates get a small chat bonus (`householdChatBonus`), so they
hang out autonomously. Status text names the whole group ("watching the TV with Bo and Cy").
**Group fun:** `view_art` and `view_movie` (`GROUP_FUN_ACTIONS`) are planned both together and alone
(`view_movie` is now an autonomous option; there is one TV in the seeded town, in the community
center). Together gets a bonus per other person; when the resident is bored (fulfillment below
`GROUP_FUN.boredThreshold`) and a group option exists, solo hobbies (read, write, solo art/movie)
lose `soloPenalty`, and are left alone when nobody is available. Fun planned with people needs an
invitation (`requiresInvitation`); a solo movie, or the follow-up to being invited over to watch one,
does not. **Fixed along the way:** every chat/date used to change the relationship twice (once per
participant's completion); now only the initiator records it (participant intents carry
`isSocialParticipant`), and the chat/date base deltas were doubled so friendships grow at the same
pace as before. Also fixed: status text for a chat at an item said "chatting with Couch".
Known gaps: pair chats still create no "chatted with" memory (only groups do); groups give every
pair the full chat bump, so chatty households grow close a bit faster; for tightly bonded people the
relationship-ranked chats (about 2.5) outscore any fun, so group fun mostly happens when those are
on cooldown or the bond is weaker; extras are picked by score, not by whether they like each other;
only art and movies can be done together until Epic 2 adds more activities.

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

- Exact thresholds for "long absence" (1.2) and milestone tier requirements (1.5).
- Where disapproval data is authored — recommend adding it to the character editor in
  Epic 2.1, with a sensible default (no disapprovals) until then.
