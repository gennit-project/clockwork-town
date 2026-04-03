import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSimulationStore } from '../simulation'
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

describe('simulation store integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    persistenceMocks.moveCharacterToLot.mockClear()
    persistenceMocks.startCharacterActivity.mockClear()
    persistenceMocks.fetchCharacterDetails.mockReset()
    persistenceMocks.persistCharacterBio.mockClear()
    persistenceMocks.createCharacterLongTermMemory.mockClear()
    persistenceMocks.updateCharacterLongTermMemory.mockClear()
    persistenceMocks.deleteCharacterLongTermMemory.mockClear()
    persistenceMocks.fetchCharacterDetails.mockResolvedValue({ character: { longTermMemories: [] } })
  })

  function setupStore() {
    const store = useSimulationStore()
    store.worldData = createMockWorldData()
    store.initializeCharacter({ id: 'char-1', name: 'Alice' })
    store.updateCharacterLocation('char-1', 'region-1', 'lot-1', 'Test House', 'space-1', 'Living Room')
    return store
  }

  it('processes queued manual intents through executeTick', async () => {
    const store = setupStore()

    store.enqueueIntent('char-1', {
      action: 'read',
      itemId: 'item-1',
      itemName: 'Couch',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })

    await store.executeTick()

    const state = store.characterStates['char-1']
    expect(state.queuedActions).toEqual([])
    expect(state.currentAction).toBe('read')
    expect(state.cooldowns.read).toBe(9)
    expect(state.memories?.at(-1)).toMatchObject({
      action: 'read',
      item: 'Couch'
    })
    expect(persistenceMocks.startCharacterActivity).toHaveBeenCalledWith('char-1', 'read')
  })

  it('progresses multi-tick actions across ticks until completion', async () => {
    const store = setupStore()

    store.enqueueIntent('char-1', {
      action: 'sleep',
      itemId: 'item-2',
      itemName: 'Bed',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })

    await store.executeTick()
    expect(store.characterStates['char-1'].currentTask).toMatchObject({
      action: 'sleep',
      remainingTicks: 2,
      totalTicks: 3
    })
    expect(store.getItemActiveUsers('item-2')).toEqual([{ id: 'char-1', name: 'Alice' }])

    await store.executeTick()
    expect(store.characterStates['char-1'].currentTask?.remainingTicks).toBe(1)
    expect(store.getItemActiveUsers('item-2')).toEqual([{ id: 'char-1', name: 'Alice' }])

    await store.executeTick()
    expect(store.characterStates['char-1'].currentTask).toBeNull()
    expect(store.characterStates['char-1'].currentAction).toBe('sleep')
    expect(store.characterStates['char-1'].cooldowns.sleep).toBe(12)
    expect(store.getItemActiveUsers('item-2')).toEqual([])
    expect(store.characterStates['char-1'].memories?.at(-1)).toMatchObject({
      action: 'sleep',
      item: 'Bed'
    })
  })

  it('keeps state consistent when backend activity start fails', async () => {
    const store = setupStore()
    persistenceMocks.startCharacterActivity.mockRejectedValueOnce(new Error('backend down'))

    store.enqueueIntent('char-1', {
      action: 'sleep',
      itemId: 'item-2',
      itemName: 'Bed',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })

    await store.executeTick()

    const state = store.characterStates['char-1']
    expect(state.currentAction).toBe('idle')
    expect(state.currentTask).toBeNull()
    expect(store.getItemActiveUsers('item-2')).toEqual([])
    expect(store.activityLog.at(-1)).toMatchObject({
      action: 'failed'
    })
  })

})
