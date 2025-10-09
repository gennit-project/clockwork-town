import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { client, mutations } from '../graphql'
import { ACTION_EFFECTS } from './config/actionEffects.js'
import { INITIAL_NEEDS, INITIAL_COOLDOWNS } from './config/needs.js'
import { buildWorldData } from './utils/pathfinding.js'
import { executeTick as runTick } from './utils/tickExecution.js'

export const useSimulationStore = defineStore('simulation', () => {
  // ============================================
  // STATE
  // ============================================

  // Tick state
  const currentTick = ref(0)
  const isPaused = ref(true)
  const tickIntervalId = ref(null)

  // Activity log (for UI display)
  const activityLog = ref([])
  const MAX_LOG_ENTRIES = 100

  // Character state (needs & cooldowns)
  // Structure: { [characterId]: { needs: {...}, cooldowns: {...}, currentAction: string, location: {...} } }
  const characterStates = ref({})

  // Item occupancy tracking (which characters are using which items right now)
  // Structure: { [itemId]: [characterId1, characterId2, ...] }
  const itemOccupancy = ref({})

  // World data for pathfinding (lots, spaces, items)
  const worldData = ref({
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
  const getCharacterState = computed(() => (characterId) => {
    return characterStates.value[characterId] || null
  })

  // Get recent activity log entries (newest first)
  const recentActivityLog = computed(() => {
    return [...activityLog.value].reverse().slice(0, 50)
  })

  // Get active users for a specific item (returns array of character objects)
  const getItemActiveUsers = computed(() => (itemId) => {
    const occupantIds = itemOccupancy.value[itemId] || []
    return occupantIds.map(charId => {
      const charState = characterStates.value[charId]
      return charState ? {
        id: charId,
        name: charState.name || 'Unknown'
      } : null
    }).filter(char => char !== null)
  })

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Initialize a character's state in the simulation
   */
  function initializeCharacter(character) {
    if (!characterStates.value[character.id]) {
      characterStates.value[character.id] = {
        name: character.name || 'Unknown',
        needs: { ...INITIAL_NEEDS },
        cooldowns: { ...INITIAL_COOLDOWNS },
        currentAction: 'idle',
        location: {
          lotId: null,
          lotName: null,
          spaceId: null,
          spaceName: null
        },
        traits: character.traits || []
      }
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
      activityLog,
      executeAction
    })
  }

  /**
   * Log an activity to the activity log
   */
  function logActivity(characterId, action, details) {
    const logEntry = {
      tick: currentTick.value,
      timestamp: new Date().toISOString(),
      characterId,
      action,
      details
    }

    activityLog.value.push(logEntry)

    // Trim log if too large
    if (activityLog.value.length > MAX_LOG_ENTRIES) {
      activityLog.value = activityLog.value.slice(-MAX_LOG_ENTRIES)
    }

    console.log(`[Tick ${currentTick.value}] Character ${characterId}: ${action} - ${details}`)
  }

  /**
   * Apply the effects of an action to a character's needs
   * Updates needs, sets cooldown, and updates current action
   *
   * @param {string} characterId - The character performing the action
   * @param {string} action - The action name (e.g., 'eat', 'sleep', 'read')
   * @param {string} [itemName] - Optional item name for logging
   */
  function applyActionEffects(characterId, action, itemName = null) {
    // Validate action exists
    if (!ACTION_EFFECTS[action]) {
      console.error(`❌ Unknown action: ${action}`)
      return
    }

    // Get character state
    const state = characterStates.value[characterId]
    if (!state) {
      console.error(`❌ Character not found: ${characterId}`)
      return
    }

    const actionData = ACTION_EFFECTS[action]

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
      const oldValue = state.needs[need]
      state.needs[need] = Math.min(1.0, Math.max(0, oldValue + effect))
      const newValue = state.needs[need]
      console.log(`  ✓ ${need}: ${oldValue.toFixed(2)} → ${newValue.toFixed(2)} (${effect >= 0 ? '+' : ''}${effect})`)
    }

    // Set cooldown
    state.cooldowns[action] = actionData.cooldownTicks
    console.log(`  ✓ Cooldown set: ${actionData.cooldownTicks} ticks`)

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
   * @param {string} characterId - The character performing the action
   * @param {object} intent - The intent object from selectBestIntent()
   */
  async function executeAction(characterId, intent) {
    const state = characterStates.value[characterId]
    if (!state) {
      console.error(`❌ Character not found: ${characterId}`)
      return
    }

    console.log(`\n⚡ Executing action for ${characterId}`)

    // Handle idle case
    if (intent.action === 'idle') {
      state.currentAction = 'idle'
      // Clear any item occupancy for this character
      clearItemOccupancy(characterId)
      logActivity(characterId, 'idle', 'No satisfying actions available')
      console.log(`  ${characterId}: idle (no actions available)`)
      return
    }

    // Step 13: Handle movement if needed (travelCost > 0)
    if (intent.travelCost > 0) {
      const currentLotId = state.location?.lotId
      const targetLotId = intent.targetLotId

      if (currentLotId !== targetLotId) {
        console.log(`  🚶 Moving ${characterId} from ${state.location?.lotName || 'unknown'} to ${intent.targetLotName}`)

        try {
          // Call GraphQL mutation to update database
          await client.request(mutations.moveCharacter, {
            input: {
              characterId,
              lotId: targetLotId
            }
          })

          // Update Pinia state
          updateCharacterLocation(
            characterId,
            state.location?.regionId, // Keep same region
            targetLotId,
            intent.targetLotName,
            intent.targetSpaceId,
            intent.targetSpaceName
          )

          console.log(`  ✓ Moved to ${intent.targetLotName} (${intent.targetSpaceName})`)
        } catch (error) {
          console.error(`  ❌ Failed to move character: ${error.message}`)
          // Continue with action even if movement fails
        }
      }
    }

    // Call backend mutation to create Activity and USING edge in database
    try {
      await client.request(mutations.startActivity, {
        input: {
          characterId,
          actionName: intent.action
        }
      })
      console.log(`  ✓ Started activity "${intent.action}" in database`)

      // Only apply effects if backend succeeded
      // Apply action effects (updates needs, sets cooldown, updates currentAction, logs activity)
      applyActionEffects(characterId, intent.action, intent.itemName)

      // Track item occupancy in Pinia
      if (intent.itemId) {
        setItemOccupancy(characterId, intent.itemId)
      }

      // Create memory
      const memory = {
        tick: currentTick.value,
        action: intent.action,
        item: intent.itemName,
        location: `${intent.targetSpaceName} (${intent.targetLotName})`,
        utility: intent.utility
      }

      // Store memory in character state (for future reference)
      if (!state.memories) {
        state.memories = []
      }
      state.memories.push(memory)

      // Keep only last 20 memories to avoid memory bloat
      if (state.memories.length > 20) {
        state.memories = state.memories.slice(-20)
      }

      console.log(`  📝 Memory created: ${intent.action} at ${intent.itemName}`)
    } catch (error) {
      console.error(`  ❌ Failed to start activity in database: ${error.message}`)
      // Don't apply effects if backend failed - character remains in previous state
      // Clear any item occupancy since action failed
      clearItemOccupancy(characterId)
      logActivity(characterId, 'failed', `Could not perform ${intent.action}: ${error.message}`)
    }
  }

  /**
   * Set item occupancy - add character to item's occupant list
   */
  function setItemOccupancy(characterId, itemId) {
    // First, clear any existing occupancy for this character
    clearItemOccupancy(characterId)

    // Add character to item's occupant list
    if (!itemOccupancy.value[itemId]) {
      itemOccupancy.value[itemId] = []
    }
    if (!itemOccupancy.value[itemId].includes(characterId)) {
      itemOccupancy.value[itemId].push(characterId)
      console.log(`  🪑 ${characterId} now occupying ${itemId}`)
    }
  }

  /**
   * Clear item occupancy - remove character from all items
   */
  function clearItemOccupancy(characterId) {
    for (const itemId in itemOccupancy.value) {
      const index = itemOccupancy.value[itemId].indexOf(characterId)
      if (index !== -1) {
        itemOccupancy.value[itemId].splice(index, 1)
        console.log(`  🚪 ${characterId} no longer occupying ${itemId}`)
        // Clean up empty arrays
        if (itemOccupancy.value[itemId].length === 0) {
          delete itemOccupancy.value[itemId]
        }
      }
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
    console.log('Simulation reset')
  }

  /**
   * Update character location
   */
  function updateCharacterLocation(characterId, regionId, lotId, lotName, spaceId, spaceName) {
    if (characterStates.value[characterId]) {
      characterStates.value[characterId].location = {
        regionId,
        lotId,
        lotName,
        spaceId,
        spaceName
      }
    }
  }

  /**
   * Load world data (lots, spaces, items) for pathfinding
   * @param {Array} lots - Array of lot objects with indoorRooms and outdoorAreas
   * @param {string} regionId - Region ID that these lots belong to
   */
  function loadWorldData(lots, regionId) {
    worldData.value = buildWorldData(lots, regionId)
  }


  return {
    // State
    currentTick,
    isPaused,
    activityLog,
    characterStates,
    worldData,

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
    startAutoTick,
    pauseAutoTick,
    resetSimulation,
    updateCharacterLocation,
    loadWorldData
  }
})
