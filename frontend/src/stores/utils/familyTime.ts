/**
 * Time with family. The family need used to have no working source in a real town (calling Mom
 * needs an item nobody builds), so every resident drifted to zero. Spending social time with a
 * relative, a spouse or someone in your household now tops it up.
 */

import { FAMILY_TIME } from '../config/social'
import type { CharacterState, Intent } from '../types'
import { hasBloodFamilyLabel } from './family'

const PARTNER_LABELS = new Set(['spouse', 'husband', 'wife', 'partner'])

export function isFamilyOf(
  state: Pick<CharacterState, 'relationships' | 'householdId'>,
  otherId: string,
  other: Pick<CharacterState, 'householdId'> | undefined
): boolean {
  if (state.householdId && other?.householdId === state.householdId) return true
  const labels = state.relationships?.find((r) => r.toCharacterId === otherId)?.labels ?? []
  return hasBloodFamilyLabel(labels) || labels.some((label) => PARTNER_LABELS.has(label))
}

/** How much the family need rises from this action, given who they were with. */
export function familyTimeBoost(
  state: Pick<CharacterState, 'relationships' | 'householdId'>,
  intent: Pick<Intent, 'action' | 'socialTargetId' | 'groupTargetIds'>,
  states: Record<string, CharacterState>
): number {
  if (!(FAMILY_TIME.actions as readonly string[]).includes(intent.action)) return 0
  const companions = [intent.socialTargetId, ...(intent.groupTargetIds ?? [])].filter((id): id is string => !!id)
  return companions.some((id) => isFamilyOf(state, id, states[id])) ? FAMILY_TIME.boost : 0
}

/** Living alongside family tops up the family need a little each tick: awake, same lot, family present. */
export function applyFamilyPresence(states: Record<string, CharacterState>): void {
  const byLot = new Map<string, string[]>()
  for (const [id, state] of Object.entries(states)) {
    const lotId = state.location.lotId
    if (lotId && state.currentAction !== 'sleep') byLot.set(lotId, [...(byLot.get(lotId) ?? []), id])
  }
  for (const ids of byLot.values()) {
    for (const id of ids) {
      const state = states[id]
      if (ids.some((otherId) => otherId !== id && isFamilyOf(state, otherId, states[otherId]))) {
        state.needs.family = Math.min(1, state.needs.family + FAMILY_TIME.presencePerTick)
      }
    }
  }
}
