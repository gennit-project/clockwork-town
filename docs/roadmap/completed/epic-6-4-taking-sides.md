# Epic 6.4 — Taking sides and bystanders (COMPLETED)

> Completed work, kept for reference. The rest of the epic is in
> [../epic-6-friction-and-drama.md](../epic-6-friction-and-drama.md).

**What was built** (`config/sides.ts`, `utils/sides.ts`, the `recordSides` hook in
`simulationRuntime.ts`). After each antisocial act, every awake adult bystander on the lot is weighed
by rule, with no dice:
- **Regard** for the actor and for the target: long-term score plus half the short-term score; +0.2 for
  family, a partner or a housemate; +0.3 when a top-two ranked value points that way (*Have a happy
  family* toward a relative, *Be a good friend* toward the closer friend).
- **Disposition:** *Conflict-averse* never gets involved; the new *Protective* trait gets involved
  at lower regard (0.25, not 0.4); the new *Sensitive* trait, like children, is upset by watching.
- **The decision:** one side must be regarded at least 0.4 and beat the other by at least 0.25. The
  most regarded defender of the target **steps in** (at most one per act); up to two who regard the
  actor more **align with the actor**; everyone else stays out. Ties go to the lower id. A resident
  who has just stepped in or taken a side against the same person is on a 12-tick cooldown.
- **Stepping in** calms the actor (-0.1 irritation) and comforts the target (-0.08), and warms the
  target's and defender's feelings. It **backfires** deterministically if the actor is still 0.1 or more
  over their limit: they gain a "confronted" irritation bump and think less of the defender.
- **Aligning with the actor** calms them a little (-0.05), warms the actor toward the ally, and the
  target holds a directed grievance against the ally (`sided-with-aggressor`) and thinks less of them.
- **Upset onlookers:** children (and unknown ages) and *Sensitive* adults who watch get a
  `witnessed_conflict` memory and a little irritation ("distress").
- **Scope limits in code:** only adults step in or take a side; children are never assessed as
  defenders; nothing happens at drama Off.
- **Causes everywhere:** a `took_side` cause (regard for each, the gap and the regard needed, the
  reasons such as family or a ranked value, dispositions, and whether it backfired) is on the log
  entry, the memories of everyone involved, the grievance and a Recent events line; upset witnesses get
  a `witnessed_conflict` cause. The copy follows the README's voice: *"Welfare intervention: Elena
  Reyes stood between Tom Marsh and Manny Reyes."*
- **Seed:** Sara is *Protective*, Priya is *Sensitive*, and two neighbourly friendships
  (Sara–Elena, Tom–Manny) were added so a default run shows sides. The town snapshot used by the
  harness was regenerated.
- **Harness:** the town-week report now counts interventions, backfires, sides taken and upset
  witnesses.

**Measured (default town, 4 days, same seed).** Health is unchanged (nobody critical, nothing stuck, no
relationship damage). Interventions and sides appear at every setting above Low. With sides disabled
the same week had 9 acts at Normal (12 with sides: within noise), 40 at High (18 with sides) and 34
with everyone hot-tempered (16 with sides): stepping in roughly halves the drama in a busy town.

**Known gaps.** Allies and enemies are remembered only in memories and grievances (no label on the
relationship roster yet); regard is the only history used (past incidents come with 6.5); a
bystander who is also a party's housemate counts as "family" for the bond bonus; half of all actors
are still over their limit the tick after acting at Normal (the cooldown and cap bound it); the
numbers are first guesses.
