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
  SimulationDateTime,
  SocialInvitation
} from '../types'
import { NEED_DECAY_RATES } from '../config/needs'
import { selectBestIntent } from './decisionMaking'
import { debugLog } from './simulationDebug'
import { advanceSimulationDateTime } from './simulationCalendar'
import { createActivityLogEntry } from './characterState'
import { calculateUtility } from './actionUtility'

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

function buildSocialInvitation({
  currentTick,
  characterId,
  state,
  intent,
  participantState
}: {
  currentTick: number
  characterId: string
  state: CharacterState
  intent: Intent
  participantState: CharacterState
}): SocialInvitation {
  return {
    id: crypto.randomUUID(),
    action: intent.action as Extract<ActionName, 'chat_friend' | 'date'>,
    fromCharacterId: characterId,
    fromCharacterName: state.name,
    toCharacterId: intent.socialTargetId as string,
    toCharacterName: participantState.name,
    itemId: intent.itemId,
    itemName: intent.itemName,
    targetSpaceId: intent.targetSpaceId,
    targetSpaceName: intent.targetSpaceName,
    targetLotId: intent.targetLotId,
    targetLotName: intent.targetLotName,
    createdAtTick: currentTick,
    status: 'pending'
  }
}

function appendActivityLogEntry({
  activityLog,
  currentTick,
  characterId,
  action,
  details
}: {
  activityLog: Ref<ActivityLogEntry[]>
  currentTick: number
  characterId: string
  action: string
  details: string
}): void {
  activityLog.value.push(createActivityLogEntry(currentTick, characterId, action, details))
}

function updateSocialInvitationStatus({
  invitation,
  initiatorState,
  participantState,
  status,
  reason
}: {
  invitation: SocialInvitation
  initiatorState: CharacterState
  participantState: CharacterState
  status: SocialInvitation['status']
  reason?: string
}): void {
  const nextInvitation = { ...invitation, status, reason }

  initiatorState.outgoingSocialInvitations = initiatorState.outgoingSocialInvitations.map((entry) =>
    entry.id === invitation.id ? nextInvitation : entry
  )
  participantState.incomingSocialInvitations = participantState.incomingSocialInvitations.map((entry) =>
    entry.id === invitation.id ? nextInvitation : entry
  )
}

function calculateInvitationUtility({
  participantState,
  intent,
  worldData
}: {
  participantState: CharacterState
  intent: Intent
  worldData: WorldData
}): number | null {
  const travelCost = calculateTravelCostToIntentTarget({
    characterState: participantState,
    intent,
    worldData
  })
  if (travelCost === null) {
    return null
  }

  return calculateUtility(participantState.name, intent.action, participantState.needs, {
    itemId: intent.itemId || 'social-target',
    itemName: intent.itemName || intent.socialTargetName || 'Social target',
    spaceId: intent.targetSpaceId || participantState.location.spaceId || 'unknown-space',
    spaceName: intent.targetSpaceName || participantState.location.spaceName || 'Unknown space',
    lotId: intent.targetLotId || participantState.location.lotId || 'unknown-lot',
    lotName: intent.targetLotName || participantState.location.lotName || 'Unknown lot',
    travelCost,
    affordanceWeight: intent.itemId
      ? worldData.items[intent.itemId]?.affordances.find((entry) => entry.action === intent.action)?.weight ?? 1
      : 1
  })
}

function evaluateInvitationAcceptance({
  characterId,
  participantState,
  intent,
  characterStates,
  worldData,
  itemOccupancy,
  simulationDateTime,
  reservedCharacterIds
}: {
  characterId: string
  participantState: CharacterState
  intent: Intent
  characterStates: Record<string, CharacterState>
  worldData: WorldData
  itemOccupancy: ItemOccupancy
  simulationDateTime?: SimulationDateTime
  reservedCharacterIds: Set<string>
}): { accepted: boolean; reason?: string } {
  const invitationUtility = calculateInvitationUtility({
    participantState,
    intent,
    worldData
  })
  if (invitationUtility === null) {
    return { accepted: false, reason: 'Could not reach the meeting place' }
  }

  const competingIntent = selectBestIntent({
    characterId: intent.socialTargetId as string,
    characterState: participantState,
    worldData,
    itemOccupancy,
    simulationDateTime,
    characterStates,
    reservedCharacterIds: [...reservedCharacterIds, characterId]
  })

  if (competingIntent.utility > invitationUtility && competingIntent.action !== intent.action) {
    return {
      accepted: false,
      reason: `${participantState.name} preferred ${competingIntent.action}`
    }
  }

  return { accepted: true }
}

function assignSocialParticipation({
  currentTick,
  characterId,
  state,
  intent,
  intents,
  reservedCharacterIds,
  characterStates,
  worldData,
  itemOccupancy,
  simulationDateTime,
  activityLog
}: {
  currentTick: number
  characterId: string
  state: CharacterState
  intent: Intent
  intents: Record<string, Intent>
  reservedCharacterIds: Set<string>
  characterStates: Record<string, CharacterState>
  worldData: WorldData
  itemOccupancy: ItemOccupancy
  simulationDateTime?: SimulationDateTime
  activityLog: Ref<ActivityLogEntry[]>
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

  const invitation = buildSocialInvitation({
    currentTick,
    characterId,
    state,
    intent,
    participantState
  })
  state.outgoingSocialInvitations = [...state.outgoingSocialInvitations, invitation]
  participantState.incomingSocialInvitations = [...participantState.incomingSocialInvitations, invitation]
  appendActivityLogEntry({
    activityLog,
    currentTick,
    characterId,
    action: 'invite',
    details: `${state.name} invited ${participantState.name} to ${intent.action}`
  })

  const invitationDecision = evaluateInvitationAcceptance({
    characterId,
    participantState,
    intent,
    characterStates,
    worldData,
    itemOccupancy,
    simulationDateTime,
    reservedCharacterIds
  })
  if (!invitationDecision.accepted) {
    updateSocialInvitationStatus({
      invitation,
      initiatorState: state,
      participantState,
      status: 'rejected',
      reason: invitationDecision.reason
    })
    appendActivityLogEntry({
      activityLog,
      currentTick,
      characterId: intent.socialTargetId,
      action: 'reject_invite',
      details: invitationDecision.reason || `${participantState.name} rejected ${intent.action}`
    })
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
    updateSocialInvitationStatus({
      invitation,
      initiatorState: state,
      participantState,
      status: 'rejected',
      reason: 'Could not coordinate arrival'
    })
    return false
  }

  updateSocialInvitationStatus({
    invitation,
    initiatorState: state,
    participantState,
    status: 'accepted'
  })
  intents[intent.socialTargetId] = participantIntent
  reservedCharacterIds.add(characterId)
  reservedCharacterIds.add(intent.socialTargetId)
  appendActivityLogEntry({
    activityLog,
    currentTick,
    characterId: intent.socialTargetId,
    action: 'accept_invite',
    details: `${participantState.name} accepted ${state.name}'s invitation to ${intent.action}`
  })
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
    state.incomingSocialInvitations = []
    state.outgoingSocialInvitations = []

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
        currentTick: currentTick.value,
        characterId,
        state,
        intent: queuedIntent,
        intents,
        reservedCharacterIds,
        characterStates: characterStates.value,
        worldData: worldData.value,
        itemOccupancy: itemOccupancy.value,
        simulationDateTime: simulationDateTime?.value,
        activityLog
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

    const socialParticipationAssigned = assignSocialParticipation({
      currentTick: currentTick.value,
      characterId,
      state,
      intent,
      intents,
      reservedCharacterIds,
      characterStates: characterStates.value,
      worldData: worldData.value,
      itemOccupancy: itemOccupancy.value,
      simulationDateTime: simulationDateTime?.value,
      activityLog
    })
    if (!socialParticipationAssigned && MULTI_PARTICIPANT_ACTIONS.has(intent.action)) {
      intents[characterId] = {
        action: 'idle',
        utility: 0
      }
    }

    // Log the intent
    if (intents[characterId].action === 'idle') {
      debugLog(`  ${characterId}: intends to idle (no satisfying actions)`)
    } else {
      debugLog(`  ${characterId}: intends to ${intents[characterId].action} at ${intents[characterId].itemName} (${intents[characterId].targetSpaceName}, ${intents[characterId].targetLotName}) - utility: ${intents[characterId].utility.toFixed(2)}`)
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
