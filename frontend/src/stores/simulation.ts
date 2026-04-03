import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type {
  CharacterState,
  WorldData,
  ItemOccupancy,
  ActivityLogEntry,
  ActionName,
  Intent,
  InputLot
} from './types'
import {
  createCharacterLongTermMemory,
  deleteCharacterLongTermMemory,
  fetchCharacterDetails,
  moveCharacterToLot,
  persistCharacterBio,
  startCharacterActivity,
  updateCharacterLongTermMemory
} from './simulationPersistence'
import {
  appendShortTermMemory,
  createCharacterState,
  enqueueManualIntent,
} from './utils/characterState'
import {
  addLongTermMemory,
  editLongTermMemory,
  refreshCharacterDetails,
  removeLongTermMemory,
  saveCharacterBio
} from './utils/characterDetails'
import { buildWorldData } from './utils/pathfinding'
import { createSimulationRuntime } from './utils/simulationRuntime'

export const useSimulationStore = defineStore('simulation', () => {
  // ============================================
  // STATE
  // ============================================

  // Tick state
  const currentTick = ref(0)
  const isPaused = ref(true)
  const tickIntervalId: Ref<NodeJS.Timeout | null> = ref(null)

  // Activity log (for UI display)
  const activityLog: Ref<ActivityLogEntry[]> = ref([])

  // Character state (needs & cooldowns)
  // Structure: { [characterId]: { needs: {...}, cooldowns: {...}, currentAction: string, location: {...} } }
  const characterStates: Ref<Record<string, CharacterState>> = ref({})

  // Active character (for UI focus)
  const activeCharacterId: Ref<string | null> = ref(null)

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
  function initializeCharacter(character: { id: string; name: string; traits?: string[] }): void {
    if (!characterStates.value[character.id]) {
      characterStates.value[character.id] = createCharacterState(character)
    }
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
      isPaused,
      tickIntervalId,
      activityLog,
      characterStates,
      worldData,
      itemOccupancy,
      activeCharacterId
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
  }

  function enqueueIntent(characterId: string, intent: Intent): void {
    const state = characterStates.value[characterId]
    if (!state) {
      return
    }

    enqueueManualIntent(state, intent)
  }

  async function loadCharacterDetails(characterId: string): Promise<void> {
    const state = characterStates.value[characterId]
    if (!state) {
      return
    }

    await refreshCharacterDetails(state, characterId, { fetchCharacterDetails })
  }

  async function updateCharacterBio(characterId: string, bio: string): Promise<void> {
    await saveCharacterBio(characterId, bio, { persistCharacterBio })
  }

  async function createLongTermMemory(characterId: string, content: string): Promise<void> {
    const state = characterStates.value[characterId]
    if (!state) {
      return
    }

    await addLongTermMemory(state, characterId, content, {
      createCharacterLongTermMemory,
      fetchCharacterDetails
    })
  }

  async function updateLongTermMemory(characterId: string, memoryId: string, content: string): Promise<void> {
    const state = characterStates.value[characterId]
    if (!state) {
      return
    }

    await editLongTermMemory(state, characterId, memoryId, content, {
      updateCharacterLongTermMemory,
      fetchCharacterDetails
    })
  }

  async function deleteLongTermMemory(characterId: string, memoryId: string): Promise<void> {
    const state = characterStates.value[characterId]
    if (!state) {
      return
    }

    await removeLongTermMemory(state, characterId, memoryId, {
      deleteCharacterLongTermMemory,
      fetchCharacterDetails
    })
  }


  /**
   * Set the active character (for UI focus)
   */
  function setActiveCharacter(characterId: string): void {
    activeCharacterId.value = characterId
    void loadCharacterDetails(characterId)
  }

  return {
    // State
    currentTick,
    isPaused,
    activityLog,
    characterStates,
    worldData,
    activeCharacterId,

    // Getters
    isRunning,
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
    loadCharacterDetails,
    updateCharacterBio,
    createLongTermMemory,
    updateLongTermMemory,
    deleteLongTermMemory,
    startAutoTick: runtime.startAutoTick,
    pauseAutoTick: runtime.pauseAutoTick,
    resetSimulation: runtime.resetSimulation,
    updateCharacterLocation: runtime.updateCharacterLocation,
    loadWorldData,
    setActiveCharacter
  }
})
