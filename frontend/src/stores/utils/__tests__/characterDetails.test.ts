import { describe, expect, it, vi } from 'vitest'
import { createCharacterState } from '../characterState'
import {
  addLongTermMemory,
  editLongTermMemory,
  refreshCharacterDetails,
  removeLongTermMemory,
  saveCharacterBio
} from '../characterDetails'

describe('characterDetails utilities', () => {
  it('refreshes long-term memories into the character state', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    const fetchCharacterDetails = vi.fn().mockResolvedValue({
      character: {
        longTermMemories: [{ id: 'mem-1', content: 'Remember', createdAt: '2026-01-01' }],
        relationships: [{
          id: 'rel-1',
          fromCharacterId: 'char-1',
          toCharacterId: 'char-2',
          shortTermScore: 3,
          longTermScore: 7,
          labels: ['friend'],
          lastSeenAt: '2026-01-01T10:00:00.000Z',
          lastSpokeAt: '2026-01-01T11:00:00.000Z',
          isDeceasedTarget: false
        }]
      }
    })

    await refreshCharacterDetails(state, 'char-1', { fetchCharacterDetails })

    expect(fetchCharacterDetails).toHaveBeenCalledWith('char-1')
    expect(state.longTermMemories).toEqual([{ id: 'mem-1', content: 'Remember', createdAt: '2026-01-01' }])
    expect(state.relationships?.[0]?.id).toBe('rel-1')
  })

  it('persists bio updates', async () => {
    const persistCharacterBio = vi.fn().mockResolvedValue(undefined)

    await saveCharacterBio('char-1', 'New bio', { persistCharacterBio })

    expect(persistCharacterBio).toHaveBeenCalledWith('char-1', 'New bio')
  })

  it('creates a memory and refreshes character details', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    const createCharacterLongTermMemory = vi.fn().mockResolvedValue(undefined)
    const fetchCharacterDetails = vi.fn().mockResolvedValue({
      character: {
        longTermMemories: [{ id: 'mem-1', content: 'Created', createdAt: '2026-01-01' }]
      }
    })

    await addLongTermMemory(state, 'char-1', 'Created', {
      createCharacterLongTermMemory,
      fetchCharacterDetails
    })

    expect(createCharacterLongTermMemory).toHaveBeenCalledWith('char-1', 'Created')
    expect(fetchCharacterDetails).toHaveBeenCalledWith('char-1')
    expect(state.longTermMemories?.[0]?.content).toBe('Created')
  })

  it('updates and deletes memories with a refresh', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    const updateCharacterLongTermMemory = vi.fn().mockResolvedValue(undefined)
    const deleteCharacterLongTermMemory = vi.fn().mockResolvedValue(undefined)
    const fetchCharacterDetails = vi
      .fn()
      .mockResolvedValueOnce({
        character: {
          longTermMemories: [{ id: 'mem-1', content: 'Updated', createdAt: '2026-01-01' }]
        }
      })
      .mockResolvedValueOnce({
        character: {
          longTermMemories: []
        }
      })

    await editLongTermMemory(state, 'char-1', 'mem-1', 'Updated', {
      updateCharacterLongTermMemory,
      fetchCharacterDetails
    })
    await removeLongTermMemory(state, 'char-1', 'mem-1', {
      deleteCharacterLongTermMemory,
      fetchCharacterDetails
    })

    expect(updateCharacterLongTermMemory).toHaveBeenCalledWith('mem-1', 'Updated')
    expect(deleteCharacterLongTermMemory).toHaveBeenCalledWith('mem-1')
    expect(state.longTermMemories).toEqual([])
  })
})
