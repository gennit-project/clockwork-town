import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type {
  AutoTickSpeed,
  CharacterState,
  WorldData,
  ItemOccupancy,
  ActivityLogEntry,
  Intent,
  InputLot,
  SimulationDateTime,
  WorkShift
} from './types'
import {
  moveCharacterToLot,
  startCharacterActivity
} from './simulationPersistence'
import {
  appendShortTermMemory,
  createCharacterState,
  enqueueManualIntent
} from './utils/characterState'
import { buildWorldData } from './utils/pathfinding'
import { createSimulationRuntime } from './utils/simulationRuntime'
import { createSimulationDateTime, formatSimulationDateTime } from './utils/simulationCalendar'
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

  // Character state (needs & cooldowns)
  // Structure: { [characterId]: { needs: {...}, cooldowns: {...}, currentAction: string, location: {...} } }
  const characterStates: Ref<Record<string, CharacterState>> = ref({})

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
      autoTickSpeed
    },
    {
      recordShortTermMemory,
      moveCharacterToLot,
      startCharacterActivity
    }
  )

  /**
   * Load world data (lots, spaces, items) for pathfinding
   * @param lots - Array of lot objects with indoorRooms and outdoorAreas
   * @param regionId - Region ID that these lots belong to
   */
  function loadWorldData(lots: InputLot[], regionId: string): void {
    worldData.value = buildWorldData(lots, regionId)

    for (const state of Object.values(characterStates.value)) {
      state.accessibleLotIds = deriveAccessibleLotIds(state, worldData.value)
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
    characterStates,
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
