# Epic 6.8 — Walk-away test and tuning pass (COMPLETED)

> Completed work, kept for reference. The open roadmap is in [../README.md](../README.md).

**Why.** The project's principle is that an unattended town stays healthy (README, design
principles). So tuning was done against *health first, drama second*, by measuring the real
simulation rather than staged scenarios.

## What was built

- **A headless town-week harness** (`frontend/src/stores/__tests__/townWeek.ts`). It loads the seeded
  Desert Willow town from a snapshot (`npm run snapshot:town`, which asks a running backend the same
  questions the frontend's town loader asks, into `__tests__/fixtures/desert-willow.json`), replays
  it through the **real loader** with the network mocked (`townWeekMocks.ts`), and runs the real
  simulation for N days with no intervention, from a fixed Monday-morning start and a seeded random
  generator so every run is the same week. It reports per resident, per day and per cause: time
  critical per need, stuck residents, time over the pressure line, acts by rung, cap hits, spirals,
  trigger shares, tickets and damaged relationships.
- **The walk-away test** (`townWeek.test.ts`, in the normal suite, about 40 seconds): the 8-resident
  Lin/Marsh/Reyes town for one sim day. Fails if anyone stays critical longer than their need's limit
  (`CRITICAL_LIMIT_TICKS`: an hour for basic needs, three for emotional, six for fulfillment), sits
  idle with a basic need low, any relationship loses more than 0.3 long-term, any act lacks a cause,
  or one day's acts exceed what the daily cap allows.
- **`npm run tune:drama`** (`townWeek.report.test.ts`): the long report on the full 12-resident town.
  `TUNE_DAYS`, `TUNE_INTENSITY` (off to relentless), `TUNE_VARIANT` (`default`, `no-dispositions`,
  `all-hot`) and `TUNE_LOG` (progress and results to a file) are the knobs. It asserts the same bounds.
  Ticks cost 15 to 700 ms depending on the hour, so a 3-day run takes about 6 minutes; run variants
  in parallel processes.

## What the first measurement found (default town, 3 days, before any change)

Health, not drama, was the larger problem:
- **Every resident's family need hit zero and sat critical for about half the time.** Nothing in a
  real town could restore it: `call_mom` needs an item nobody builds, and only volunteering gave a
  small secondary boost.
- **Relationships dissolved.** Long-term bonds faded 0.002 a tick (over half a point a day), so 14
  relationships lost more than 0.3 within two days even with drama Off.
- **Drama was far too frequent and self-feeding:** 29 acts in 3 days (7, 13, 9 a day), 9 resident-days at
  the daily cap, 33 pressure tickets, and three residents over their line for 260 to 628 of 864 ticks.
  93% of irritation came from grievances, and the room's default disapproval of every act created
  new grievances in every witness: contagion.
- Residents on long shifts (or asleep) could run a need to zero because the schedule outranks the
  planner.

## What was changed

| Area | Change |
|------|--------|
| Family need | Social time (chat, movie, art) with family, a partner or a housemate gives +0.12 (`FAMILY_TIME`); being awake on the same lot as family gives +0.002 a tick; the need decays 0.001 a tick (was 0.0015). Call-Mom stays unplannable until an item offers it. |
| Relationship decay | Long-term 0.0002 a tick (was 0.002); bonds with family, partners and housemates a quarter of that (`RELATIONSHIP_DECAY`). Scores are rounded to 5 decimals (3 rounded the new slow decay away entirely). |
| Schedule | A basic need below 0.08 (food, bladder, hygiene, health) pre-empts a shift: the resident steps out and returns (`SCHEDULE_BREAK`). Sleep is exempt. |
| Pressure | Meters decay in proportion to their value (2.5% a tick) on top of the flat drain, so a steady trigger levels off instead of climbing; grievance gain 0.016 a tick per repeat (cap 3); a grievance about something done *to* the resident weighs 1, one they merely witnessed 0.4; crowding starts above 6 on a lot (was 4); disapproval impulse 0.03 (was 0.05). |
| Acts | Cooldown 12 ticks (was 6), daily cap 3. |

## Results (default town, 4 days from Monday 06:00, after the changes)

| Drama | Acts | Per day | Notes |
|-------|------|---------|-------|
| Off | 0 | 0, 0, 0, 0 | no pressure tickets |
| Low | 1 | | one snap |
| Normal | 3 (2 belittle, 1 snap) | 0, 1, 2, 0 | 5 pressure tickets |
| High | 11 (7 snap, 2 belittle, 2 argue) | 0, 3, 6, 2 | 16 pressure tickets |
| Relentless | 30 (19 snap, 8 argue, 3 belittle) | 0, 9, 8, 13 | 8 resident-days at the cap |
| Normal, no dispositions | 1 | | |
| Normal, everyone hot-tempered | 40 | 3, 13, 11, 13 | chaotic, bounded, still healthy |

Health in every variant: no relationship damage, nobody stuck, nobody critical beyond their limit.

## Known gaps and what to watch

- **Slow burn, one source.** The seeded town has one real source of friction (Elena's disapproval of
  Manny's daytime naps), so in the default town drama begins on day 2 or 3 and stays small. More
  triggers (Epic 6.4 onward, rejection, jealousy, more stances in the seed) will change this; rerun
  the report when they land.
- **Intensity is a threshold dial, not a rate dial,** so Low versus Normal differ by a handful of
  acts and Relentless is cap-limited. If a smoother spread is wanted, scale gains as well.
- **Borderline needs:** Leo (8) reaches fulfillment 0 for up to about 4 hours (he is at school, which
  offers little to do); Kim's friends need touches zero briefly; bladder runs close to critical in
  busy hours because the seeded town has only three toilets. None breach the limits, but they are
  the first things to check if the walk-away test starts failing.
- **Performance:** about 40% of tick time is Vue's reactivity proxies reading world and character
  state; busy hours cost up to 0.7 s a tick for 12 residents. Worth a look before towns get bigger.
- The bounded test covers one day on 8 residents; slow failures (a need that only runs out on day 3)
  are caught by `npm run tune:drama`, not by the suite.
