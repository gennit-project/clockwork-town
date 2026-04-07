/**
 * Tick execution logic for the simulation
 */

import type { Ref } from 'vue'
import type {
  ActionName,
  CharacterState,
  WorldData,
  ItemOccupancy,
  Intent,
  ActivityLogEntry,
  SimulationDateTime
} from '../types'
import { NEED_DECAY_RATES } from '../config/needs'
import { selectBestIntent } from './decisionMaking'
import { debugLog } from './simulationDebug'
import { advanceSimulationDateTime } from './simulationCalendar'

const MULTI_PARTICIPANT_ACTIONS = new Set<ActionName>(['chat_friend', 'date'])

function calculateTravelCostToIntentTarget({
  characterState,
  intent,
  worldData
}: {
  characterState: CharacterState
  intent: Intent
  worldData: WorldData
}): number | null {
  if (intent.targetSpaceId && intent.targetSpaceId === characterState.location.spaceId) {
    return 0
  }

  if (intent.targetLotId && intent.targetLotId === characterState.location.lotId) {
    return 1
  }

  if (intent.targetLotId) {
    const targetLot = worldData.lots[intent.targetLotId]
    if (targetLot && targetLot.regionId === characterState.location.regionId) {
      return 2
    }
  }

  return null
}

function buildSocialParticipationIntent({
  initiatorId,
  initiatorState,
  participantState,
  intent,
  worldData
}: {
  initiatorId: string
  initiatorState: CharacterState
  participantState: CharacterState
  intent: Intent
  worldData: WorldData
}): Intent | null {
  const travelCost = calculateTravelCostToIntentTarget({
    characterState: participantState,
    intent,
    worldData
  })
  if (travelCost === null) {
    return null
  }

  return {
    ...intent,
    utility: 0,
    source: 'manual',
    travelCost,
    socialTargetId: initiatorId,
    socialTargetName: initiatorState.name,
    steps: intent.steps?.map((step) => ({
      ...step,
      socialTargetId: initiatorId,
      socialTargetName: initiatorState.name
    }))
  }
}

function assignSocialParticipation({
  characterId,
  state,
  intent,
  intents,
  reservedCharacterIds,
  characterStates,
  worldData
}: {
  characterId: string
  state: CharacterState
  intent: Intent
  intents: Record<string, Intent>
  reservedCharacterIds: Set<string>
  characterStates: Record<string, CharacterState>
  worldData: WorldData
}): boolean {
  if (!MULTI_PARTICIPANT_ACTIONS.has(intent.action)) {
    return true
  }

  if (!intent.socialTargetId || reservedCharacterIds.has(intent.socialTargetId)) {
    return false
  }

  const participantState = characterStates[intent.socialTargetId]
  if (!participantState) {
    return false
  }

  const participantIntent = buildSocialParticipationIntent({
    initiatorId: characterId,
    initiatorState: state,
    participantState,
    intent,
    worldData
  })
  if (!participantIntent) {
    return false
  }

  intents[intent.socialTargetId] = participantIntent
  reservedCharacterIds.add(characterId)
  reservedCharacterIds.add(intent.socialTargetId)
  return true
}

/**
 * Parameters for executeTick function
 */
export interface ExecuteTickParams {
  currentTick: Ref<number>
  simulationDateTime?: Ref<SimulationDateTime>
  characterStates: Ref<Record<string, CharacterState>>
  worldData: Ref<WorldData>
  itemOccupancy: Ref<ItemOccupancy>
  activityLog: Ref<ActivityLogEntry[]>
  executeAction: (characterId: string, intent: Intent) => Promise<void>
  progressTask?: (characterId: string) => Promise<boolean>
}

/**
 * Execute a single tick of the simulation
 * Processes all three phases: Decay, Decision Making, and Execution
 *
 * @param params - Object containing Vue refs and functions
 */
export async function executeTick({
  currentTick,
  simulationDateTime,
  characterStates,
  worldData,
  itemOccupancy,
  activityLog,
  executeAction,
  progressTask
}: ExecuteTickParams): Promise<void> {
  currentTick.value++
  if (simulationDateTime) {
    simulationDateTime.value = advanceSimulationDateTime(simulationDateTime.value)
  }

  debugLog(`\n========== TICK ${currentTick.value} ==========`)

  // Phase 1: Decay all needs and cooldowns
  for (const characterId in characterStates.value) {
    const state = characterStates.value[characterId]

    // Decay needs using constants from config
    state.needs.food = Math.max(0, state.needs.food - NEED_DECAY_RATES.food)
    state.needs.sleep = Math.max(0, state.needs.sleep - NEED_DECAY_RATES.sleep)
    state.needs.bladder = Math.max(0, state.needs.bladder - NEED_DECAY_RATES.bladder)
    state.needs.hygiene = Math.max(0, state.needs.hygiene - NEED_DECAY_RATES.hygiene)
    state.needs.health = Math.max(0, state.needs.health - NEED_DECAY_RATES.health)
    state.needs.friends = Math.max(0, state.needs.friends - NEED_DECAY_RATES.friends)
    state.needs.family = Math.max(0, state.needs.family - NEED_DECAY_RATES.family)
    state.needs.romance = Math.max(0, state.needs.romance - NEED_DECAY_RATES.romance)
    state.needs.fulfillment = Math.max(0, state.needs.fulfillment - NEED_DECAY_RATES.fulfillment)

    // Decrement cooldowns
    for (const action in state.cooldowns) {
      const actionKey = action as keyof typeof state.cooldowns
      if (state.cooldowns[actionKey] > 0) {
        state.cooldowns[actionKey]--
      }
    }
  }

  // Phase 2: Decision Making
  debugLog('\n--- Phase 2: Decision Making ---')
  const intents: Record<string, Intent> = {}
  const reservedCharacterIds = new Set<string>()
  for (const characterId in characterStates.value) {
    if (intents[characterId]) {
      continue
    }

    const state = characterStates.value[characterId]

    if (state.currentTask && progressTask) {
      const consumedTick = await progressTask(characterId)
      if (consumedTick) {
        continue
      }
    }

    if (state.queuedActions && state.queuedActions.length > 0) {
      const queuedIntent = state.queuedActions.shift() as Intent
      intents[characterId] = assignSocialParticipation({
        characterId,
        state,
        intent: queuedIntent,
        intents,
        reservedCharacterIds,
        characterStates: characterStates.value,
        worldData: worldData.value
      })
        ? queuedIntent
        : {
            action: 'idle',
            utility: 0,
            source: 'manual'
          }
      continue
    }

    // Select the best intent for this character (pass itemOccupancy to check slot availability)
    const intent = selectBestIntent({
      characterId,
      characterState: state,
      worldData: worldData.value,
      itemOccupancy: itemOccupancy.value,
      simulationDateTime: simulationDateTime?.value,
      characterStates: characterStates.value,
      reservedCharacterIds: [...reservedCharacterIds]
    })
    intents[characterId] = intent

    assignSocialParticipation({
      characterId,
      state,
      intent,
      intents,
      reservedCharacterIds,
      characterStates: characterStates.value,
      worldData: worldData.value
    })

    // Log the intent
    if (intent.action === 'idle') {
      debugLog(`  ${characterId}: intends to idle (no satisfying actions)`)
    } else {
      debugLog(`  ${characterId}: intends to ${intent.action} at ${intent.itemName} (${intent.targetSpaceName}, ${intent.targetLotName}) - utility: ${intent.utility.toFixed(2)}`)
    }
  }

  // Phase 3: Execution (sequential to avoid race conditions with item slots)
  debugLog('\n--- Phase 3: Execution ---')
  for (const characterId in intents) {
    await executeAction(characterId, intents[characterId])
  }

  // Log full state to console for debugging
  debugLog('Character States:', JSON.parse(JSON.stringify(characterStates.value)))
  debugLog('Activity Log:', activityLog.value.slice(-10))
}
