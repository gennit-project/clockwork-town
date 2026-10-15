# Epic 6.3 (first half) — Antisocial acts: snap, belittle, argue (COMPLETED)

> Completed work, kept for reference. The remaining rungs and the rest of the epic are in
> [../epic-6-friction-and-drama.md](../epic-6-friction-and-drama.md).

### 6.3 — Antisocial acts and the escalation ladder `[L]`

**Status:** First half built (snap, belittle, public argument). Deferred to a 6.3b follow-up
(still open, kept in the epic file): *gossip* (needs a rumour and third-party model), *sulk / freeze
someone out* and *estrangement* (aftermath mechanics that belong with 6.5), and the *jealous scene*
(needs the jealousy meter tied to a target and a partner model).
- **Acts** (`config/antisocial.ts`, `utils/antisocial.ts`): three `antisocial`-flagged actions (`snap`,
  `belittle`, `argue`; `ACTION_EFFECTS.antisocial`). They are not planner candidates: when a resident's
  irritation is over their personal limit (the 6.2 threshold, so disposition and drama intensity are
  already in it) and someone is there, they act, deterministically. The rung is the highest whose margin
  (meter minus limit) is reached: 0, 0.15, 0.30. The target is whoever they hold the strongest unvented
  grievance against, else whoever they regard least of those present, else lowest id. Residents are
  considered in id order; each is in at most one act per tick. Relief: snap -0.25, belittle -0.2, argue
  -0.35 (and -0.175 for the other party). Cooldown 6 ticks, 3 acts per sim day per resident.
- **Scope limits enforced in code:** adults act on adults and children on children; children only snap;
  an unknown age is treated as possibly a child (so nothing happens); sleepers neither act nor are
  targeted; nothing happens at drama Off. Ages now live on `CharacterState.age` (loaded from the API).
- **Consequences ride existing systems.** Three new approval topics (`rudeness`, `belittling`, `arguing`)
  with a `defaultStance: 'disapproves'`, so the room disapproves through the 1.3 code unless a resident
  says otherwise (`neutral` is now an explicit stance, in the backend validation and the editor). The
  actor's `currentAction` is set to the act for the tick's witness pass and restored afterwards. The
  target (and in an argument, the actor) is hurt regardless of stance: relationship drop, a `disapproval`
  memory, a grievance (all with a cause) and an irritation impulse (`insulted`). An `antisocial` event
  goes in the Recent events feed and an `antisocial_act` cause on the log entry.
- **Every step has a cause.** `antisocial_act` causes list the meter against the limit, the rung and its
  margin, the contributions, why this person, who was there, drama intensity and dispositions;
  witnesses' and the target's disapproval causes carry that story as "Why they did it".
- **Memories now store causes** (closes the 6.1 deferral): `Memory.cause` (JSON string) in the DDL, a
  `db.ts` migration, the GraphQL `Memory.cause` field and `createCharacterLongTermMemory(cause:)`; the
  memory timeline shows the why. Backups still do not include memories.
- **Known gaps:** the margins, relief amounts, cooldown and cap are first guesses; witnessing a
  disapproved act adds irritation to the actor (`disapprovedImpulse` 0.03 per witness) which can nearly
  cancel the relief in a crowded room, so a resident can stay over the line (the cooldown and daily cap
  bound this); no rung exists for children above "snap" and children only snap at children, so a lone
  child among adults never acts; antisocial acts do not yet count toward the daily summary; the 6.1
  invariant is enforced for every rung and every act the decider can produce, not yet for future
  acts (gossip etc.) that do not exist.

**What to build.** The behavior itself: new actions with an `antisocial` flag, each needing
a cause and an opportunity (someone to direct it at).
- A ladder, from mild to serious: *snap at someone* (rude outburst), *belittle*,
  *gossip* (spread a rumor about a third party), *sulk / freeze someone out*,
  *public argument* (two-way), *jealous scene*, *estrangement* (cut off contact).
  Each rung needs higher pressure, and each leaves the actor less pressured afterwards
  (venting a temper does relieve it), so it escalates only if the cause persists.
- Each act becomes an **approval topic** ("rudeness", "arguing", "gossiping"), so
  everyone who witnesses it disapproves through the Epic 1.3 system, with no new
  reaction code.
- The target gets a grievance, a feelings drop and a memory, with the cause attached.
- Text-only, deliberately non-graphic: these are *social* conflicts.

**Done when.** A hot-tempered resident whose pressure crosses their threshold lashes out
at someone present, the room disapproves, a ticket opens, and the cause view explains
every step. A calm resident in the same situation does not.
