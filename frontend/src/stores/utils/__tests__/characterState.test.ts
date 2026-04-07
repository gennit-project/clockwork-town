import { describe, expect, it } from 'vitest'
import {
  appendShortTermMemory,
  createActivityLogEntry,
  createCharacterState,
  enqueueManualIntent,
  updateStateLocation
} from '../characterState'
import type { Intent } from '../../types'

describe('characterState utilities', () => {
  it('creates default character state', () => {
    const state = createCharacterState({
      id: 'char-1',
      name: 'Alice',
      traits: ['curious']
    })

    expect(state.name).toBe('Alice')
    expect(state.currentAction).toBe('idle')
    expect(state.location.lotId).toBeNull()
    expect(state.traits).toEqual(['curious'])
    expect(state.queuedActions).toEqual([])
    expect(state.longTermMemories).toEqual([])
    expect(state.currentTask).toBeNull()
    expect(state.accessibleLotIds).toEqual([])
    expect(state.workSchedule).toEqual([])
  })

  it('updates location and enqueues manual intents', () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    const intent: Intent = {
      action: 'sleep',
      itemId: 'bed-1',
      itemName: 'Bed',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Bedroom',
      utility: 3
    }

    updateStateLocation(state, {
      regionId: 'region-1',
      lotId: 'lot-1',
      lotName: 'Home',
      spaceId: 'space-1',
      spaceName: 'Bedroom'
    })
    enqueueManualIntent(state, intent)

    expect(state.location.spaceName).toBe('Bedroom')
    expect(state.queuedActions).toHaveLength(1)
    expect(state.queuedActions?.[0]?.source).toBe('manual')
  })

  it('appends short-term memories and trims to the latest 20', () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })

    for (let index = 1; index <= 21; index += 1) {
      appendShortTermMemory(state, index, {
        action: 'read',
        itemName: `Book ${index}`,
        targetLotName: 'Library',
        targetSpaceName: 'Stacks',
        utility: index
      } as Intent)
    }

    expect(state.memories).toHaveLength(20)
    expect(state.memories?.[0]?.tick).toBe(2)
    expect(state.memories?.at(-1)?.item).toBe('Book 21')
  })

  it('creates activity log entries with the provided metadata', () => {
    const entry = createActivityLogEntry(12, 'char-1', 'sleep', 'using Bed')

    expect(entry.tick).toBe(12)
    expect(entry.characterId).toBe('char-1')
    expect(entry.action).toBe('sleep')
    expect(entry.details).toBe('using Bed')
    expect(entry.timestamp).toMatch(/T/)
  })
})
