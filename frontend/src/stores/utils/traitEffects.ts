/**
 * Pure helpers that resolve a character's trait ids into simulation effects.
 */

import { ACTION_EFFECTS } from '../config/actionEffects'
import { NEED_DECAY_RATES } from '../config/needs'
import { TRAIT_EFFECTS } from '../config/traitEffects'
import type { ActionName, NeedName, Needs } from '../types'

/** Per-tick decay for a need after applying every trait multiplier. */
export function effectiveDecayRate(need: NeedName, traitIds: readonly string[] = []): number {
  return traitIds.reduce(
    (rate, id) => rate * (TRAIT_EFFECTS[id]?.decayMultipliers?.[need] ?? 1),
    NEED_DECAY_RATES[need]
  )
}

/** Needs switched off by the character's traits, mapped to the trait id responsible. */
export function getDisabledNeeds(traitIds: readonly string[] = []): Partial<Record<NeedName, string>> {
  const disabled: Partial<Record<NeedName, string>> = {}
  for (const id of traitIds) {
    for (const need of TRAIT_EFFECTS[id]?.disablesNeeds ?? []) {
      disabled[need] ??= id
    }
  }
  return disabled
}

export function isNeedDisabled(need: NeedName, traitIds: readonly string[] = []): boolean {
  return need in getDisabledNeeds(traitIds)
}

/** True when the action exists to serve a need that the character's traits switch off. */
export function isActionDisabled(action: ActionName, traitIds: readonly string[] = []): boolean {
  const primaryNeed = ACTION_EFFECTS[action]?.primaryNeed
  return primaryNeed ? isNeedDisabled(primaryNeed, traitIds) : false
}

/** Hold every disabled need at full so nothing downstream treats it as a deficit. */
export function pinDisabledNeeds(needs: Needs, traitIds: readonly string[] = []): void {
  for (const need of Object.keys(getDisabledNeeds(traitIds)) as NeedName[]) {
    needs[need] = 1
  }
}

/** Disabled needs mapped to the display name of the trait responsible (for tooltips). */
export function getDisabledNeedReasons(state: {
  traitIds?: readonly string[]
  traits?: readonly string[]
}): Partial<Record<NeedName, string>> {
  const traitIds = state.traitIds ?? []
  const reasons: Partial<Record<NeedName, string>> = {}
  for (const [need, traitId] of Object.entries(getDisabledNeeds(traitIds)) as [NeedName, string][]) {
    reasons[need] = state.traits?.[traitIds.indexOf(traitId)] ?? traitId
  }
  return reasons
}
