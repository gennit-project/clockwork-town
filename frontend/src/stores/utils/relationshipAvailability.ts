import { getCharacterStatusText } from '../../composables/useCharacterStatus'
import type { ActionName, CharacterRelationship, CharacterState } from '../types'

export interface RelationshipAvailabilityResult {
  canText: boolean
  canCall: boolean
  canInviteOver: boolean
  summary: string
}

function isSleepingOrWorking(state: CharacterState): boolean {
  return state.currentAction === 'sleep' || state.currentAction === 'work'
}

function isBusy(state: CharacterState): boolean {
  return Boolean(state.currentTask) || isSleepingOrWorking(state)
}

export function evaluateRelationshipAvailability({
  relationship,
  targetState
}: {
  relationship: CharacterRelationship | null
  targetState: CharacterState | null
}): RelationshipAvailabilityResult {
  if (relationship?.isDeceasedTarget) {
    return {
      canText: false,
      canCall: false,
      canInviteOver: false,
      summary: 'Unavailable (deceased)'
    }
  }

  if (!targetState) {
    return {
      canText: false,
      canCall: false,
      canInviteOver: false,
      summary: relationship ? 'Unavailable (not loaded in simulation)' : 'Unknown'
    }
  }

  if (isBusy(targetState)) {
    return {
      canText: true,
      canCall: !isSleepingOrWorking(targetState),
      canInviteOver: false,
      summary: `Busy: ${getCharacterStatusText(targetState)}`
    }
  }

  return {
    canText: true,
    canCall: true,
    canInviteOver: true,
    summary: `Available: ${getCharacterStatusText(targetState)}`
  }
}

export function canQueueRelationshipAction({
  action,
  availability
}: {
  action: Extract<ActionName, 'text_romance' | 'call_romance' | 'invite_over'>
  availability: RelationshipAvailabilityResult
}): boolean {
  if (action === 'text_romance') {
    return availability.canText
  }

  if (action === 'call_romance') {
    return availability.canCall
  }

  return availability.canInviteOver
}
