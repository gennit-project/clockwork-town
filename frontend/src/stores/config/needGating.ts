/**
 * Maslow-style need gating. Higher tiers are pursued only once the tier below is
 * reasonably satisfied.
 */

import type { NeedName } from '../types'

export type NeedTier = 'basic' | 'emotional' | 'higher'

export const NEED_TIERS: Record<NeedTier, NeedName[]> = {
  basic: ['food', 'sleep', 'bladder', 'hygiene', 'health'],
  emotional: ['friends', 'family', 'romance'],
  higher: ['fulfillment']
}

/** The tier that must be satisfied before each tier unlocks (basic is always open). */
export const TIER_PREREQUISITE: Record<NeedTier, NeedTier | null> = {
  basic: null,
  emotional: 'basic',
  higher: 'emotional'
}

export const NEED_GATING = {
  /** Mean of the prerequisite tier must be at least this to unlock a tier. */
  unlockThreshold: 1 / 3,
  /** Multiplier on need-driven utility for actions in a locked tier. */
  lockedUtilityMultiplier: 0.1
} as const
