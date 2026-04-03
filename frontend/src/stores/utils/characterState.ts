import type { ActivityLogEntry, CharacterLocation, CharacterState, Intent, Memory } from '../types'
import { INITIAL_COOLDOWNS, INITIAL_NEEDS } from '../config/needs'

const MAX_SHORT_TERM_MEMORIES = 20

export function createCharacterState(character: { id: string; name: string; traits?: string[] }): CharacterState {
  return {
    name: character.name || 'Unknown',
    needs: { ...INITIAL_NEEDS },
    cooldowns: { ...INITIAL_COOLDOWNS },
    currentAction: 'idle',
    location: createEmptyLocation(),
    traits: character.traits || [],
    queuedActions: [],
    currentTask: null,
    longTermMemories: []
  }
}

export function createEmptyLocation(): CharacterLocation {
  return {
    regionId: null,
    lotId: null,
    lotName: null,
    spaceId: null,
    spaceName: null
  }
}

export function updateStateLocation(
  state: CharacterState,
  location: CharacterLocation
): CharacterState {
  state.location = location
  return state
}

export function enqueueManualIntent(state: CharacterState, intent: Intent): CharacterState {
  if (!state.queuedActions) {
    state.queuedActions = []
  }

  state.queuedActions.push({
    ...intent,
    source: 'manual'
  })

  return state
}

export function appendShortTermMemory(
  state: CharacterState,
  tick: number,
  intent: Intent
): CharacterState {
  const memory: Memory = {
    tick,
    action: intent.action,
    item: intent.itemName || intent.socialTargetName || 'unknown',
    location: `${intent.targetSpaceName || 'unknown'} (${intent.targetLotName || 'unknown'})`,
    utility: intent.utility
  }

  if (!state.memories) {
    state.memories = []
  }

  state.memories.push(memory)

  if (state.memories.length > MAX_SHORT_TERM_MEMORIES) {
    state.memories = state.memories.slice(-MAX_SHORT_TERM_MEMORIES)
  }

  return state
}

export function createActivityLogEntry(
  tick: number,
  characterId: string,
  action: string,
  details: string
): ActivityLogEntry {
  return {
    tick,
    timestamp: new Date().toISOString(),
    characterId,
    action,
    details
  }
}
