/**
 * Decision making utilities for calculating action utilities and selecting best intents
 */

import type {
  ActionName,
  Needs,
  CharacterState,
  WorldData,
  ItemOccupancy,
  ItemOption,
  Intent,
  SimulationDateTime
} from '../types'
import { buildPlanCandidates, planCandidateToIntent } from './intentPlanner'
import { calculateUtility } from './actionUtility'
import { debugLog } from './simulationDebug'
import { buildWorkIntent } from './workSchedule'

export interface SelectBestIntentParams {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy?: ItemOccupancy
  simulationDateTime?: SimulationDateTime
  characterStates?: Record<string, CharacterState>
  reservedCharacterIds?: string[]
}

/**
 * Calculate utility score for a character performing an action at a specific item
 * Step 9: Utility = (need weight × need deficit) - travel cost + context bonus
 *
 * @param characterId - Character ID (for logging)
 * @param action - Action name (e.g., 'eat', 'sleep')
 * @param characterNeeds - Character's current needs { food, sleep, health, ... }
 * @param itemOption - Item option from findItemsWithAffordance
 * @returns Utility score (higher is better)
 */
export { calculateUtility } from './actionUtility'

/**
 * Select the best action intent for a character
 * Step 10: Evaluate all actions, find items, calculate utilities, return best intent
 *
 * @param characterId - Character ID
 * @param characterState - Character state with needs, cooldowns, location
 * @param worldData - World data structure
 * @param itemOccupancy - Current item occupancy { [itemId]: [characterId1, ...] }
 * @returns Intent: { action, itemId, itemName, targetSpaceId, targetLotId, utility } or { action: 'idle', utility: 0 }
 */
export function selectBestIntent({
  characterId,
  characterState,
  worldData,
  itemOccupancy = {},
  simulationDateTime,
  characterStates,
  reservedCharacterIds = []
}: SelectBestIntentParams): Intent {
  debugLog(`\n🎯 selectBestIntent for character ${characterId}`)
  const workIntent = buildWorkIntent({
    characterState,
    simulationDateTime,
    worldData
  })
  if (workIntent) {
    return workIntent
  }

  const intents: Intent[] = buildPlanCandidates({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    characterStates,
    reservedCharacterIds
  }).map((candidate) => {
    debugLog(`  ✓ ${candidate.goal}:${candidate.strategy} utility ${candidate.utility.toFixed(2)} (cost ${candidate.travelCost})`)
    return planCandidateToIntent(candidate)
  })

  // If no valid intents, return idle
  if (intents.length === 0) {
    debugLog(`  ⚠️  No valid actions available - returning idle`)
    return {
      action: 'idle',
      utility: 0
    }
  }

  intents.sort((a, b) => {
    if (b.utility !== a.utility) {
      return b.utility - a.utility
    }

    return (a.travelCost ?? 0) - (b.travelCost ?? 0)
  })

  const bestIntent = intents[0]
  debugLog(`\n  🏆 Best intent: ${bestIntent.action} (utility ${bestIntent.utility.toFixed(2)})`)
  debugLog(`     Item: ${bestIntent.itemName}`)
  debugLog(`     Location: ${bestIntent.targetSpaceName} (${bestIntent.targetLotName})`)
  debugLog(`     Travel cost: ${bestIntent.travelCost}`)

  return bestIntent
}
