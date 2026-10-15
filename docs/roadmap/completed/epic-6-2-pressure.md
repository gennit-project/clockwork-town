# Epic 6.2 — Dispositions and pressure (COMPLETED)

> Completed work, kept for reference. The rest of the epic is in
> [../epic-6-friction-and-drama.md](../epic-6-friction-and-drama.md).

### 6.2 — Dispositions and pressure `[M]`

**Status:** Built. What was built, and how it differs from the sketch below:
- **Dispositions** (`config/traitEffects.ts`, `pressure` field; catalog in `src/traits.ts`): *Loses
  temper easily* (irritation builds 1.5x, threshold 0.8x), *Conflict-averse* (0.8x, 1.25x),
  *Forgiving* (grievances add 0.5x), *Petty* (1.5x), *Jealous* (turns on the jealousy meter,
  threshold 0.8x). *Gossip* and *Arrogant* are in the catalog with no effect until 6.3 gives
  them acts. Existing worlds get the new traits at server start (`ensureTraitCatalog`).
- **Pressure** (`utils/pressure.ts`, tuning in `config/pressure.ts`): `irritation` for everyone,
  `jealousy` for jealous residents only, each a 0..1 value plus a **ledger** (trigger -> amount)
  that always sums to the value, so the cause view lists exactly what is in the meter.
  Triggers: unmet basic needs, unvented grievances (more if repeated), being disapproved of
  (an impulse at the moment of the reaction), crowding (more than 4 on a lot), and, for jealousy,
  a close tie (long-term score 0.6+) busy with someone else on the same lot. Drains: a little each
  tick, much more asleep, 0.15 on venting, 0.08 on a comfort meal while holding grievances; drains
  take proportionally from every trigger.
- **Drama intensity** (minimal version of 6.7): Off, Low, Normal, High, Relentless, a threshold
  multiplier (Off = never over the line), a select on the Alerts page, persisted in localStorage.
  At Off meters still build and show; nothing is ever "over".
- **Visible:** a Pressure panel on the character dashboard (bar, limit marker, expandable why via
  `WhyCause`), and a `pressure` ticket ("Tom's irritation is over the line") whose cause lists the
  contributions, dispositions and intensity. Nothing acts on a meter yet.
- **Known gaps:** pressure is sim state only, so it resets on reload; the numbers are first guesses
  (one grievance alone barely outbuilds the base drain by design, repeats and hunger tip it over);
  a ticket's cause is captured when it opens and is not refreshed; jealousy only recognizes a close
  tie that is mid-chat or mid-date with someone else; rivals and "interruptions" as triggers are
  not built.

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
