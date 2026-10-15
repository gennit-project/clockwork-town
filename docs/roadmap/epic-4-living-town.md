# Epic 4 — Town as a living system

**Read [README.md](README.md) first.** This epic turns a set of households into a
functioning town: workplaces with staffing requirements, NPCs to fill them, and the
life-and-death stakes (illness, death, grief, childcare) that the default town and
tutorial dramatize. Specified at "everything we know today" depth.

## Goal

The town runs as a system: commercial lots create jobs that must be staffed, NPCs
populate the world on schedules, characters can get sick and die (always with the
player's foreknowledge), survivors grieve, and children whose needs go unmet are
placed with foster families.

## What this epic unlocks

- The tutorial (Epic 5), which is essentially a guided tour of these systems
  (Manny gets sick → build & staff a clinic → house the staff → school for their kids).
- The default town's hardest stories (Whiterose grief, Survivor, foster households).

## Prerequisites

- **Epic 0** (done; alerts/tickets — death warnings and grief file here; traits — grief
  expression, "hates holidays").
- **Epic 1** (memory/relationship model — grief freezes relationships and rolls up
  grave-visit/letter desires; reuses the relationship-memory model, not a separate
  memorial subsystem).
- **Epic 2** (authoring — staffing picks from authored characters; world/region config).
- **Epic 3** (households/economy — staff need housing and wages).

## Current state to build on

- `Employment` / `Employer` / `Shift` exist, but there's **no job-slot/staffing
  concept** and **no NPCs**.
- Death is ~10% there: `Relationship.isDeceasedTarget` + a "Deceased" badge +
  availability handling in `relationshipAvailability.ts`. No death triggers,
  warnings, or grief behaviors.
- Illness: a `health` need and a `medicate` action exist, but no disease/care system.

---

## Work items (rough order)

### 4.1 — Community lots with job slots + staffing `[L]`

When a commercial/community lot is placed, it defines **job slots** (e.g. a retail
store needs a cashier + a manager; a clinic needs a doctor, nurse, and admin
assistant). Every slot must be filled by a playable character or an NPC. Staff then
show up at that lot on schedule (reuse the shift system) and appear in the community
roster. Characters can travel to community lots (e.g. to buy groceries/clothes).
Some roles require credentials (e.g. only qualified characters can be a doctor).

### 4.2 — NPC generation `[L]`

NPCs to fill job slots and populate the world: staff NPCs that show up on schedule
with their immediate families, plus "from out of town" NPCs that spawn on community
lots on regular schedules. Needs a sort/filter for picking NPCs by credentials when
staffing (4.1).

### 4.3 — Illness system `[M]`

Characters can come down with a (cartoony, fictional) disease that requires medical
care; ties into the existing `health` need and a clinic/doctor (4.1). This is the
hook the tutorial uses ("Manny is sick but the town has no doctor").

### 4.4 — Death & grief (R10) `[L]`

**Mode note:** in the default (hands-off, recoverable) mode, nobody dies from neglect; the
forewarned, player-chosen death below is the only kind, and an unattended town must never
lose a resident to inattention. Death from neglect belongs to harder autonomy modes
(Epic 5.5).

- **No death without warning:** the player is always notified in advance and can
  choose to heal or allow the death (an alert/ticket from Epic 0.1).
- **Frozen relationships:** a deceased friend/relative stays on survivors'
  relationship sheets, frozen as of death (build on `isDeceasedTarget`). Survivors
  roll up desires to visit the grave or write letters.
- **Grief manifests outwardly:** refuse to eat, perform poorly at work (and possibly
  get fired), or won't get out of bed.
- Preserve relationship ledgers and memories; reuse the Epic 1 relationship-memory
  model — **do not** build a separate memorial subsystem.

### 4.5 — Childcare / foster + split households `[L]`

- If a child's needs go unmet, the player picks a playable household to foster them,
  or an NPC household (which then becomes playable).
- Split households: when a child's parents live in two households, the game proposes a
  weekly switch in the calendar view for the player to approve/reject.

### 4.6 — Town viability: the essential facilities `[M]`

The end state of the "self-sustaining town" principle: an autonomously healthy town is only
possible when the **minimum facilities that sustain a normal life exist**, at least one
grocery store and one doctor's office (and then, as needed, housing, power and water,
a school once there are children). Until this ships food just appears in the fridges.
- A **viability check** that evaluates the town against its essentials (per region), surfaced
  as an alert/ticket ("No grocery store: food will run short") and a plain checklist view.
- The **fallback in the default mode**: with an essential facility missing, residents are
  looked after by an abstract safety net so the walk-away guarantee still holds, but the town
  is flagged as "propped up" until a real facility exists. Harder autonomy modes remove the net.
- Ties to 4.1 (job slots staff the store and the clinic), 4.3 (illness needs a doctor) and
  Epic 3.1 (groceries and prices). The tutorial's "sick but no doctor" beat (Epic 5.4) is this
  check, dramatized.

**Done when.** Removing the only grocery store or clinic raises a viability alert; the default
mode keeps residents fed and healthy through a safety net, labelled as such; a harder mode lets
the shortage bite; the walk-away test passes with and without the facilities.

## Out of scope

- Images.
- The spatial/map build UI with roads (parked). Lot placement stays list-based; the
  tutorial's "build a clinic" uses the non-spatial build-and-staff flow in Epic 5.

## Open decisions

- How credentials are modeled (a trait? a dedicated qualification field?). Decide
  before 4.1.
- Whether split households (4.5) ships with this epic or is deferred if it proves
  heavy — it's the most optional item here.
