import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSimulationStore } from '../simulation'
import { useCharacterPanelStore } from '../characterPanel'
import { createMockWorldData, mockConsole } from './mockData'

const persistenceMocks = vi.hoisted(() => ({
  moveCharacterToLot: vi.fn(async () => {}),
  startCharacterActivity: vi.fn(async () => {}),
  fetchCharacterDetails: vi.fn(async () => ({ character: { longTermMemories: [] } })),
  persistCharacterBio: vi.fn(async () => {}),
  createCharacterLongTermMemory: vi.fn(async () => {}),
  updateCharacterLongTermMemory: vi.fn(async () => {}),
  deleteCharacterLongTermMemory: vi.fn(async () => {})
}))

vi.mock('../simulationPersistence', () => persistenceMocks)

mockConsole()

describe('character panel store integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    persistenceMocks.fetchCharacterDetails.mockReset()
    persistenceMocks.persistCharacterBio.mockClear()
    persistenceMocks.createCharacterLongTermMemory.mockClear()
    persistenceMocks.updateCharacterLongTermMemory.mockClear()
    persistenceMocks.deleteCharacterLongTermMemory.mockClear()
    persistenceMocks.fetchCharacterDetails.mockResolvedValue({ character: { longTermMemories: [] } })
  })

  function setupStores() {
    const simulationStore = useSimulationStore()
    const characterPanelStore = useCharacterPanelStore()
    simulationStore.worldData = createMockWorldData()
    simulationStore.initializeCharacter({ id: 'char-1', name: 'Alice' })
    simulationStore.updateCharacterLocation('char-1', 'region-1', 'lot-1', 'Test House', 'space-1', 'Living Room')
    return { simulationStore, characterPanelStore }
  }

  it('tracks the active character and refreshes details', async () => {
    const { simulationStore, characterPanelStore } = setupStores()
    persistenceMocks.fetchCharacterDetails.mockResolvedValueOnce({
      character: {
        longTermMemories: [{ id: 'mem-1', content: 'Initial', createdAt: '2026-01-01' }]
      }
    })

    characterPanelStore.setActiveCharacter('char-1')
    await Promise.resolve()

    expect(characterPanelStore.activeCharacterId).toBe('char-1')
    expect(characterPanelStore.activeCharacterState?.name).toBe('Alice')
    expect(simulationStore.characterStates['char-1'].longTermMemories).toEqual([
      { id: 'mem-1', content: 'Initial', createdAt: '2026-01-01' }
    ])
  })

  it('refreshes character details after memory mutations and bio updates', async () => {
    const { simulationStore, characterPanelStore } = setupStores()
    persistenceMocks.fetchCharacterDetails
      .mockResolvedValueOnce({
        character: {
          longTermMemories: [{ id: 'mem-1', content: 'Initial', createdAt: '2026-01-01' }]
        }
      })
      .mockResolvedValueOnce({
        character: {
          longTermMemories: [{ id: 'mem-2', content: 'Created', createdAt: '2026-01-02' }]
        }
      })
      .mockResolvedValueOnce({
        character: {
          longTermMemories: [{ id: 'mem-2', content: 'Updated', createdAt: '2026-01-02' }]
        }
      })
      .mockResolvedValueOnce({
        character: {
          longTermMemories: []
        }
      })

    await characterPanelStore.loadCharacterDetails('char-1')
    expect(simulationStore.characterStates['char-1'].longTermMemories).toEqual([
      { id: 'mem-1', content: 'Initial', createdAt: '2026-01-01' }
    ])

    await characterPanelStore.updateCharacterBio('char-1', 'New bio')
    expect(persistenceMocks.persistCharacterBio).toHaveBeenCalledWith('char-1', 'New bio')

    await characterPanelStore.createLongTermMemory('char-1', 'Created')
    expect(persistenceMocks.createCharacterLongTermMemory).toHaveBeenCalledWith('char-1', 'Created')
    expect(simulationStore.characterStates['char-1'].longTermMemories).toEqual([
      { id: 'mem-2', content: 'Created', createdAt: '2026-01-02' }
    ])

    await characterPanelStore.updateLongTermMemory('char-1', 'mem-2', 'Updated')
    expect(persistenceMocks.updateCharacterLongTermMemory).toHaveBeenCalledWith('mem-2', 'Updated')
    expect(simulationStore.characterStates['char-1'].longTermMemories).toEqual([
      { id: 'mem-2', content: 'Updated', createdAt: '2026-01-02' }
    ])

    await characterPanelStore.deleteLongTermMemory('char-1', 'mem-2')
    expect(persistenceMocks.deleteCharacterLongTermMemory).toHaveBeenCalledWith('mem-2')
    expect(simulationStore.characterStates['char-1'].longTermMemories).toEqual([])
  })
})
