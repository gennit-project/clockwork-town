/**
 * Tick execution logic for the simulation
 */

import type { Ref } from 'vue'
import type {
  CharacterState,
  WorldData,
  ItemOccupancy,
  Intent,
  ActivityLogEntry,
  ActionName
} from '../types'
import { NEED_DECAY_RATES } from '../config/needs'
import { selectBestIntent } from './decisionMaking'

/**
 * Parameters for executeTick function
 */
export interface ExecuteTickParams {
  currentTick: Ref<number>
  characterStates: Ref<Record<string, CharacterState>>
  worldData: Ref<WorldData>
  itemOccupancy: Ref<ItemOccupancy>
  activityLog: Ref<ActivityLogEntry[]>
  executeAction: (characterId: string, intent: Intent) => Promise<void>
}

/**
 * Execute a single tick of the simulation
 * Processes all three phases: Decay, Decision Making, and Execution
 *
 * @param params - Object containing Vue refs and functions
 */
export async function executeTick({
  currentTick,
  characterStates,
  worldData,
  itemOccupancy,
  activityLog,
  executeAction
}: ExecuteTickParams): Promise<void> {
  currentTick.value++

  console.log(`\n========== TICK ${currentTick.value} ==========`)

  // Phase 1: Decay all needs and cooldowns
  for (const characterId in characterStates.value) {
    const state = characterStates.value[characterId]

    // Decay needs using constants from config
    state.needs.food = Math.max(0, state.needs.food - NEED_DECAY_RATES.food)
    state.needs.sleep = Math.max(0, state.needs.sleep - NEED_DECAY_RATES.sleep)
    state.needs.health = Math.max(0, state.needs.health - NEED_DECAY_RATES.health)
    state.needs.friends = Math.max(0, state.needs.friends - NEED_DECAY_RATES.friends)
    state.needs.family = Math.max(0, state.needs.family - NEED_DECAY_RATES.family)
    state.needs.romance = Math.max(0, state.needs.romance - NEED_DECAY_RATES.romance)
    state.needs.fulfillment = Math.max(0, state.needs.fulfillment - NEED_DECAY_RATES.fulfillment)

    // Decrement cooldowns
    for (const action in state.cooldowns) {
      const actionKey = action as ActionName
      if (state.cooldowns[actionKey] > 0) {
        state.cooldowns[actionKey]--
      }
    }
  }

  // Phase 2: Decision Making
  console.log('\n--- Phase 2: Decision Making ---')
  const intents: Record<string, Intent> = {}
  for (const characterId in characterStates.value) {
    // Select the best intent for this character (pass itemOccupancy to check slot availability)
    const intent = selectBestIntent(characterId, characterStates.value[characterId], worldData.value, itemOccupancy.value)
    intents[characterId] = intent

    // Log the intent
    if (intent.action === 'idle') {
      console.log(`  ${characterId}: intends to idle (no satisfying actions)`)
    } else {
      console.log(`  ${characterId}: intends to ${intent.action} at ${intent.itemName} (${intent.targetSpaceName}, ${intent.targetLotName}) - utility: ${intent.utility.toFixed(2)}`)
    }
  }

  // Phase 3: Execution (sequential to avoid race conditions with item slots)
  console.log('\n--- Phase 3: Execution ---')
  for (const characterId in intents) {
    await executeAction(characterId, intents[characterId])
  }

  // Log full state to console for debugging
  console.log('Character States:', JSON.parse(JSON.stringify(characterStates.value)))
  console.log('Activity Log:', activityLog.value.slice(-10))
}
