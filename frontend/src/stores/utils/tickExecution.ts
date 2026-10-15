/**
 * Tick execution logic for the simulation
 */

import type { Ref } from 'vue'
import type {
  AnimalState,
  CharacterState,
  NeedName,
  WorldData,
  ItemOccupancy,
  Intent,
  ActivityLogEntry,
  Cause,
  SimulationDateTime,
  SocialInvitation
} from '../types'
import { NEED_DECAY_RATES } from '../config/needs'
import { effectiveDecayRate, isActionDisabled, pinDisabledNeeds } from './traitEffects'
import { tickValues, valueNeglectDrain } from './valueEffects'
import { backOffInvitation, MAX_INVITE_ATTEMPTS_PER_TICK, tickInviteBackoff } from './inviteBackoff'
import { isGroupCapableAction, requiresInvitation } from './groupSocial'
import { tickWitnessState } from './witnessReactions'
import { selectBestIntent } from './decisionMaking'
import { debugLog } from './simulationDebug'
import { advanceSimulationDateTime } from './simulationCalendar'
import { createActivityLogEntry } from './characterState'
import { buildDeclineCause, buildIdleCause } from './causes'
import type { DeclineCauseInput, DeclineReason } from './causes'
import { calculateUtility } from './actionUtility'
import { evaluateRelationshipAvailability } from './relationshipAvailability'


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
  if (intent.action === 'propose_relationship') {
    return {
      ...intent,
      strategy: 'propose_relationship:response',
      utility: 0,
      source: 'manual',
      travelCost: 0,
      socialTargetId: initiatorId,
      socialTargetName: initiatorState.name,
      isSocialParticipant: true
    }
  }

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
    strategy: intent.action === 'invite_over' ? 'invite_over:arrival' : intent.strategy,
    utility: 0,
    source: 'manual',
    travelCost,
    socialTargetId: initiatorId,
    socialTargetName: initiatorState.name,
    isSocialParticipant: true,
    groupTargetIds: undefined,
    groupTargetNames: undefined,
    hostedFollowUp: intent.hostedFollowUp
      ? {
          ...intent.hostedFollowUp,
          socialTargetId: initiatorId,
          socialTargetName: initiatorState.name
        }
      : undefined,
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
    action: intent.action as SocialInvitation['action'],
    inviteContextType: intent.inviteContextType,
    proposedRelationshipLabel: intent.proposedRelationshipLabel,
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
  details,
  cause
}: {
  activityLog: Ref<ActivityLogEntry[]>
  currentTick: number
  characterId: string
  action: string
  details: string
  cause?: Cause
}): void {
  activityLog.value.push(createActivityLogEntry(currentTick, characterId, action, details, cause))
}

function updateSocialInvitationStatus({
  invitation,
  initiatorState,
  participantState,
  status,
  reason,
  cause
}: {
  invitation: SocialInvitation
  initiatorState: CharacterState
  participantState: CharacterState
  status: SocialInvitation['status']
  reason?: string
  cause?: Cause
}): void {
  const nextInvitation = { ...invitation, status, reason, cause }

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
  if (intent.action === 'invite_over' || intent.action === 'propose_relationship') {
    return calculateUtility(participantState.name, intent.action, participantState.needs, {
      itemId: intent.action,
      itemName: intent.proposedRelationshipLabel || intent.socialTargetName || 'Invitation',
      spaceId: participantState.location.spaceId || 'unknown-space',
      spaceName: participantState.location.spaceName || 'Unknown space',
      lotId: participantState.location.lotId || 'unknown-lot',
      lotName: participantState.location.lotName || 'Unknown lot',
      travelCost: 0,
      affordanceWeight: 1
    })
  }

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
}): { accepted: boolean; reason?: string; cause?: Cause } {
  const decline = (reason: DeclineReason, extra: Partial<DeclineCauseInput> = {}) => ({
    accepted: false as const,
    cause: buildDeclineCause({ reason, declinerName: participantState.name, action: intent.action, ...extra })
  })

  if (isActionDisabled(intent.action, participantState.traitIds)) {
    return {
      ...decline('trait_disabled'),
      reason: `${participantState.name} isn't interested in ${intent.action}`
    }
  }

  const invitationUtility = calculateInvitationUtility({
    participantState,
    intent,
    worldData
  })
  if (invitationUtility === null) {
    return { ...decline('unreachable'), reason: 'Could not reach the meeting place' }
  }

  if (intent.action === 'invite_over') {
    const availability = evaluateRelationshipAvailability({
      relationship: null,
      targetState: participantState
    })
    if (!availability.canInviteOver) {
      return {
        ...decline('unavailable', { availabilitySummary: availability.summary }),
        reason: availability.summary
      }
    }

    return { accepted: true }
  }

  if (intent.action === 'propose_relationship') {
    const availability = evaluateRelationshipAvailability({
      relationship: null,
      targetState: participantState
    })
    if (!availability.canCall) {
      return {
        ...decline('unavailable', { availabilitySummary: availability.summary }),
        reason: availability.summary
      }
    }

    return { accepted: true }
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
      ...decline('prefers_other', {
        competingAction: competingIntent.action,
        competingUtility: competingIntent.utility,
        invitationUtility,
        declinerNeeds: participantState.needs
      }),
      reason: `${participantState.name} preferred ${competingIntent.action}`
    }
  }

  return { accepted: true }
}

interface SocialParticipationParams {
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
}

/**
 * Coordinate a social intent. The primary partner is invited first; if they accept and the
 * intent is a group chat, the extras are invited too and the group forms with whoever
 * accepts. Only a chat can ever be a group: a date is always exactly one other person.
 */
function assignSocialParticipation(params: SocialParticipationParams): boolean {
  const { intent, state, intents, reservedCharacterIds, characterStates } = params

  if (!inviteParticipant(params)) {
    return false
  }
  if (!requiresInvitation(intent) || !intent.socialTargetId) {
    return true
  }

  if (!isGroupCapableAction(intent.action) || !intent.groupTargetIds?.length) {
    intent.groupTargetIds = undefined
    intent.groupTargetNames = undefined
    return true
  }

  const acceptedIds: string[] = []
  const acceptedNames: string[] = []
  for (const extraId of intent.groupTargetIds) {
    const extraState = characterStates[extraId]
    // Someone already taken by another group this tick was busy, not unwilling: skip, don't back off.
    if (!extraState || reservedCharacterIds.has(extraId)) {
      continue
    }
    const extraIntent: Intent = {
      ...intent,
      socialTargetId: extraId,
      socialTargetName: extraState.name,
      groupTargetIds: undefined,
      groupTargetNames: undefined
    }
    if (inviteParticipant({ ...params, intent: extraIntent })) {
      acceptedIds.push(extraId)
      acceptedNames.push(extraState.name)
    } else {
      backOffInvitation(state, intent.action, extraId)
    }
  }

  intent.groupTargetIds = acceptedIds.length > 0 ? acceptedIds : undefined
  intent.groupTargetNames = acceptedNames.length > 0 ? acceptedNames : undefined

  // Let everyone in the group know who else is there (for status text).
  const everyone = [intent.socialTargetId, ...acceptedIds]
  for (const participantId of everyone) {
    const participantIntent = intents[participantId]
    if (!participantIntent) continue
    const others = everyone.filter((id) => id !== participantId)
    participantIntent.groupTargetIds = others.length > 0 ? others : undefined
    participantIntent.groupTargetNames = others.length > 0 ? others.map((id) => characterStates[id]?.name ?? id) : undefined
  }
  return true
}

function inviteParticipant({
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
}: SocialParticipationParams): boolean {
  if (!requiresInvitation(intent)) {
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
      reason: invitationDecision.reason,
      cause: invitationDecision.cause
    })
    appendActivityLogEntry({
      activityLog,
      currentTick,
      characterId: intent.socialTargetId,
      action: 'reject_invite',
      details: invitationDecision.reason || `${participantState.name} rejected ${intent.action}`,
      cause: invitationDecision.cause
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
      reason: 'Could not coordinate arrival',
      cause: buildDeclineCause({
        reason: 'cannot_coordinate',
        declinerName: participantState.name,
        action: intent.action
      })
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
  animalStates?: Ref<Record<string, AnimalState>>
  executeAction: (characterId: string, intent: Intent) => Promise<void>
  decayRelationships?: (params: { characterState: CharacterState }) => Promise<void>
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
  animalStates,
  executeAction,
  decayRelationships,
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

    if (decayRelationships) {
      await decayRelationships({ characterState: state })
    }

    // Decay needs using config rates, adjusted per character by their traits
    for (const need of Object.keys(NEED_DECAY_RATES) as NeedName[]) {
      state.needs[need] = Math.max(0, state.needs[need] - effectiveDecayRate(need, state.traitIds))
    }
    pinDisabledNeeds(state.needs, state.traitIds)

    // Values age every tick; neglected ones drag fulfillment down
    tickValues(state)
    state.needs.fulfillment = Math.max(0, state.needs.fulfillment - valueNeglectDrain(state))

    tickInviteBackoff(state)
    tickWitnessState(state)

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
  // Animals claimed by a petter this tick, so two people don't pet the same one.
  const claimedAnimalIds = new Set<string>()
  const claimAnimalTarget = (intent: Intent): void => {
    if (intent.action === 'pet_animal' && intent.animalTargetId) {
      claimedAnimalIds.add(intent.animalTargetId)
    }
  }
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
      claimAnimalTarget(queuedIntent)
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

    // Select the best intent for this character (pass itemOccupancy to check slot availability).
    // If the best intent is an invitation that gets turned down, back off from that target and
    // fall through to the next-best option instead of idling (and repeating it next tick).
    let intent: Intent
    let socialParticipationAssigned: boolean
    let attempts = 0
    const declines: { name: string; action: string; reason: string }[] = []
    do {
      intent = selectBestIntent({
        characterId,
        characterState: state,
        worldData: worldData.value,
        itemOccupancy: itemOccupancy.value,
        simulationDateTime: simulationDateTime?.value,
        characterStates: characterStates.value,
        reservedCharacterIds: [...reservedCharacterIds],
        animalStates: animalStates?.value,
        reservedAnimalIds: [...claimedAnimalIds]
      })

      socialParticipationAssigned = assignSocialParticipation({
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

      const rejectedInvitation =
        !socialParticipationAssigned && requiresInvitation(intent) && !!intent.socialTargetId
      if (!rejectedInvitation) {
        break
      }
      const declined = state.outgoingSocialInvitations.find(
        (entry) => entry.status === 'rejected' && entry.toCharacterId === intent.socialTargetId && entry.createdAtTick === currentTick.value
      )
      declines.push({
        name: intent.socialTargetName ?? (intent.socialTargetId as string),
        action: intent.action,
        reason: declined?.cause?.summary ?? declined?.reason ?? 'declined'
      })
      backOffInvitation(state, intent.action, intent.socialTargetId as string)
      attempts++
    } while (attempts < MAX_INVITE_ATTEMPTS_PER_TICK)

    intents[characterId] = intent
    claimAnimalTarget(intent)
    if (!socialParticipationAssigned && requiresInvitation(intent)) {
      intents[characterId] = {
        action: 'idle',
        utility: 0
      }
    }
    if (intents[characterId].action === 'idle' && declines.length > 0) {
      intents[characterId] = {
        ...intents[characterId],
        cause: buildIdleCause({
          characterName: state.name,
          declines
        })
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
