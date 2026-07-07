import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type {
  AnimalState,
  AutoTickSpeed,
  CharacterState,
  WorldData,
  ItemOccupancy,
  ActivityLogEntry,
  HappinessSample,
  Intent,
  InputLot,
  SimulationDateTime,
  WorkShift
} from './types'
import {
  createStructuredCharacterLongTermMemory,
  moveCharacterToLot,
  persistCharacterRelationship,
  startCharacterActivity
} from './simulationPersistence'
import {
  appendStructuredLongTermMemory,
  appendShortTermMemory,
  createCharacterState,
  enqueueManualIntent
} from './utils/characterState'
import { buildWorldData } from './utils/pathfinding'
import { createSimulationRuntime } from './utils/simulationRuntime'
import { createSimulationDateTime, formatSimulationDateTime } from './utils/simulationCalendar'
import { INITIAL_ANIMAL_NEEDS } from './config/animalConfig'
import { deriveAccessibleLotIds } from './utils/accessControl'

interface CharacterSimulationSeed {
  id: string
  name: string
  traits?: string[]
  householdId?: string | null
  homeLotId?: string | null
  homeLotName?: string | null
  workSchedule?: WorkShift[]
}

export const useSimulationStore = defineStore('simulation', () => {
  // ============================================
  // STATE
  // ============================================

  // Tick state
  const currentTick = ref(0)
  const simulationDateTime = ref<SimulationDateTime>(createSimulationDateTime())
  const isPaused = ref(true)
  const tickIntervalId: Ref<NodeJS.Timeout | null> = ref(null)
  const autoTickSpeed = ref<AutoTickSpeed>('slow')

  // Activity log (for UI display)
  const activityLog: Ref<ActivityLogEntry[]> = ref([])

  // Happiness history ring buffer (sampled once per tick) for time-series panels
  const happinessHistory: Ref<HappinessSample[]> = ref([])

  // The world the in-memory simulation is currently scoped to (worlds are isolated)
  const activeWorldId: Ref<string | null> = ref(null)

  // Character state (needs & cooldowns)
  // Structure: { [characterId]: { needs: {...}, cooldowns: {...}, currentAction: string, location: {...} } }
  const characterStates: Ref<Record<string, CharacterState>> = ref({})

  // Animal runtime state (lean parallel to characterStates), keyed by animal id
  const animalStates: Ref<Record<string, AnimalState>> = ref({})

  // Item occupancy tracking (which characters are using which items right now)
  // Structure: { [itemId]: [characterId1, characterId2, ...] }
  const itemOccupancy: Ref<ItemOccupancy> = ref({})

  // World data for pathfinding (lots, spaces, items)
  const worldData: Ref<WorldData> = ref({
    lots: {},      // { [lotId]: { id, name, regionId, spaceIds: [] } }
    spaces: {},    // { [spaceId]: { id, name, lotId, itemIds: [] } }
    items: {},     // { [itemId]: { id, name, spaceId, lotId, regionId, allowedActivities: [] } }
    itemsByAffordance: {}  // { [action]: [itemId1, itemId2, ...] }
  })

  // ============================================
  // GETTERS
  // ============================================

  const isRunning = computed(() => !isPaused.value && tickIntervalId.value !== null)
  const formattedSimulationDateTime = computed(() => formatSimulationDateTime(simulationDateTime.value))

  // Get character state by ID
  const getCharacterState = computed(() => (characterId: string): CharacterState | null => {
    return characterStates.value[characterId] || null
  })

  // Get recent activity log entries (newest first)
  const recentActivityLog = computed(() => {
    return [...activityLog.value].reverse().slice(0, 50)
  })

  // Get active users for a specific item (returns array of character objects)
  const getItemActiveUsers = computed(() => (itemId: string) => {
    const occupantIds = itemOccupancy.value[itemId] || []
    return occupantIds.map((charId: string) => {
      const charState = characterStates.value[charId]
      return charState ? {
        id: charId,
        name: charState.name || 'Unknown'
      } : null
    }).filter((char): char is { id: string; name: string } => char !== null)
  })

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Initialize a character's state in the simulation
   */
  function initializeCharacter(character: CharacterSimulationSeed): void {
    if (!characterStates.value[character.id]) {
      characterStates.value[character.id] = createCharacterState(character)
    }

    const state = characterStates.value[character.id]
    state.householdId = character.householdId ?? state.householdId ?? null
    state.homeLotId = character.homeLotId ?? state.homeLotId ?? null
    state.homeLotName = character.homeLotName ?? state.homeLotName ?? null
    state.workSchedule = character.workSchedule ?? state.workSchedule ?? []
    state.accessibleLotIds = deriveAccessibleLotIds(state, worldData.value)
  }

  /**
   * Execute a single tick of the simulation
   */
  function recordShortTermMemory(characterId: string, intent: Intent): void {
    const state = characterStates.value[characterId]
    if (!state) {
      return
    }

    appendShortTermMemory(state, currentTick.value, intent)
  }

  async function createStructuredLongTermMemory(input: {
    characterId: string
    content: string
    relationshipIds?: string[]
    eventType?: string
    locationLotId?: string
    locationLotName?: string
    locationSpaceId?: string
    locationSpaceName?: string
    createdAt?: string
  }): Promise<void> {
    await createStructuredCharacterLongTermMemory(input)

    const state = characterStates.value[input.characterId]
    if (!state) {
      return
    }

    appendStructuredLongTermMemory({
      state,
      input
    })
  }

  const runtime = createSimulationRuntime(
    {
      currentTick,
      simulationDateTime,
      isPaused,
      tickIntervalId,
      activityLog,
      characterStates,
      worldData,
      itemOccupancy,
      activeCharacterId: ref<string | null>(null),
      autoTickSpeed,
      happinessHistory,
      animalStates
    },
    {
      recordShortTermMemory,
      moveCharacterToLot,
      startCharacterActivity,
      persistCharacterRelationship,
      createStructuredCharacterLongTermMemory: createStructuredLongTermMemory
    }
  )

  /**
   * Load world data (lots, spaces, items) for pathfinding.
   *
   * Worlds are isolated: when the active world changes, the previous world's
   * in-memory simulation is frozen and cleared so only the active world's
   * residents exist, tick, and can be reached by pathfinding. This prevents
   * characters from wandering across worlds via accumulated state.
   *
   * @param lots - Array of lot objects with indoorRooms and outdoorAreas
   * @param regionId - Region ID that these lots belong to
   * @param worldId - World the lots belong to (scopes the simulation)
   */
  function loadWorldData(lots: InputLot[], regionId: string, worldId?: string): void {
    if (worldId && worldId !== activeWorldId.value) {
      characterStates.value = {}
      animalStates.value = {}
      itemOccupancy.value = {}
      happinessHistory.value = []
    }
    if (worldId) {
      activeWorldId.value = worldId
    }

    worldData.value = buildWorldData(lots, regionId)

    const allLotIds = Object.keys(worldData.value.lots)
    for (const state of Object.values(characterStates.value)) {
      state.accessibleLotIds = deriveAccessibleLotIds(state, worldData.value)
    }
    // Animals roam freely across the region's lots.
    for (const animal of Object.values(animalStates.value)) {
      animal.accessibleLotIds = allLotIds
    }
  }

  /**
   * Initialize an animal's runtime state. Lean parallel to initializeCharacter:
   * animals start at the region's first residential lot (or first lot) and roam.
   */
  function initializeAnimal(animal: { id: string; name: string; traits?: string[] }): void {
    if (animalStates.value[animal.id]) {
      return
    }

    const lots = Object.values(worldData.value.lots)
    const homeLot = lots.find((lot) => lot.lotType === 'RESIDENTIAL') ?? lots[0]
    const firstSpaceId = homeLot?.spaceIds[0]
    const firstSpace = firstSpaceId ? worldData.value.spaces[firstSpaceId] : undefined

    animalStates.value[animal.id] = {
      name: animal.name,
      traits: animal.traits ?? [],
      needs: { ...INITIAL_ANIMAL_NEEDS },
      currentAction: 'idle',
      homeLotId: homeLot?.id ?? null,
      homeLotName: homeLot?.name ?? null,
      accessibleLotIds: Object.keys(worldData.value.lots),
      location: {
        regionId: homeLot?.regionId ?? null,
        lotId: homeLot?.id ?? null,
        lotName: homeLot?.name ?? null,
        spaceId: firstSpace?.id ?? null,
        spaceName: firstSpace?.name ?? null
      }
    }
  }


  function enqueueIntent(characterId: string, intent: Intent): void {
    const state = characterStates.value[characterId]
    if (!state) {
      return
    }

    enqueueManualIntent(state, intent)
  }

  return {
    // State
    currentTick,
    simulationDateTime,
    isPaused,
    activityLog,
    happinessHistory,
    activeWorldId,
    characterStates,
    animalStates,
    worldData,
    autoTickSpeed,

    // Getters
    isRunning,
    formattedSimulationDateTime,
    getCharacterState,
    recentActivityLog,
    getItemActiveUsers,

    // Actions
    initializeCharacter,
    initializeAnimal,
    executeTick: runtime.executeTick,
    logActivity: runtime.logActivity,
    applyActionEffects: runtime.applyActionEffects,
    executeAction: runtime.executeAction,
    enqueueIntent,
    startAutoTick: runtime.startAutoTick,
    pauseAutoTick: runtime.pauseAutoTick,
    setAutoTickSpeed: runtime.setAutoTickSpeed,
    resetSimulation: runtime.resetSimulation,
    updateCharacterLocation: runtime.updateCharacterLocation,
    loadWorldData
  }
})
