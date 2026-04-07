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

  function enqueueReadIntent(store: ReturnType<typeof useSimulationStore>) {
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
  }

  function enqueueSleepIntent(store: ReturnType<typeof useSimulationStore>) {
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
  }

  it('drains the queued manual intents after execution', async () => {
    const store = setupStore()
    enqueueReadIntent(store)

    await store.executeTick()

    expect(store.characterStates['char-1'].queuedActions).toEqual([])
  })

  it('updates the current action after a queued read intent', async () => {
    const store = setupStore()
    enqueueReadIntent(store)

    await store.executeTick()

    expect(store.characterStates['char-1'].currentAction).toBe('read')
  })

  it('applies the read cooldown after a queued read intent', async () => {
    const store = setupStore()
    enqueueReadIntent(store)

    await store.executeTick()

    expect(store.characterStates['char-1'].cooldowns.read).toBe(9)
  })

  it('records a short-term memory for the read action', async () => {
    const store = setupStore()
    enqueueReadIntent(store)

    await store.executeTick()

    expect(store.characterStates['char-1'].memories?.at(-1)).toMatchObject({
      action: 'read',
      item: 'Couch'
    })
  })

  it('starts the backend activity for the read action', async () => {
    const store = setupStore()
    enqueueReadIntent(store)

    await store.executeTick()

    expect(persistenceMocks.startCharacterActivity).toHaveBeenCalledWith({
      characterId: 'char-1',
      actionName: 'read',
      itemId: 'item-1',
      note: undefined
    })
  })

  it('creates a current task for multi-tick sleep', async () => {
    const store = setupStore()
    enqueueSleepIntent(store)

    await store.executeTick()

    expect(store.characterStates['char-1'].currentTask).toMatchObject({
      action: 'sleep',
      remainingTicks: 2,
      totalTicks: 3
    })
  })

  it('occupies the bed when multi-tick sleep starts', async () => {
    const store = setupStore()
    enqueueSleepIntent(store)

    await store.executeTick()

    expect(store.getItemActiveUsers('item-2')).toEqual([{ id: 'char-1', name: 'Alice' }])
  })

  it('decrements the remaining sleep task ticks on the next tick', async () => {
    const store = setupStore()
    enqueueSleepIntent(store)

    await store.executeTick()
    await store.executeTick()

    expect(store.characterStates['char-1'].currentTask?.remainingTicks).toBe(1)
  })

  it('keeps the bed occupied while sleep is in progress', async () => {
    const store = setupStore()
    enqueueSleepIntent(store)

    await store.executeTick()
    await store.executeTick()

    expect(store.getItemActiveUsers('item-2')).toEqual([{ id: 'char-1', name: 'Alice' }])
  })

  it('clears the sleep task after the final tick', async () => {
    const store = setupStore()
    enqueueSleepIntent(store)

    await store.executeTick()
    await store.executeTick()
    await store.executeTick()

    expect(store.characterStates['char-1'].currentTask).toBeNull()
  })

  it('keeps the current action as sleep after completion', async () => {
    const store = setupStore()
    enqueueSleepIntent(store)

    await store.executeTick()
    await store.executeTick()
    await store.executeTick()

    expect(store.characterStates['char-1'].currentAction).toBe('sleep')
  })

  it('applies the sleep cooldown after completion', async () => {
    const store = setupStore()
    enqueueSleepIntent(store)

    await store.executeTick()
    await store.executeTick()
    await store.executeTick()

    expect(store.characterStates['char-1'].cooldowns.sleep).toBe(12)
  })

  it('releases the bed after sleep completes', async () => {
    const store = setupStore()
    enqueueSleepIntent(store)

    await store.executeTick()
    await store.executeTick()
    await store.executeTick()

    expect(store.getItemActiveUsers('item-2')).toEqual([])
  })

  it('records a sleep memory after completion', async () => {
    const store = setupStore()
    enqueueSleepIntent(store)

    await store.executeTick()
    await store.executeTick()
    await store.executeTick()

    expect(store.characterStates['char-1'].memories?.at(-1)).toMatchObject({
      action: 'sleep',
      item: 'Bed'
    })
  })

  it('falls back to idle when backend activity start fails', async () => {
    const store = setupStore()
    persistenceMocks.startCharacterActivity.mockRejectedValueOnce(new Error('backend down'))
    enqueueSleepIntent(store)

    await store.executeTick()

    expect(store.characterStates['char-1'].currentAction).toBe('idle')
  })

  it('does not leave a task behind when backend activity start fails', async () => {
    const store = setupStore()
    persistenceMocks.startCharacterActivity.mockRejectedValueOnce(new Error('backend down'))
    enqueueSleepIntent(store)

    await store.executeTick()

    expect(store.characterStates['char-1'].currentTask).toBeNull()
  })

  it('releases bed occupancy when backend activity start fails', async () => {
    const store = setupStore()
    persistenceMocks.startCharacterActivity.mockRejectedValueOnce(new Error('backend down'))
    enqueueSleepIntent(store)

    await store.executeTick()

    expect(store.getItemActiveUsers('item-2')).toEqual([])
  })

  it('logs the failed backend start attempt', async () => {
    const store = setupStore()
    persistenceMocks.startCharacterActivity.mockRejectedValueOnce(new Error('backend down'))
    enqueueSleepIntent(store)

    await store.executeTick()

    expect(store.activityLog.at(-1)).toMatchObject({
      action: 'failed'
    })
  })
})
