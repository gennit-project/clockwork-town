/**
 * Pure need-gating helpers: which tiers a character can currently pursue.
 */

import { NEED_GATING, NEED_TIERS, TIER_PREREQUISITE, type NeedTier } from '../config/needGating'
import type { NeedName, Needs } from '../types'

export function tierOfNeed(need: NeedName): NeedTier {
  const tiers = Object.keys(NEED_TIERS) as NeedTier[]
  return tiers.find((tier) => NEED_TIERS[tier].includes(need)) ?? 'basic'
}

export function tierAverage(tier: NeedTier, needs: Needs): number {
  const names = NEED_TIERS[tier]
  return names.reduce((sum, name) => sum + needs[name], 0) / names.length
}

export function isTierUnlocked(tier: NeedTier, needs: Needs): boolean {
  const prerequisite = TIER_PREREQUISITE[tier]
  return prerequisite === null || tierAverage(prerequisite, needs) >= NEED_GATING.unlockThreshold
}

/** 1 when the need's tier is unlocked, otherwise the locked-tier penalty. */
export function gatingMultiplier(need: NeedName, needs: Needs): number {
  return isTierUnlocked(tierOfNeed(need), needs) ? 1 : NEED_GATING.lockedUtilityMultiplier
}
