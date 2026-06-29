# Epic 3 — Domestic life & economy

**Read [README.md](README.md) first.** This epic adds the household-level systems that
make daily life (and the default town's drama) function: money, shared meals, and
chores. It's specified at "everything we know today" depth — refine each item just
before building it, and update this file when you do.

## Goal

Households become economic and domestic units: they earn and spend money, eat
together as a ritual with a cook rota, and keep house.

## What this epic unlocks

- Prerequisites for default-town stories that hinge on money and shared meals
  (Epic 5): the grocery-store owner, the family restaurant, alternating cooks, etc.
- Realistic daily pressure (chores) that the dashboards can surface.

## Prerequisites

- **Epic 0** (alerts/tickets, traits) — money/chore pressures file alerts; food
  traits (vegan/vegetarian/appetite) influence eating.
- **Epic 2.2/2.3** (household authoring incl. primary cook; calendar editability).

## Current state to build on

- `Employment` / `Shift` schema includes `salary: Int` — but **no money exists in the
  sim** (no balances, earning, or spending).
- Eating already works as an action with multi-step cook/takeout/grocery strategies in
  `frontend/src/stores/utils/intentPlanner.ts` (`eat:cook-meal-table`, etc.) — but
  there's no household cook role, shared-meal ritual, or rota.
- Calendar exists **read-only** (`CalendarView.vue`); making it editable is needed here.
- Household editor (`HouseholdForm.vue`) has no "primary cook" field yet.
- Chores: absent entirely.

---

## Work items (in order)

### 3.1 — Finances `[M]`

Household money: characters earn their `salary` at work; households hold a balance and
spend on food (and later other goods). Surface balance on household/character
dashboards and raise an alert/ticket when a household can't afford essentials.
Plug earning into the existing shift system and spending into the eat/grocery flow.

### 3.2 — Dinner & cooking rota `[M]`

Households are tight-knit and eat together by default — meals are a near-unskippable
ritual on the calendar. On household creation, select a **primary cook**; when home,
the primary cook cooks for everyone, and others cook only if the primary cook is off-
lot. Configure how many days/week the primary cook cooks (so roommates can alternate;
e.g. "primary cook Mon/Wed/Fri"). In the calendar view, choose who cooks each meal or
use a rota. For lots you're not actively playing, each weekend the game asks whether
to set the rota manually or automatically.

Build on the existing cook-meal planner strategies and the (to-be-editable) calendar.
Needs the primary-cook field from household authoring (Epic 2.2) and finances (3.1,
buying food).

### 3.3 — Chores `[M, optional/deprioritizable]`

Laundry, dishes, trash as need-like household pressures:
- Dirty clothes accumulate: by default characters sleep in pajamas; day clothes end up
  on the floor or in the hamper; next morning they're dirty and the player chooses
  do-laundry / wear-dirty / stay-in-pajamas.
- Trash and dirty dishes pile up after meals.
Model these as household/character pressures that decay and prompt action; surface on
the dashboard. Self-contained — can slip to later without blocking other epics.

## Out of scope

- Images. Buying clothing as visual items (text inventory only).
- Multi-tenant commercial economics beyond simple wages (that's part of Epic 4's job
  slots / community lots).

## Open decisions

- Whether money is per-household, per-character, or both (recommend per-household with
  individual earnings flowing in).
- How deep chores go vs. being light flavor — decide before starting 3.3.
