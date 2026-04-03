import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type {
  CharacterState,
  WorldData,
  ItemOccupancy,
  ActivityLogEntry,
  ActionName,
  NeedName,
  Intent,
  InputLot
} from './types'
import { ACTION_EFFECTS } from './config/actionEffects'
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
  createActivityLogEntry,
  createCharacterState,
  enqueueManualIntent,
  updateStateLocation
} from './utils/characterState'
import { assignItemOccupancy, clearCharacterOccupancy } from './utils/itemOccupancy'
import { buildWorldData } from './utils/pathfinding'
import { advanceTask, buildCompletionIntent, createTaskFromIntent, getActionDuration, isTaskComplete } from './utils/taskLifecycle'
import { executeTick as runTick } from './utils/tickExecution'

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
  const MAX_LOG_ENTRIES = 100

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
  async function executeTick() {
    await runTick({
      currentTick,
      characterStates,
      worldData,
      itemOccupancy,
      activityLog,
      executeAction,
      progressTask
    })
  }

  /**
   * Log an activity to the activity log
   */
  function logActivity(characterId: string, action: string, details: string): void {
    const logEntry = createActivityLogEntry(currentTick.value, characterId, action, details)

    activityLog.value.push(logEntry)

    // Trim log if too large
    if (activityLog.value.length > MAX_LOG_ENTRIES) {
      activityLog.value = activityLog.value.slice(-MAX_LOG_ENTRIES)
    }

    console.log(`[Tick ${currentTick.value}] Character ${characterId}: ${action} - ${details}`)
  }

  function recordShortTermMemory(characterId: string, intent: Intent): void {
    const state = characterStates.value[characterId]
    if (!state) {
      return
    }

    appendShortTermMemory(state, currentTick.value, intent)
  }

  async function completeIntent(characterId: string, intent: Intent): Promise<void> {
    applyActionEffects(characterId, intent.action, intent.itemName || intent.socialTargetName || null)

    if (intent.itemId) {
      setItemOccupancy(characterId, intent.itemId)
    }

    recordShortTermMemory(characterId, intent)
  }

  async function progressTask(characterId: string): Promise<boolean> {
    const state = characterStates.value[characterId]
    const task = state?.currentTask

    if (!state || !task) {
      return false
    }

    const nextTask = advanceTask(task)
    state.currentTask = nextTask

    if (!isTaskComplete(nextTask)) {
      state.currentAction = nextTask.action
      logActivity(characterId, nextTask.action, `In progress (${nextTask.remainingTicks}/${nextTask.totalTicks} ticks remaining)`)
      return true
    }

    const completedIntent: Intent = buildCompletionIntent(nextTask)

    await completeIntent(characterId, completedIntent)
    state.currentTask = null
    clearItemOccupancy(characterId)
    return true
  }

  /**
   * Apply the effects of an action to a character's needs
   * Updates needs, sets cooldown, and updates current action
   *
   * @param characterId - The character performing the action
   * @param action - The action name (e.g., 'eat', 'sleep', 'read')
   * @param itemName - Optional item name for logging
   */
  function applyActionEffects(characterId: string, action: ActionName, itemName: string | null = null): void {
    // Validate action exists
    const actionData = ACTION_EFFECTS[action]
    if (!actionData) {
      console.error(`❌ Unknown action: ${action}`)
      return
    }

    // Get character state
    const state = characterStates.value[characterId]
    if (!state) {
      console.error(`❌ Character not found: ${characterId}`)
      return
    }

    console.log(`⚡ Applying action "${action}" to character ${characterId}`)

    // Apply primary effect
    if (actionData.primaryNeed && actionData.primaryEffect !== 0) {
      const oldValue = state.needs[actionData.primaryNeed]
      state.needs[actionData.primaryNeed] = Math.min(1.0, Math.max(0, oldValue + actionData.primaryEffect))
      const newValue = state.needs[actionData.primaryNeed]
      console.log(`  ✓ ${actionData.primaryNeed}: ${oldValue.toFixed(2)} → ${newValue.toFixed(2)} (+${actionData.primaryEffect})`)
    }

    // Apply secondary effects
    for (const [need, effect] of Object.entries(actionData.secondaryEffects)) {
      const needKey = need as NeedName
      const effectValue = effect as number
      const oldValue = state.needs[needKey]
      state.needs[needKey] = Math.min(1.0, Math.max(0, oldValue + effectValue))
      const newValue = state.needs[needKey]
      console.log(`  ✓ ${need}: ${oldValue.toFixed(2)} → ${newValue.toFixed(2)} (${effectValue >= 0 ? '+' : ''}${effectValue})`)
    }

    // Set cooldown (skip for idle action which doesn't have a cooldown)
    if (action !== 'idle' && action in state.cooldowns) {
      state.cooldowns[action] = actionData.cooldownTicks
      console.log(`  ✓ Cooldown set: ${actionData.cooldownTicks} ticks`)
    }

    // Update current action
    state.currentAction = action

    // Log activity
    const details = itemName ? `using ${itemName}` : 'action performed'
    logActivity(characterId, action, details)

    console.log(`✅ Action "${action}" applied successfully`)
  }

  /**
   * Execute an action for a character based on their intent
   * Step 12-13: Applies effects, handles movement, sets cooldown, updates state, creates memory
   *
   * @param characterId - The character performing the action
   * @param intent - The intent object from selectBestIntent()
   */
  async function executeAction(characterId: string, intent: Intent): Promise<void> {
    const state = characterStates.value[characterId]
    if (!state) {
      console.error(`❌ Character not found: ${characterId}`)
      return
    }

    console.log(`\n⚡ Executing action for ${characterId}`)

    // Handle idle case
    if (intent.action === 'idle') {
      state.currentAction = 'idle'
      state.currentTask = null
      // Clear any item occupancy for this character
      clearItemOccupancy(characterId)
      logActivity(characterId, 'idle', 'No satisfying actions available')
      console.log(`  ${characterId}: idle (no actions available)`)
      return
    }

    // Re-validate item availability (important for sequential execution within same tick)
    if (intent.itemId) {
      const item = worldData.value.items[intent.itemId]
      if (item && item.maxSimultaneousUsers !== null && item.maxSimultaneousUsers !== undefined) {
        const currentOccupants = itemOccupancy.value[intent.itemId] || []
        if (currentOccupants.length >= item.maxSimultaneousUsers) {
          console.log(`  ⚠️  Item ${intent.itemName} became full during this tick (${currentOccupants.length}/${item.maxSimultaneousUsers})`)
          console.log(`  ${characterId}: falling back to idle`)
          state.currentAction = 'idle'
          clearItemOccupancy(characterId)
          logActivity(characterId, 'idle', `${intent.itemName} became unavailable`)
          return
        }
      }
    }

    // Step 13: Handle movement if needed (travelCost > 0)
    if (intent.travelCost && intent.travelCost > 0) {
      const currentLotId = state.location?.lotId
      const targetLotId = intent.targetLotId

      if (!targetLotId) {
        console.warn('  ⚠️  No target lot specified for movement')
        return
      }

      if (currentLotId !== targetLotId) {
        console.log(`  🚶 Moving ${characterId} from ${state.location?.lotName || 'unknown'} to ${intent.targetLotName}`)

        try {
          await moveCharacterToLot(characterId, targetLotId)

          // Update Pinia state
          updateCharacterLocation(
            characterId,
            state.location?.regionId || null, // Keep same region
            targetLotId,
            intent.targetLotName || '',
            intent.targetSpaceId || '',
            intent.targetSpaceName || ''
          )

          console.log(`  ✓ Moved to ${intent.targetLotName} (${intent.targetSpaceName})`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(`  ❌ Failed to move character: ${errorMessage}`)
          // Continue with action even if movement fails
        }
      }
    }

    // Call backend mutation to create Activity and USING edge in database
    try {
      await startCharacterActivity(characterId, intent.action)
      console.log(`  ✓ Started activity "${intent.action}" in database`)

      const duration = getActionDuration(intent.action)

      if (intent.itemId) {
        setItemOccupancy(characterId, intent.itemId)
      }

      if (duration > 1) {
        state.currentAction = intent.action
        state.currentTask = createTaskFromIntent(intent)
        logActivity(characterId, intent.action, `Started multi-tick action at ${intent.itemName || intent.socialTargetName || 'target'}`)
        return
      }

      await completeIntent(characterId, intent)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`  ❌ Failed to start activity in database: ${errorMessage}`)
      // Don't apply effects if backend failed - character remains in previous state
      // Clear any item occupancy since action failed
      clearItemOccupancy(characterId)
      logActivity(characterId, 'failed', `Could not perform ${intent.action}: ${errorMessage}`)
    }
  }

  /**
   * Set item occupancy - add character to item's occupant list
   */
  function setItemOccupancy(characterId: string, itemId: string): void {
    assignItemOccupancy(itemOccupancy.value, characterId, itemId)
    console.log(`  🪑 ${characterId} now occupying ${itemId}`)
  }

  /**
   * Clear item occupancy - remove character from all items
   */
  function clearItemOccupancy(characterId: string): void {
    const occupiedItemIds = Object.keys(itemOccupancy.value).filter((itemId) =>
      itemOccupancy.value[itemId]?.includes(characterId)
    )

    clearCharacterOccupancy(itemOccupancy.value, characterId)

    for (const itemId of occupiedItemIds) {
      console.log(`  🚪 ${characterId} no longer occupying ${itemId}`)
    }
  }

  /**
   * Start auto-ticking (5 seconds per tick for debugging)
   */
  function startAutoTick() {
    if (tickIntervalId.value) return

    isPaused.value = false
    tickIntervalId.value = setInterval(() => {
      executeTick()
    }, 5000) // 5 seconds per tick for debugging

    console.log('Auto-tick started (5s interval)')
  }

  /**
   * Pause auto-ticking
   */
  function pauseAutoTick() {
    if (tickIntervalId.value) {
      clearInterval(tickIntervalId.value)
      tickIntervalId.value = null
    }
    isPaused.value = true
    console.log('Auto-tick paused')
  }

  /**
   * Reset simulation state
   */
  function resetSimulation() {
    pauseAutoTick()
    currentTick.value = 0
    activityLog.value = []
    characterStates.value = {}
    itemOccupancy.value = {}
    activeCharacterId.value = null
    console.log('Simulation reset')
  }

  /**
   * Update character location
   */
  function updateCharacterLocation(
    characterId: string,
    regionId: string | null,
    lotId: string,
    lotName: string,
    spaceId: string,
    spaceName: string
  ): void {
    if (characterStates.value[characterId]) {
      updateStateLocation(characterStates.value[characterId], {
        regionId,
        lotId,
        lotName,
        spaceId,
        spaceName
      })
    }
  }

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

    const data = await fetchCharacterDetails(characterId)
    state.longTermMemories = data.character?.longTermMemories || []
  }

  async function updateCharacterBio(characterId: string, bio: string): Promise<void> {
    await persistCharacterBio(characterId, bio)
  }

  async function createLongTermMemory(characterId: string, content: string): Promise<void> {
    await createCharacterLongTermMemory(characterId, content)
    await loadCharacterDetails(characterId)
  }

  async function updateLongTermMemory(characterId: string, memoryId: string, content: string): Promise<void> {
    await updateCharacterLongTermMemory(memoryId, content)
    await loadCharacterDetails(characterId)
  }

  async function deleteLongTermMemory(characterId: string, memoryId: string): Promise<void> {
    await deleteCharacterLongTermMemory(memoryId)
    await loadCharacterDetails(characterId)
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
    executeTick,
    logActivity,
    applyActionEffects,
    executeAction,
    enqueueIntent,
    loadCharacterDetails,
    updateCharacterBio,
    createLongTermMemory,
    updateLongTermMemory,
    deleteLongTermMemory,
    startAutoTick,
    pauseAutoTick,
    resetSimulation,
    updateCharacterLocation,
    loadWorldData,
    setActiveCharacter
  }
})
