/**
 * What each trait does in the simulation, keyed by trait id.
 *
 * The database only knows a trait's identity (id/name/description); behavior is
 * declared here so it stays out of the planner. A trait id with no entry is
 * display-only. Keep ids in sync with TRAIT_CATALOG in `src/traits.ts`.
 */

import type { NeedName } from '../types'

export interface TraitEffect {
  /** Multiplies the per-tick decay of a need (below 1 = slower, above 1 = faster). */
  decayMultipliers?: Partial<Record<NeedName, number>>
  /** Needs this trait switches off entirely: no decay, pinned full, actions unavailable. */
  disablesNeeds?: NeedName[]
}

export const TRAIT_EFFECTS: Record<string, TraitEffect> = {
  'trait-needs-little-sleep': { decayMultipliers: { sleep: 0.5 } },
  'trait-needs-lots-of-sleep': { decayMultipliers: { sleep: 1.5 } },
  'trait-big-appetite': { decayMultipliers: { food: 1.5 } },
  'trait-small-appetite': { decayMultipliers: { food: 0.6 } },
  // The sim has no separate physical-intimacy mechanic yet, so both switch off romance.
  'trait-asexual': { disablesNeeds: ['romance'] },
  'trait-aromantic': { disablesNeeds: ['romance'] }
}
