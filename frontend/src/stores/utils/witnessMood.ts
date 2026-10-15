/**
 * Mood contagion for good-hearted and bitter residents: a good-hearted person gains a little
 * fulfillment from each happy person nearby, a bitter one from each unhappy person nearby.
 */

import { WITNESS_MOOD } from '../config/social'
import { TRAIT_EFFECTS } from '../config/traitEffects'
import type { CharacterState } from '../types'
import { computeCharacterHappiness } from './happinessMetrics'

/** Which of the mood reactions their traits give them. */
export function witnessMoodsOf(traitIds: readonly string[] = []): Set<'joy' | 'schadenfreude'> {
  const moods = new Set<'joy' | 'schadenfreude'>()
  for (const id of traitIds) {
    const mood = TRAIT_EFFECTS[id]?.witnessMood
    if (mood) moods.add(mood)
  }
  return moods
}

/**
 * Fulfillment gained this tick from the people on the same lot. `neighbors` should be the other
 * residents there; the resident themselves is not counted.
 */
export function witnessMoodGain(
  traitIds: readonly string[] | undefined,
  neighbors: Array<Pick<CharacterState, 'needs' | 'traitIds'>>
): number {
  const moods = witnessMoodsOf(traitIds)
  if (moods.size === 0) return 0

  let gain = 0
  for (const neighbor of neighbors) {
    const happiness = computeCharacterHappiness(neighbor.needs, neighbor.traitIds)
    if (moods.has('joy') && happiness >= WITNESS_MOOD.happyAtOrAbove) gain += WITNESS_MOOD.perNeighbor
    if (moods.has('schadenfreude') && happiness <= WITNESS_MOOD.unhappyAtOrBelow) gain += WITNESS_MOOD.perNeighbor
  }
  return Math.min(gain, WITNESS_MOOD.maxPerTick)
}

/** Apply witness mood for everyone this tick. */
export function applyWitnessMood(states: Record<string, CharacterState>): void {
  for (const [id, state] of Object.entries(states)) {
    const lotId = state.location.lotId
    if (!lotId || witnessMoodsOf(state.traitIds).size === 0) continue
    const neighbors = Object.entries(states)
      .filter(([otherId, other]) => otherId !== id && other.location.lotId === lotId)
      .map(([, other]) => other)
    const gain = witnessMoodGain(state.traitIds, neighbors)
    if (gain > 0) state.needs.fulfillment = Math.min(1, state.needs.fulfillment + gain)
  }
}
