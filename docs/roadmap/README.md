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

## What is not built yet (verified against the code)

**Built:** a great deal; see [completed/README.md](completed/README.md) for the list and for the specs of finished work. Everything else in this folder is work that is not done yet.

**Schema-only, no behavior yet:** `Employment.salary`. (`Trait` is live for a behavioral subset; its GraphQL `basicNeedModifiers`/`emotionalNeedModifiers` fields are unused and return `[]`, since effects live in the frontend `TRAIT_EFFECTS` map.)

**Stubs (route exists → `ServiceDeskStub.vue`):** `/analytics`, `/reports`, `/settings`, and `/library/{characters,items,regions}` (`LibraryStub.vue`).

**Partial:** death (only `isDeceasedTarget` + a "Deceased" badge); world/lot build UI (list-based via `LotsAndHouseholds.vue` / `LotTemplateEdit.vue`, no map, no roads); relationship memory filtering (eventType only, no family-tree relation filters).

**Absent:** richer ticket generators (grief), ticket persistence, the full trait and value lists, relationship milestones, antisocial behavior and rejection (Epic 6.2 onward), finances, cooking rota, chores, weather/climate config, job slots, NPCs, illness, death triggers/warnings/grief, childcare/foster, difficulty levels, tutorial.

## The ordering, and why

Principle: **substrate (data + authoring) → mechanics that read it → content that exercises it → tutorial that wraps it → shipping.** Every epic should light up something visible in the service-desk UI so the project is always dogfooded.

Two corrections to the original (pre-this-folder) numbering:
1. **Item authoring was scheduled too early.** Traits + Values are the real foundation — fulfillment, approval/disapproval, the relationship milestone tree, trait modifiers, and the entire default-town cast all depend on traits/values. Build those first (Epic 0, now done).
2. **The tutorial's map-based building UI (place/rotate buildings, draw roads) is the single most expensive feature and was silently blocking the tutorial.** It's decoupled: a non-spatial "add building → staff it" flow delivers the tutorial's substance. The spatial map editor is parked.

| Epic | Theme | Spec |
|------|-------|------|
| 1 | Make relationships feel alive: remaining items are milestones (1.5) and workplace bonding (1.6); 1.1–1.4 are done | [epic-1-relationships.md](epic-1-relationships.md) |
| 2 | Authoring substrate (item catalog, character family/relationship/memory editing, world/region config) | [epic-2-authoring.md](epic-2-authoring.md) |
| 3 | Domestic life & economy (finances, cooking rota, chores) | [epic-3-domestic-economy.md](epic-3-domestic-economy.md) |
| 4 | Town as a living system (job slots, NPCs, illness, death & grief, childcare) | [epic-4-living-town.md](epic-4-living-town.md) |
| 5 | Content & shipping (build-and-staff flow, default town, tutorial, difficulty) | [epic-5-content-shipping.md](epic-5-content-shipping.md) |
| 6 | Friction & drama (autonomous antisocial behavior with an auditable cause, rejection, repair) | [epic-6-friction-and-drama.md](epic-6-friction-and-drama.md) |
| ✓ | Completed work (Epic 0, Epic 1.1–1.4, Epic 6.1) | [completed/](completed/README.md) |
| — | Parked / long-term / cut | [parked-long-term.md](parked-long-term.md) |

Epics 1–2 are specified in full. Epics 3–5 capture everything known today; expect to
refine each one's details just before starting it (and update its file when you do).

**Epic 6 is numbered last but is not last in time.** It builds on the approval and
disapproval system from Epic 1.3 (done) and can start now. Its first item (6.1, cause
records) is done, so every later item reports its reasons through it. Epic 5.5's difficulty levels depend on its drama-intensity
setting (6.7).

## Conventions for these docs

- **Size tags:** `[S]` hours, `[M]` a day or two, `[L]` multi-day, `[XL]` multi-week.
- Work items are ordered within an epic. "Prerequisites" name cross-epic dependencies.
- When you complete an item, **move its spec out of the epic file** into `completed/`
  (add it to `completed/README.md`), and leave only a one-line pointer plus any
  still-open follow-ups behind. This folder lists only work that is not done. Keep the
  docs honest: they are only useful to a cold session if they match reality.
