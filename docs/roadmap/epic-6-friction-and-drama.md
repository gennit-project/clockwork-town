# Epic 6 — Friction & drama: autonomous antisocial behavior with an auditable cause

**Read [README.md](README.md) first.** This epic builds directly on the approval /
disapproval system from [Epic 1.3](epic-1-relationships.md). It is specified at
"everything we know today" depth: refine each item just before building it, and update
this file when you do.

## Why this epic exists

A town where everyone is nice, and nobody is ever turned down, is boring. In The Sims 4
nobody is ever romantically rejected, and nobody autonomously fights or stirs up drama,
so there are no stories, only maintenance. Clockwork Town needs residents who sometimes
**behave badly on their own**: lose their temper, snap at someone, gossip, sulk, get
jealous, say no to a proposal.

The constraint that makes this safe to build, and worth building, is that **every
antisocial act must have an auditable reason.** Nothing happens "because the dice said
so". A resident lashes out because of who they are (a trait), what has been wearing them
down (pressure), and who was there (opportunity), and the player can see that chain.
That is also what keeps it a service desk for the human soul rather than a chaos
generator: the drama is a *finding* the player can investigate, not a mystery.

Example: Tom has the trait **Loses temper easily**. He is hungry (food 12%), has been
disapproved of twice today, and Sara (who he holds a grievance against) is in the room.
His irritation crosses his threshold and he snaps at Sara. Everyone present disapproves
(Epic 1.3), Sara forms a grievance against him, a ticket opens, and the incident reads:
*"Tom snapped at Sara. Why: hot-tempered (trait); irritation 0.84 over threshold 0.70
(hungry, 2 disapprovals today, grievance against Sara); Sara was in the room."*

## Design principles

1. **Auditable cause.** Every antisocial act records a `Cause`: the disposition (trait,
   value or state), the pressure and trigger that built up, the opportunity (who was
   there), and the rule that tipped it. It is shown wherever the act is shown: the log,
   the ticket, the memories of everyone involved, and a "Why did this happen?" view.
   An invariant test enforces that no antisocial act is ever created without one.
2. **Deterministic, not dice.** Acts come from accumulated pressure crossing a
   threshold, with someone available to direct it at. Same state in, same act out. If
   any randomness is ever used (for variety in wording, say) it is seeded and recorded.
   This keeps behavior testable and the explanations honest.
3. **Proportional and recoverable.** Acts sit on an escalation ladder, with cooldowns
   and a way back: cooling off, apologies, forgiveness. A town must not spiral into
   permanent mutual hatred just because one run of bad luck happened.
4. **Tunable.** A *drama intensity* setting scales thresholds and caps, so the same
   engine gives a gentle town, a spicy one, or the "everyone is a bad person" hardest
   world in [Epic 5.5](epic-5-content-shipping.md). Off means off.
5. **Consequences ride the existing system.** Disapproval, grievances, tickets,
   memories and relationship changes already exist (Epic 1.3). Antisocial acts are new
   *topics* and new *actors* for those systems, not a parallel system.

## What this epic unlocks

- The "feels alive" quality at the other end of the spectrum: friction, jealousy,
  heartbreak, reconciliation. These are what Epic 5's default-town stories (a wife who
  disapproves of her husband's friend, a husband who always sides with his mother)
  need in order to play out on their own.
- The explanation machinery (cause records and a "why" view) is reusable for any
  autonomous decision. Today an unexplained idle is just "No satisfying actions
  available".

## Prerequisites

- **Epic 1.3** (approval, disapproval, grievances, venting, tickets). Done.
- **Epic 0.2/0.3** (traits and values). Done. This epic adds new traits to the catalog.
- **Epic 1.4** (group situations) so there is an audience. Done.
- Nice to have: **Epic 1.5** (milestones) for reconciliation milestones, and
  **Epic 2.1** (editor) for authoring dispositions per character.

## Current state to build on

- `utils/witnessReactions.ts`, `config/approvalTopics.ts`: topics match witnessed acts;
  reactions lower feelings, leave memories and grievances, and file tickets.
- `utils/venting.ts`: upset residents complain to friends; grievances fade sooner when
  talked over.
- Traits (`config/traitEffects.ts`) support decay multipliers, disabled needs and mood
  contagion; no trait yet creates behavior.
- Invitations can already be turned down, but the reason is the *planner's* ("Bob
  preferred sleep"), not a typed, authored reason. Romantic proposals and dates are
  accepted or declined by the same utility comparison, so nobody is ever "rejected" in a
  way the player can read as a story.

---

## Work items (in order)

### 6.1 — Cause records and the "why" view `[M]` — do this first

**Status:** Not started.

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

### 6.2 — Dispositions and pressure `[M]`

**Status:** Not started.

**What to build.** The inputs that make an act possible.
- **Dispositions** as traits in the catalog, behavior declared in the trait effects map
  (like decay multipliers today): *loses temper easily*, *jealous*, *petty*, *gossip*,
  *arrogant*, *conflict-averse* (raises thresholds), *forgiving*. Authorable in the
  editor.
- **Pressure** per resident: an irritation (and jealousy, etc.) meter that builds from
  triggers and decays with rest: unmet basic needs, unresolved grievances, being
  disapproved of, crowding, interruptions, a rival's presence. Every contribution is
  recorded, so the cause view can list it.
- Thresholds depend on the disposition, and on the drama intensity setting (6.7).

**Done when.** A hot-tempered, hungry resident with a grievance has visibly higher
irritation than a calm one, and the contributions are listed in the cause view.

### 6.3 — Antisocial acts and the escalation ladder `[L]`

**Status:** Not started.

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

### 6.4 — Taking sides and bystanders `[M]`

**Status:** Not started.

**What to build.** Reactions beyond disapproval: someone who loves the target steps in
(a prosocial *intervene* act, justified by relationship and values); children and
sensitive residents are upset by what they see; a resident whose value is "make mom
happy" sides with their mother. Allies and enemies emerge from relationships and values,
each with a recorded reason.

**Done when.** A bystander who is close to the target defends them, and a third party
with a competing value takes the other side, both with explanations.

### 6.5 — Repair and de-escalation `[M]`

**Status:** Not started.

**What to build.** A way back, so drama has an arc.
- **Cooling off:** relief actions that drain pressure (leave the room, go for a walk,
  vent to a friend: already built, eat, rest).
- **Apology and forgiveness:** the actor can apologize when pressure has dropped and
  they hold remorse (a value, or a trait like *forgiving*/*proud*); the target forgives
  or doesn't, with a recorded reason. Grievances fade faster when forgiven.
- **Mediation:** a close third party can bring two people together.
- An **estranged** label for relationships that have broken down, and a
  **reconciled** milestone (Epic 1.5) when they mend.

**Done when.** An incident can end in an apology and forgiveness, or in lasting
estrangement, and either way the reasons are visible.

### 6.6 — Rejection and heartbreak `[M]`

**Status:** Not started.

**What to build.** Romantic proposals and dates that *can fail*, for typed, readable
reasons rather than an opaque utility comparison: already in a relationship (naming
whom), not attracted (the existing asexual/aromantic traits, plus a compatibility
check), too little bond, conflicting values, a blood relative (already enforced), or
simply "not right now" (needs unmet). A declined proposal leaves the proposer with
**heartbreak** (a grievance-like state with its own memory, ticket and recovery arc, and
a pull toward comfort and friends), and the decliner with a memory. Everything shows its
reason in the cause view.

Hard limits: nobody under the adult age is ever a romantic participant (see Scope
limits).

**Done when.** A proposal to someone who is already partnered is declined with that
reason on the record, the proposer is heartbroken and files a ticket, and they recover
over time (faster with friends).

### 6.7 — Drama intensity and pacing `[S–M]`

**Status:** Not started.

**What to build.** One setting that scales the whole thing: **Off / Gentle / Normal /
High / Relentless.** It scales pressure thresholds, forgiveness speed and cooldowns, and
caps how many incidents a town can have per simulated day (and per resident), with a
"calm period" after a big one. This is the knob [Epic 5.5](epic-5-content-shipping.md)
uses for difficulty levels (the hardest world = Relentless), and it is a per-world
setting the player can change. **Off** disables every antisocial act while leaving the
rest of the sim unchanged.

**Done when.** The same town produces visibly different amounts of friction at each
setting, Off produces none, and a cap is never exceeded.

---

## Scope limits (non-negotiable)

This is a text-only, service-desk-style sim. To keep the drama about *social* friction:
- **No graphic violence, no sexual violence, no self-harm.** An argument stays an
  argument. Physical escalation, if ever added, is a separate, opt-in decision that
  goes through the dark-themes toggle in Epic 5.5, and is not part of this epic.
- **Children are protected.** Residents below the adult age are never romantic
  participants, never the target of serious antisocial acts (belittling, estrangement,
  heartbreak), and never perform the serious rungs. Mild childhood squabbles are fine.
- **No death from conflict.** Death is its own story-driven system (Epic 4).
- **No real-world slurs or hateful content**, in generated text or authored data.
- The **drama intensity** setting must always include **Off**.

## Testing and auditing

- The invariant test from 6.1 (no antisocial act without a cause) runs over every act
  the planner can produce.
- Determinism tests: the same state produces the same act and the same cause.
- Controls in every test: a calm resident, a below-threshold pressure, and intensity
  Off must each produce no act.
- Caps and cooldowns are tested at their boundaries.

## Open decisions

- **Which dispositions first.** Recommended: *loses temper easily*, *jealous*, *petty*,
  *forgiving*; add the rest as the cause view proves out.
- **How visible the "why" should be by default.** Recommended: a short reason on the log
  line and ticket, the full factor list one click away.
- **Whether antisocial traits are chosen by the player or generated.** Recommended:
  authorable in the character editor (Epic 2.1) first; random generation only with the
  higher drama settings, and recorded.
- **Whether pressure is shown on the dashboard.** Recommended: yes, as an
  "irritation" meter, since it is part of the explanation.
