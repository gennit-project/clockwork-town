# Clockwork Town — Roadmap

This folder is the durable plan of record for Clockwork Town. It is written to be
**self-contained**: a session (human or AI) that has read only this folder plus the
codebase should be able to pick up any epic and execute it without needing the
original brainstorming notes or prior chat history.

If you are a fresh session, **read this file top to bottom first**, then open the
specific `epic-N-*.md` you've been asked to work on.

---

## What Clockwork Town is

A **text-based life simulator** — think a deadpan, observability-dashboard take on
a life sim. The current UI is reskinned as a Grafana-style "IT service desk for the
human soul": residents are nodes, needs are metrics, events are logs/alerts/tickets.

**Text-only by design.** There are no images and none are planned for the near
future. Avatars are emoji/text. Any old note mentioning item pictures, room
pictures, or a "photoshoot reward" is obsolete — see [parked-long-term.md](parked-long-term.md).

## Stack & how to run it

- **DB:** Kùzu embedded graph database, saved to `data/clockwork-town.kuzu`. Cypher queries.
- **Backend:** GraphQL Yoga + TypeScript (`src/`). Schema: `src/schema.graphql`. Resolvers: `src/resolvers/`. DDL: `src/kuzu.ddl.sql`. Query helpers: `src/kuzuHelpers.ts` (`q`, `batch`).
- **Frontend:** Vue 3 + Vite (`frontend/`). Pinia store, Vue Router, Tailwind v4. Sim logic lives **client-side** in `frontend/src/stores/`.
- **Future packaging:** desktop Electron app (backend + Kùzu in the main process). Desktop-only; mobile/Capacitor is no longer planned.

Dev commands:
```bash
npm run dev          # backend (tsx watch) — see port note below
npm run dev:frontend # vite dev server (5173)
npx vitest run       # frontend test suite
npm run ddl          # apply Kùzu DDL
```

**Port note:** the backend defaults to 4000. If port 4000 is already in use on your
machine, run the backend on another port (e.g. `PORT=4001 npm run dev`) and point the
Vite `/graphql` proxy at the same port (`vite.config.ts`). If you change the proxy for
local dev, set it back to 4000 before committing.

There are **3 pre-existing failing tests** in `frontend/src/stores/utils/__tests__/taskLifecycle.test.ts`.
They are unrelated to current work; a green run is "3 failed, everything else passing."

## Where the simulation actually lives (orientation)

The sim runs in the browser, per tick, in `frontend/src/stores/`:
- `simulation.ts` — Pinia store (state: needs, animals, world data, happiness history).
- `utils/tickExecution.ts` — one tick: decay → decision → execution.
- `utils/simulationRuntime.ts` — wires the tick to persistence + relationship/animal runtimes.
- `utils/decisionMaking.ts` + `utils/intentPlanner.ts` — candidate generation & utility-based action choice.
- `config/actionEffects.ts` (`ACTION_EFFECTS`, `NEED_WEIGHTS`), `config/needs.ts` (`NEED_DECAY_RATES`, `INITIAL_NEEDS`, `INITIAL_COOLDOWNS`).
- `utils/relationshipRuntime.ts`, `utils/relationshipAvailability.ts` — relationship events/decay.
- `utils/animalRuntime.ts`, `config/animalConfig.ts` — the lean animal runtime.
- `utils/happinessMetrics.ts` — derived happiness; `happinessHistory` ring buffer feeds time-series panels.

Design tokens (Grafana-dark) are in `frontend/src/style.css` (`gf-bg`, `gf-surface`, `gf-text`, `gf-blue`, etc.).

## Current state at a glance (verified against the code)

**Built:** 9-need utility sim; directed relationships (short/long-term scores + labels, proposals, decay); short/long-term memories + memory timeline with eventType filtering; activity log / log stream; employment & work shifts; read-only calendar; **animal runtime** (needs, movement, action choice) + **human↔animal petting**; coordinated `chat_friend`/`date` (pairwise); Grafana reskin (world/region hexmap, town & character dashboards, relationships graph); world isolation; character editor (name/age/bio/schedule); household editor (members + animals); lot & household **template libraries**; lot/space/item creation (item authoring is inline per-room in `SpaceDetail.vue`); **backup/restore to Google Drive** (encrypted).

**Schema-only, no behavior yet:** `Trait` (with `basicNeedModifiers`/`emotionalNeedModifiers`), `Value`, `Employment.salary`.

**Stubs (route exists → `ServiceDeskStub.vue`):** `/alerts`, `/tickets`, `/analytics`, `/reports`, `/settings`, and `/library/{characters,items,regions}` (`LibraryStub.vue`).

**Partial:** death (only `isDeceasedTarget` + a "Deceased" badge); world/lot build UI (list-based via `LotsAndHouseholds.vue` / `LotTemplateEdit.vue`, no map, no roads); relationship memory filtering (eventType only, no family-tree relation filters).

**Absent:** alerts/tickets logic, trait/value behavior, need-gating, daily memory summary, group activities, finances, cooking rota, chores, weather/climate config, job slots, NPCs, illness, death triggers/warnings/grief, childcare/foster, difficulty levels, tutorial.

## The ordering, and why

Principle: **substrate (data + authoring) → mechanics that read it → content that exercises it → tutorial that wraps it → shipping.** Every epic should light up something visible in the service-desk UI so the project is always dogfooded.

Two corrections to the original (pre-this-folder) numbering:
1. **Item authoring was scheduled too early.** Traits + Values are the real foundation — fulfillment, approval/disapproval, the relationship milestone tree, trait modifiers, and the entire default-town cast all depend on traits/values, which currently do nothing. Build those first (Epic 0).
2. **The tutorial's map-based building UI (place/rotate buildings, draw roads) is the single most expensive feature and was silently blocking the tutorial.** It's decoupled: a non-spatial "add building → staff it" flow delivers the tutorial's substance. The spatial map editor is parked.

| Epic | Theme | Spec |
|------|-------|------|
| 0 | Make the reskin real + data foundation (alerts/tickets, traits, values, need-gating) | [epic-0-foundation.md](epic-0-foundation.md) |
| 1 | Make relationships feel alive (daily memory rollup, reunion events, approval, groups, milestones, workplace bonding) | [epic-1-relationships.md](epic-1-relationships.md) |
| 2 | Authoring substrate (item catalog, character family/relationship/memory editing, world/region config) | [epic-2-authoring.md](epic-2-authoring.md) |
| 3 | Domestic life & economy (finances, cooking rota, chores) | [epic-3-domestic-economy.md](epic-3-domestic-economy.md) |
| 4 | Town as a living system (job slots, NPCs, illness, death & grief, childcare) | [epic-4-living-town.md](epic-4-living-town.md) |
| 5 | Content & shipping (build-and-staff flow, default town, tutorial, difficulty) | [epic-5-content-shipping.md](epic-5-content-shipping.md) |
| — | Parked / long-term / cut | [parked-long-term.md](parked-long-term.md) |

Epics 0–2 are specified in full. Epics 3–5 capture everything known today; expect to
refine each one's details just before starting it (and update its file when you do).

## Conventions for these docs

- **Size tags:** `[S]` hours, `[M]` a day or two, `[L]` multi-day, `[XL]` multi-week.
- Work items are ordered within an epic. "Prerequisites" name cross-epic dependencies.
- When you complete an item, update its **Status** line in the epic file and the
  "Current state at a glance" section above. Keep the docs honest — they are only
  useful to a cold session if they match reality.
