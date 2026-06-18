import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSimulationStore } from '../simulation'
import { createMockWorldData, mockConsole } from './mockData'

const persistenceMocks = vi.hoisted(() => ({
  moveCharacterToLot: vi.fn(async () => {}),
  startCharacterActivity: vi.fn(async () => {}),
  persistCharacterRelationship: vi.fn(async (input: Record<string, unknown>) => ({
    id: String(input.id ?? `${input.fromCharacterId}-${input.toCharacterId}`),
    fromCharacterId: String(input.fromCharacterId),
    toCharacterId: String(input.toCharacterId),
    shortTermScore: Number(input.shortTermScore ?? 0),
    longTermScore: Number(input.longTermScore ?? 0),
    labels: (input.labels as string[] | undefined) ?? [],
    lastSeenAt: (input.lastSeenAt as string | undefined) ?? null,
    lastSpokeAt: (input.lastSpokeAt as string | undefined) ?? null,
    isDeceasedTarget: Boolean(input.isDeceasedTarget ?? false)
  })),
  createStructuredCharacterLongTermMemory: vi.fn(async () => {}),
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
    persistenceMocks.persistCharacterRelationship.mockClear()
    persistenceMocks.createStructuredCharacterLongTermMemory.mockClear()
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

  function setupSecondCharacter(store: ReturnType<typeof useSimulationStore>, lotId: string, lotName: string, spaceId: string, spaceName: string) {
    store.initializeCharacter({ id: 'char-2', name: 'Bob' })
    store.updateCharacterLocation('char-2', 'region-1', lotId, lotName, spaceId, spaceName)
    store.enqueueIntent('char-2', {
      action: 'idle',
      utility: 0
    })
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

  function enqueueLibraryReadIntent(store: ReturnType<typeof useSimulationStore>) {
    store.enqueueIntent('char-1', {
      action: 'read',
      itemId: 'item-4',
      itemName: 'Bookshelf',
      targetSpaceId: 'space-3',
      targetSpaceName: 'Library',
      targetLotId: 'lot-2',
      targetLotName: 'Community Center',
      travelCost: 2,
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

  function seedDirectionalRelationship(
    store: ReturnType<typeof useSimulationStore>,
    fromCharacterId: string,
    toCharacterId: string,
    lastSeenAt: string | null,
    overrides: Partial<ReturnType<typeof createRelationshipSeed>> = {}
  ) {
    store.characterStates[fromCharacterId].relationships = [createRelationshipSeed({
      fromCharacterId,
      toCharacterId,
      lastSeenAt,
      ...overrides
    })]
  }

  function createRelationshipSeed({
    fromCharacterId,
    toCharacterId,
    lastSeenAt,
    shortTermScore = 0,
    longTermScore = 0,
    lastSpokeAt = null
  }: {
    fromCharacterId: string
    toCharacterId: string
    lastSeenAt: string | null
    shortTermScore?: number
    longTermScore?: number
    lastSpokeAt?: string | null
  }) {
    return {
      id: `${fromCharacterId}-${toCharacterId}`,
      fromCharacterId,
      toCharacterId,
      shortTermScore,
      longTermScore,
      labels: [],
      lastSeenAt,
      lastSpokeAt,
      isDeceasedTarget: false
    }
  }

  function createLongTermMemorySeed({
    id,
    content,
    createdAt,
    relationshipId,
    eventType
  }: {
    id: string
    content: string
    createdAt: string
    relationshipId: string
    eventType: string
  }) {
    return {
      id,
      content,
      createdAt,
      eventType,
      relationshipIds: [relationshipId]
    }
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

  it('creates a directional relationship after first meeting on arrival', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    enqueueLibraryReadIntent(store)

    await store.executeTick()

    expect(store.characterStates['char-1'].relationships?.[0]?.toCharacterId).toBe('char-2')
  })

  it('creates a first_met memory when a relationship is first created', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    enqueueLibraryReadIntent(store)

    await store.executeTick()

    expect(persistenceMocks.createStructuredCharacterLongTermMemory).toHaveBeenCalledWith(expect.objectContaining({
      characterId: 'char-1',
      eventType: 'first_met'
    }))
  })

  it('updates lastSpokeAt for accepted social interactions', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-1', 'Test House', 'space-1', 'Living Room')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null)
    seedDirectionalRelationship(store, 'char-2', 'char-1', null)
    store.characterStates['char-2'].needs.friends = 0.1
    store.enqueueIntent('char-1', {
      action: 'chat_friend',
      itemId: 'item-1',
      itemName: 'Couch',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      socialTargetId: 'char-2',
      socialTargetName: 'Bob',
      utility: 10
    })

    await store.executeTick()

    expect(store.characterStates['char-1'].relationships?.[0]?.lastSpokeAt).toBe(store.simulationDateTime.iso)
  })

  it('decays short-term relationship score faster than long-term score on each tick', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-1', 'Test House', 'space-1', 'Living Room')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.5,
      longTermScore: 0.5
    })
    store.enqueueIntent('char-1', {
      action: 'idle',
      utility: 0
    })

    await store.executeTick()

    expect(
      (store.characterStates['char-1'].relationships?.[0]?.shortTermScore ?? 0)
      < (store.characterStates['char-1'].relationships?.[0]?.longTermScore ?? 0)
    ).toBe(true)
  })

  it('increases short-term relationship score after an accepted chat interaction', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-1', 'Test House', 'space-1', 'Living Room')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.2,
      longTermScore: 0.1
    })
    seedDirectionalRelationship(store, 'char-2', 'char-1', null, {
      shortTermScore: 0.05,
      longTermScore: 0.02
    })
    store.characterStates['char-2'].needs.friends = 0.1
    store.enqueueIntent('char-1', {
      action: 'chat_friend',
      itemId: 'item-1',
      itemName: 'Couch',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      socialTargetId: 'char-2',
      socialTargetName: 'Bob',
      utility: 10
    })

    await store.executeTick()

    expect(store.characterStates['char-1'].relationships?.[0]?.shortTermScore).toBeGreaterThan(0.2)
  })

  it('preserves directional relationship differences after a shared interaction', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-1', 'Test House', 'space-1', 'Living Room')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.2,
      longTermScore: 0.1
    })
    seedDirectionalRelationship(store, 'char-2', 'char-1', null, {
      shortTermScore: 0.05,
      longTermScore: 0.02
    })
    store.characterStates['char-2'].needs.friends = 0.1
    store.enqueueIntent('char-1', {
      action: 'chat_friend',
      itemId: 'item-1',
      itemName: 'Couch',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      socialTargetId: 'char-2',
      socialTargetName: 'Bob',
      utility: 10
    })

    await store.executeTick()

    expect(store.characterStates['char-1'].relationships?.[0]?.shortTermScore).not.toBe(
      store.characterStates['char-2'].relationships?.[0]?.shortTermScore
    )
  })

  it('records a text contact memory for direct relationship actions', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.2,
      longTermScore: 0.1
    })
    seedDirectionalRelationship(store, 'char-2', 'char-1', null, {
      shortTermScore: 0.1,
      longTermScore: 0.05
    })
    store.enqueueIntent('char-1', {
      action: 'text_romance',
      utility: 1,
      socialTargetId: 'char-2',
      socialTargetName: 'Bob'
    })

    await store.executeTick()

    expect(persistenceMocks.createStructuredCharacterLongTermMemory).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'text_romance'
    }))
  })

  it('applies the proposed relationship label to both directions after an accepted proposal', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.3,
      longTermScore: 0.5
    })
    seedDirectionalRelationship(store, 'char-2', 'char-1', null, {
      shortTermScore: 0.25,
      longTermScore: 0.45
    })
    store.enqueueIntent('char-1', {
      action: 'propose_relationship',
      utility: 1,
      socialTargetId: 'char-2',
      socialTargetName: 'Bob',
      proposedRelationshipLabel: 'monogamous'
    })

    await store.executeTick()

    expect(store.characterStates['char-1'].relationships?.[0]?.labels).toContain('monogamous')
  })

  it('does not record an invite_over memory when the invitation is rejected', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.2,
      longTermScore: 0.1
    })
    seedDirectionalRelationship(store, 'char-2', 'char-1', null, {
      shortTermScore: 0.1,
      longTermScore: 0.05
    })
    store.characterStates['char-2'].currentAction = 'sleep'
    store.enqueueIntent('char-1', {
      action: 'invite_over',
      utility: 1,
      socialTargetId: 'char-2',
      socialTargetName: 'Bob'
    })

    await store.executeTick()

    expect(
      persistenceMocks.createStructuredCharacterLongTermMemory.mock.calls.some(
        ([input]) => (input as Record<string, unknown>).eventType === 'invite_over'
      )
    ).toBe(false)
  })

  it('moves the invited character to the inviter location after an accepted invite_over', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.2,
      longTermScore: 0.1
    })
    seedDirectionalRelationship(store, 'char-2', 'char-1', null, {
      shortTermScore: 0.1,
      longTermScore: 0.05
    })
    store.enqueueIntent('char-1', {
      action: 'invite_over',
      utility: 1,
      socialTargetId: 'char-2',
      socialTargetName: 'Bob',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room'
    })

    await store.executeTick()

    expect(store.characterStates['char-2'].location.lotId).toBe('lot-1')
  })

  it('executes the hosted hang out follow-up on the tick after arrival', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null)
    seedDirectionalRelationship(store, 'char-2', 'char-1', null)
    store.characterStates['char-2'].needs.friends = 0.1
    store.enqueueIntent('char-1', {
      action: 'invite_over',
      inviteContextType: 'hang_out',
      utility: 1,
      socialTargetId: 'char-2',
      socialTargetName: 'Bob',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      hostedFollowUp: {
        action: 'chat_friend',
        itemId: 'item-1',
        itemName: 'Couch',
        targetLotId: 'lot-1',
        targetLotName: 'Test House',
        targetSpaceId: 'space-1',
        targetSpaceName: 'Living Room',
        totalTicks: 1,
        remainingTicks: 0,
        socialTargetId: 'char-2',
        socialTargetName: 'Bob'
      }
    })

    await store.executeTick()
    await store.executeTick()

    expect(store.characterStates['char-1'].currentAction).toBe('chat_friend')
  })

  it('executes the hosted watch movie follow-up on the tick after arrival', async () => {
    const store = setupStore()
    store.worldData.items['item-1'] = {
      ...store.worldData.items['item-1'],
      name: 'Movie Screen',
      allowedActivities: ['chat_friend', 'view_movie'],
      affordances: [
        { action: 'chat_friend', weight: 1 },
        { action: 'view_movie', weight: 1 }
      ]
    }
    store.worldData.itemsByAffordance.view_movie = ['item-1']
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null)
    seedDirectionalRelationship(store, 'char-2', 'char-1', null)
    store.enqueueIntent('char-1', {
      action: 'invite_over',
      inviteContextType: 'watch_movie',
      utility: 1,
      socialTargetId: 'char-2',
      socialTargetName: 'Bob',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      hostedFollowUp: {
        action: 'view_movie',
        itemId: 'item-1',
        itemName: 'Movie Screen',
        targetLotId: 'lot-1',
        targetLotName: 'Test House',
        targetSpaceId: 'space-1',
        targetSpaceName: 'Living Room',
        totalTicks: 1,
        remainingTicks: 0,
        socialTargetId: 'char-2',
        socialTargetName: 'Bob'
      }
    })

    await store.executeTick()
    await store.executeTick()

    expect(store.characterStates['char-1'].currentAction).toBe('view_movie')
  })

  it('executes the hosted have dinner follow-up on the tick after arrival', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null)
    seedDirectionalRelationship(store, 'char-2', 'char-1', null)
    store.enqueueIntent('char-1', {
      action: 'invite_over',
      inviteContextType: 'have_dinner',
      utility: 1,
      socialTargetId: 'char-2',
      socialTargetName: 'Bob',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      hostedFollowUp: {
        action: 'eat',
        itemId: 'item-3',
        itemName: 'Fridge',
        targetLotId: 'lot-1',
        targetLotName: 'Test House',
        targetSpaceId: 'space-2',
        targetSpaceName: 'Kitchen',
        totalTicks: 1,
        remainingTicks: 0,
        socialTargetId: 'char-2',
        socialTargetName: 'Bob'
      }
    })

    await store.executeTick()
    await store.executeTick()

    expect(store.characterStates['char-1'].currentAction).toBe('eat')
  })

  it('creates a reunited_after_long_absence memory when characters meet again after hours apart', async () => {
    const store = setupStore()
    store.simulationDateTime = {
      ...store.simulationDateTime,
      iso: '2026-04-06T18:00:00.000Z',
      hour: 18,
      minute: 0
    }
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    seedDirectionalRelationship(store, 'char-1', 'char-2', '2026-04-06T08:00:00.000Z')
    seedDirectionalRelationship(store, 'char-2', 'char-1', '2026-04-06T08:00:00.000Z')
    enqueueLibraryReadIntent(store)

    await store.executeTick()

    expect(persistenceMocks.createStructuredCharacterLongTermMemory).toHaveBeenCalledWith(expect.objectContaining({
      characterId: 'char-1',
      eventType: 'reunited_after_long_absence'
    }))
  })

  it('creates an ate_lunch_together memory when characters eat lunch in the same space', async () => {
    const store = setupStore()
    store.simulationDateTime = {
      ...store.simulationDateTime,
      iso: '2026-04-06T19:00:00.000Z',
      hour: 12,
      minute: 0
    }
    setupSecondCharacter(store, 'lot-1', 'Test House', 'space-2', 'Kitchen')
    store.updateCharacterLocation('char-1', 'region-1', 'lot-1', 'Test House', 'space-2', 'Kitchen')
    store.characterStates['char-2'].queuedActions = []
    seedDirectionalRelationship(store, 'char-1', 'char-2', null)
    seedDirectionalRelationship(store, 'char-2', 'char-1', null)
    store.enqueueIntent('char-1', {
      action: 'eat',
      itemId: 'item-3',
      itemName: 'Fridge',
      targetSpaceId: 'space-2',
      targetSpaceName: 'Kitchen',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })
    store.enqueueIntent('char-2', {
      action: 'eat',
      itemId: 'item-3',
      itemName: 'Fridge',
      targetSpaceId: 'space-2',
      targetSpaceName: 'Kitchen',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })

    await store.executeTick()

    expect(persistenceMocks.createStructuredCharacterLongTermMemory).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'ate_lunch_together'
    }))
  })

  it('increases long-term relationship score after a shared lunch', async () => {
    const store = setupStore()
    store.simulationDateTime = {
      ...store.simulationDateTime,
      iso: '2026-04-06T19:00:00.000Z',
      hour: 12,
      minute: 0
    }
    setupSecondCharacter(store, 'lot-1', 'Test House', 'space-2', 'Kitchen')
    store.updateCharacterLocation('char-1', 'region-1', 'lot-1', 'Test House', 'space-2', 'Kitchen')
    store.characterStates['char-2'].queuedActions = []
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.1,
      longTermScore: 0.1
    })
    seedDirectionalRelationship(store, 'char-2', 'char-1', null, {
      shortTermScore: 0.1,
      longTermScore: 0.1
    })
    store.enqueueIntent('char-1', {
      action: 'eat',
      itemId: 'item-3',
      itemName: 'Fridge',
      targetSpaceId: 'space-2',
      targetSpaceName: 'Kitchen',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })
    store.enqueueIntent('char-2', {
      action: 'eat',
      itemId: 'item-3',
      itemName: 'Fridge',
      targetSpaceId: 'space-2',
      targetSpaceName: 'Kitchen',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })

    await store.executeTick()

    expect(store.characterStates['char-1'].relationships?.[0]?.longTermScore).toBeGreaterThan(0.1)
  })

  it('creates a watched_a_movie_together memory when characters view a movie together', async () => {
    const store = setupStore()
    store.worldData.items['item-1'] = {
      ...store.worldData.items['item-1'],
      name: 'Movie Screen',
      allowedActivities: ['view_movie'],
      affordances: [{ action: 'view_movie', weight: 1 }]
    }
    store.worldData.itemsByAffordance.view_movie = ['item-1']
    setupSecondCharacter(store, 'lot-1', 'Test House', 'space-1', 'Living Room')
    store.characterStates['char-2'].queuedActions = []
    seedDirectionalRelationship(store, 'char-1', 'char-2', null)
    seedDirectionalRelationship(store, 'char-2', 'char-1', null)
    store.enqueueIntent('char-1', {
      action: 'view_movie',
      itemId: 'item-1',
      itemName: 'Movie Screen',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })
    store.enqueueIntent('char-2', {
      action: 'view_movie',
      itemId: 'item-1',
      itemName: 'Movie Screen',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })

    await store.executeTick()

    expect(persistenceMocks.createStructuredCharacterLongTermMemory).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'watched_a_movie_together'
    }))
  })

  it('adds a best friend label after enough shared milestone memories accrue', async () => {
    const store = setupStore()
    store.simulationDateTime = {
      ...store.simulationDateTime,
      iso: '2026-04-06T19:00:00.000Z',
      hour: 12,
      minute: 0
    }
    setupSecondCharacter(store, 'lot-1', 'Test House', 'space-2', 'Kitchen')
    store.updateCharacterLocation('char-1', 'region-1', 'lot-1', 'Test House', 'space-2', 'Kitchen')
    store.characterStates['char-2'].queuedActions = []
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.4,
      longTermScore: 0.62
    })
    seedDirectionalRelationship(store, 'char-2', 'char-1', null, {
      shortTermScore: 0.4,
      longTermScore: 0.62
    })
    store.characterStates['char-1'].longTermMemories = [
      createLongTermMemorySeed({
        id: 'mem-1',
        content: 'Met Bob for the first time.',
        createdAt: '2026-04-01T10:00:00.000Z',
        relationshipId: 'char-1-char-2',
        eventType: 'first_met'
      }),
      createLongTermMemorySeed({
        id: 'mem-2',
        content: 'Watched a movie with Bob.',
        createdAt: '2026-04-03T19:00:00.000Z',
        relationshipId: 'char-1-char-2',
        eventType: 'watched_a_movie_together'
      })
    ]
    store.characterStates['char-2'].longTermMemories = [
      createLongTermMemorySeed({
        id: 'mem-3',
        content: 'Met Alice for the first time.',
        createdAt: '2026-04-01T10:00:00.000Z',
        relationshipId: 'char-2-char-1',
        eventType: 'first_met'
      }),
      createLongTermMemorySeed({
        id: 'mem-4',
        content: 'Watched a movie with Alice.',
        createdAt: '2026-04-03T19:00:00.000Z',
        relationshipId: 'char-2-char-1',
        eventType: 'watched_a_movie_together'
      })
    ]
    store.enqueueIntent('char-1', {
      action: 'eat',
      itemId: 'item-3',
      itemName: 'Fridge',
      targetSpaceId: 'space-2',
      targetSpaceName: 'Kitchen',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })
    store.enqueueIntent('char-2', {
      action: 'eat',
      itemId: 'item-3',
      itemName: 'Fridge',
      targetSpaceId: 'space-2',
      targetSpaceName: 'Kitchen',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      utility: 10
    })

    await store.executeTick()

    expect(store.characterStates['char-1'].relationships?.[0]?.labels).toContain('best friend')
  })

  it('adds an attracted to label after romantic contact milestones', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.2,
      longTermScore: 0.42
    })
    seedDirectionalRelationship(store, 'char-2', 'char-1', null, {
      shortTermScore: 0.2,
      longTermScore: 0.2
    })
    store.enqueueIntent('char-1', {
      action: 'text_romance',
      utility: 1,
      socialTargetId: 'char-2',
      socialTargetName: 'Bob'
    })

    await store.executeTick()

    expect(store.characterStates['char-1'].relationships?.[0]?.labels).toContain('attracted to')
  })

  it('adds a casual relationship label after multiple romantic milestone types', async () => {
    const store = setupStore()
    setupSecondCharacter(store, 'lot-2', 'Community Center', 'space-3', 'Library')
    seedDirectionalRelationship(store, 'char-1', 'char-2', null, {
      shortTermScore: 0.32,
      longTermScore: 0.56
    })
    seedDirectionalRelationship(store, 'char-2', 'char-1', null, {
      shortTermScore: 0.22,
      longTermScore: 0.3
    })
    store.characterStates['char-1'].longTermMemories = [
      createLongTermMemorySeed({
        id: 'mem-5',
        content: 'Texted Bob.',
        createdAt: '2026-04-04T10:00:00.000Z',
        relationshipId: 'char-1-char-2',
        eventType: 'text_romance'
      })
    ]
    store.characterStates['char-2'].longTermMemories = [
      createLongTermMemorySeed({
        id: 'mem-6',
        content: 'Texted Alice.',
        createdAt: '2026-04-04T10:00:00.000Z',
        relationshipId: 'char-2-char-1',
        eventType: 'text_romance'
      })
    ]
    store.enqueueIntent('char-1', {
      action: 'invite_over',
      utility: 1,
      socialTargetId: 'char-2',
      socialTargetName: 'Bob',
      targetLotId: 'lot-1',
      targetLotName: 'Test House',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Living Room'
    })

    await store.executeTick()

    expect(store.characterStates['char-1'].relationships?.[0]?.labels).toContain('casual relationship')
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
