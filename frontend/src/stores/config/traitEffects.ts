/**
 * What each trait does in the simulation, keyed by trait id.
 *
 * The database only knows a trait's identity (id/name/description); behavior is
 * declared here so it stays out of the planner. A trait id with no entry is
 * display-only. Keep ids in sync with TRAIT_CATALOG in `src/traits.ts`.
 */

import type { NeedName } from '../types'
import type { PressureMeter } from './pressure'

export interface TraitEffect {
  /** Multiplies the per-tick decay of a need (below 1 = slower, above 1 = faster). */
  decayMultipliers?: Partial<Record<NeedName, number>>
  /** Needs this trait switches off entirely: no decay, pinned full, actions unavailable. */
  disablesNeeds?: NeedName[]
  /**
   * How the mood of nearby residents moves them: 'joy' (gains from happy neighbors) or
   * 'schadenfreude' (gains from unhappy ones). See utils/witnessMood.ts.
   */
  witnessMood?: 'joy' | 'schadenfreude'
  /** How this disposition shapes pressure (see utils/pressure.ts). Multipliers combine across traits. */
  pressure?: {
    /** Multiplies how fast a meter builds. */
    gain?: Partial<Record<PressureMeter, number>>
    /** Multiplies the threshold at which a meter counts as over the line (below 1 = snaps sooner). */
    threshold?: Partial<Record<PressureMeter, number>>
    /** Multiplies what each grievance adds to irritation. */
    grievanceGain?: number
    /** Turns on a meter that is otherwise absent. */
    enables?: PressureMeter[]
  }
  /** How this disposition shapes what they do when they see an antisocial act (Epic 6.4). */
  sides?: {
    /** Never steps in or takes a side. */
    staysOut?: boolean
    /** Steps in for someone they regard less (config/sides.ts `protectiveMinRegard`). */
    quickToStepIn?: boolean
    /** Upset by watching conflict, like a child. */
    upsetByConflict?: boolean
  }
}

export const TRAIT_EFFECTS: Record<string, TraitEffect> = {
  'trait-needs-little-sleep': { decayMultipliers: { sleep: 0.5 } },
  'trait-needs-lots-of-sleep': { decayMultipliers: { sleep: 1.5 } },
  'trait-big-appetite': { decayMultipliers: { food: 1.5 } },
  'trait-small-appetite': { decayMultipliers: { food: 0.6 } },
  // The sim has no separate physical-intimacy mechanic yet, so both switch off romance.
  'trait-asexual': { disablesNeeds: ['romance'] },
  'trait-aromantic': { disablesNeeds: ['romance'] },
  'trait-good-hearted': { witnessMood: 'joy' },
  'trait-bitter': { witnessMood: 'schadenfreude' },
  'trait-loses-temper-easily': { pressure: { gain: { irritation: 1.5 }, threshold: { irritation: 0.8 } } },
  'trait-conflict-averse': { pressure: { gain: { irritation: 0.8 }, threshold: { irritation: 1.25 } }, sides: { staysOut: true } },
  'trait-forgiving': { pressure: { grievanceGain: 0.5 } },
  'trait-petty': { pressure: { grievanceGain: 1.5 } },
  'trait-jealous': { pressure: { enables: ['jealousy'], threshold: { jealousy: 0.8 } } },
  'trait-protective': { sides: { quickToStepIn: true } },
  'trait-sensitive': { sides: { upsetByConflict: true } },
  // Gossip and arrogance have no pressure effect yet: they get acts in Epic 6.3.
  'trait-gossip': {},
  'trait-arrogant': {}
}
