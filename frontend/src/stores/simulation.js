import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ============================================
// ACTION EFFECTS DATA (from TICKS.md)
// ============================================

/**
 * Defines the effects and cooldowns for each action type
 * Effects are applied immediately when action executes
 */
const ACTION_EFFECTS = {
  eat: {
    primaryNeed: 'food',
    primaryEffect: 0.35,
    secondaryEffects: {},
    cooldownTicks: 6  // 30 minutes
  },
  sleep: {
    primaryNeed: 'sleep',
    primaryEffect: 0.50,
    secondaryEffects: {},
    cooldownTicks: 12  // 60 minutes
  },
  medicate: {
    primaryNeed: 'health',
    primaryEffect: 0.40,
    secondaryEffects: {},
    cooldownTicks: 12  // 60 minutes
  },
  chat_friend: {
    primaryNeed: 'friends',
    primaryEffect: 0.25,
    secondaryEffects: {},
    cooldownTicks: 9  // 45 minutes
  },
  call_mom: {
    primaryNeed: 'family',
    primaryEffect: 0.30,
    secondaryEffects: {},
    cooldownTicks: 12  // 60 minutes
  },
  date: {
    primaryNeed: 'romance',
    primaryEffect: 0.35,
    secondaryEffects: { friends: 0.10 },
    cooldownTicks: 18  // 90 minutes
  },
  read: {
    primaryNeed: 'fulfillment',
    primaryEffect: 0.20,
    secondaryEffects: { friends: -0.05 },
    cooldownTicks: 9  // 45 minutes
  },
  write: {
    primaryNeed: 'fulfillment',
    primaryEffect: 0.25,
    secondaryEffects: { friends: -0.05 },
    cooldownTicks: 12  // 60 minutes
  },
  view_art: {
    primaryNeed: 'fulfillment',
    primaryEffect: 0.20,
    secondaryEffects: { friends: 0.05 },
    cooldownTicks: 6  // 30 minutes
  },
  volunteer: {
    primaryNeed: 'fulfillment',
    primaryEffect: 0.30,
    secondaryEffects: { family: 0.10 },
    cooldownTicks: 18  // 90 minutes
  },
  work: {
    primaryNeed: 'money',  // Note: money not tracked in v0
    primaryEffect: 0,
    secondaryEffects: { sleep: -0.15 },
    cooldownTicks: 48  // 240 minutes
  },
  idle: {
    primaryNeed: null,
    primaryEffect: 0,
    secondaryEffects: {},
    cooldownTicks: 1  // 5 minutes
  }
}

// Log action effects on module load for debugging
console.log('📊 ACTION_EFFECTS loaded:', ACTION_EFFECTS)

/**
 * Need weights for utility calculation
 * Higher weight = more important/urgent
 */
const NEED_WEIGHTS = {
  // Basic needs (physical survival)
  food: 3.0,
  sleep: 3.0,
  health: 2.5,

  // Emotional needs (social connection)
  friends: 2.0,
  family: 2.0,
  romance: 1.5,

  // Self-actualization
  fulfillment: 1.0
}

console.log('⚖️  NEED_WEIGHTS loaded:', NEED_WEIGHTS)

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

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Initialize a character's state in the simulation
   */
  function initializeCharacter(character) {
    if (!characterStates.value[character.id]) {
      characterStates.value[character.id] = {
        needs: {
          food: 0.8,
          sleep: 0.8,
          health: 0.9,
          friends: 0.7,
          family: 0.7,
          romance: 0.6,
          fulfillment: 0.6
        },
        cooldowns: {
          eat: 0,
          sleep: 0,
          medicate: 0,
          chat_friend: 0,
          call_mom: 0,
          date: 0,
          read: 0,
          write: 0,
          view_art: 0,
          volunteer: 0,
          work: 0
        },
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
  function executeTick() {
    currentTick.value++

    console.log(`\n========== TICK ${currentTick.value} ==========`)

    // Phase 1: Decay all needs and cooldowns
    for (const characterId in characterStates.value) {
      const state = characterStates.value[characterId]

      // Decay needs
      state.needs.food = Math.max(0, state.needs.food - 0.04)
      state.needs.sleep = Math.max(0, state.needs.sleep - 0.02)
      state.needs.health = Math.max(0, state.needs.health - 0.01)
      state.needs.friends = Math.max(0, state.needs.friends - 0.015)
      state.needs.family = Math.max(0, state.needs.family - 0.01)
      state.needs.romance = Math.max(0, state.needs.romance - 0.01)
      state.needs.fulfillment = Math.max(0, state.needs.fulfillment - 0.008)

      // Decrement cooldowns
      for (const action in state.cooldowns) {
        if (state.cooldowns[action] > 0) {
          state.cooldowns[action]--
        }
      }
    }

    // Phase 2: Decision Making
    console.log('\n--- Phase 2: Decision Making ---')
    for (const characterId in characterStates.value) {
      // Select the best intent for this character
      const intent = selectBestIntent(characterId)

      // Log the intent (execution will be implemented in Step 12)
      if (intent.action === 'idle') {
        logActivity(characterId, 'idle', 'No satisfying actions available')
        console.log(`  ${characterId}: intends to idle (no satisfying actions)`)
      } else {
        const intentDetails = `intends to ${intent.action} at ${intent.itemName} (${intent.targetSpaceName}, ${intent.targetLotName}) - utility: ${intent.utility.toFixed(2)}`
        logActivity(characterId, intent.action, intentDetails)
        console.log(`  ${characterId}: ${intentDetails}`)
      }
    }

    // Phase 3: Execution (will be implemented in Step 12)
    console.log('\n--- Phase 3: Execution (not yet implemented) ---')

    // Log full state to console for debugging
    console.log('Character States:', JSON.parse(JSON.stringify(characterStates.value)))
    console.log('Activity Log:', activityLog.value.slice(-10))
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
    console.log('🗺️  Loading world data for pathfinding...')

    const newWorldData = {
      lots: {},
      spaces: {},
      items: {},
      itemsByAffordance: {}
    }

    // Process each lot
    for (const lot of lots) {
      const spaceIds = []

      // Combine indoor rooms and outdoor areas
      const allSpaces = [
        ...(lot.indoorRooms || []),
        ...(lot.outdoorAreas || [])
      ]

      // Process each space
      for (const space of allSpaces) {
        spaceIds.push(space.id)

        const itemIds = []

        // Process each item in the space
        for (const item of (space.items || [])) {
          itemIds.push(item.id)

          // Store item data
          newWorldData.items[item.id] = {
            id: item.id,
            name: item.name,
            spaceId: space.id,
            lotId: lot.id,
            regionId: regionId,
            allowedActivities: item.allowedActivities || []
          }

          // Index by affordance
          for (const action of (item.allowedActivities || [])) {
            if (!newWorldData.itemsByAffordance[action]) {
              newWorldData.itemsByAffordance[action] = []
            }
            newWorldData.itemsByAffordance[action].push(item.id)
          }
        }

        // Store space data
        newWorldData.spaces[space.id] = {
          id: space.id,
          name: space.name,
          lotId: lot.id,
          itemIds
        }
      }

      // Store lot data
      newWorldData.lots[lot.id] = {
        id: lot.id,
        name: lot.name,
        regionId: regionId,
        spaceIds
      }
    }

    worldData.value = newWorldData

    console.log(`✅ World data loaded:`)
    console.log(`  - ${Object.keys(newWorldData.lots).length} lots`)
    console.log(`  - ${Object.keys(newWorldData.spaces).length} spaces`)
    console.log(`  - ${Object.keys(newWorldData.items).length} items`)
    console.log(`  - ${Object.keys(newWorldData.itemsByAffordance).length} action types with items`)
    console.log('World data:', newWorldData)
  }

  /**
   * Find items with a specific affordance (action) accessible to a character
   * Step 8: Same space (cost 0) + Same lot (cost 1) + Same region (cost 2)
   *
   * @param {string} characterId - Character ID
   * @param {string} action - Action name (e.g., 'eat', 'sleep')
   * @returns {Array} Array of item options: [{ itemId, itemName, spaceId, spaceName, lotId, lotName, travelCost }]
   */
  function findItemsWithAffordance(characterId, action) {
    const charState = characterStates.value[characterId]
    if (!charState) {
      console.warn(`Character ${characterId} not found in characterStates`)
      return []
    }

    const currentSpaceId = charState.location?.spaceId
    const currentLotId = charState.location?.lotId
    const currentRegionId = charState.location?.regionId
    if (!currentSpaceId || !currentLotId || !currentRegionId) {
      console.warn(`Character ${characterId} has incomplete location data`)
      return []
    }

    const results = []

    // Get all items with this affordance
    const itemIdsWithAction = worldData.value.itemsByAffordance[action] || []

    // Check each item for accessibility
    for (const itemId of itemIdsWithAction) {
      const item = worldData.value.items[itemId]
      const space = worldData.value.spaces[item.spaceId]
      const lot = worldData.value.lots[item.lotId]

      let travelCost = null

      // Same space (cost 0)
      if (item.spaceId === currentSpaceId) {
        travelCost = 0
      }
      // Same lot, different space (cost 1)
      else if (item.lotId === currentLotId) {
        travelCost = 1
      }
      // Same region, different lot (cost 2)
      else if (item.regionId === currentRegionId) {
        travelCost = 2
      }

      // If accessible, add to results
      if (travelCost !== null) {
        results.push({
          itemId: item.id,
          itemName: item.name,
          spaceId: item.spaceId,
          spaceName: space.name,
          lotId: item.lotId,
          lotName: lot.name,
          travelCost
        })
      }
    }

    // Sort by travel cost (lower is better)
    results.sort((a, b) => a.travelCost - b.travelCost)

    console.log(`🔍 findItemsWithAffordance('${characterId}', '${action}'):`)
    console.log(`  Found ${results.length} items (cost 0: ${results.filter(r => r.travelCost === 0).length}, cost 1: ${results.filter(r => r.travelCost === 1).length}, cost 2: ${results.filter(r => r.travelCost === 2).length})`)
    console.log('  Results:', results)
    return results
  }

  /**
   * Calculate utility score for a character performing an action at a specific item
   * Step 9: Utility = (need weight × need deficit) - travel cost + context bonus
   *
   * @param {string} characterId - Character ID
   * @param {string} action - Action name (e.g., 'eat', 'sleep')
   * @param {object} itemOption - Item option from findItemsWithAffordance
   * @returns {number} Utility score (higher is better)
   */
  function calculateUtility(characterId, action, itemOption) {
    const charState = characterStates.value[characterId]
    if (!charState) {
      console.warn(`Character ${characterId} not found in characterStates`)
      return -Infinity
    }

    const actionData = ACTION_EFFECTS[action]
    if (!actionData) {
      console.warn(`Unknown action: ${action}`)
      return -Infinity
    }

    // Get the primary need this action satisfies
    const primaryNeed = actionData.primaryNeed
    if (!primaryNeed) {
      // Idle or actions without primary needs have no utility
      return 0
    }

    // Calculate need deficit (1.0 - current need value)
    const currentNeedValue = charState.needs[primaryNeed] || 0
    const needDeficit = 1.0 - currentNeedValue

    // Get need weight
    const needWeight = NEED_WEIGHTS[primaryNeed] || 1.0

    // Calculate base utility: needWeight × needDeficit
    const baseUtility = needWeight * needDeficit

    // Travel penalty (from pathfinding cost)
    const travelPenalty = itemOption.travelCost

    // Context bonus (will be implemented in Step 14 for trait-based bonuses)
    const contextBonus = 0

    // Final utility
    const utility = baseUtility - travelPenalty + contextBonus

    return utility
  }

  /**
   * Select the best action intent for a character
   * Step 10: Evaluate all actions, find items, calculate utilities, return best intent
   *
   * @param {string} characterId - Character ID
   * @returns {object} Intent: { action, itemId, itemName, targetSpaceId, targetLotId, utility }
   */
  function selectBestIntent(characterId) {
    const charState = characterStates.value[characterId]
    if (!charState) {
      console.warn(`Character ${characterId} not found in characterStates`)
      return { action: 'idle', utility: 0 }
    }

    console.log(`\n🎯 selectBestIntent for character ${characterId}`)

    // All possible actions (excluding idle and work for now)
    const possibleActions = ['eat', 'sleep', 'medicate', 'chat_friend', 'call_mom', 'date', 'read', 'write', 'view_art', 'volunteer']

    const intents = []

    // Evaluate each action
    for (const action of possibleActions) {
      // Check if action is on cooldown
      if (charState.cooldowns[action] > 0) {
        console.log(`  ❌ ${action}: on cooldown (${charState.cooldowns[action]} ticks remaining)`)
        continue
      }

      // Find items that support this action
      const items = findItemsWithAffordance(characterId, action)

      if (items.length === 0) {
        console.log(`  ❌ ${action}: no accessible items`)
        continue
      }

      // Get the best (closest) item
      const bestItem = items[0]

      // Calculate utility
      const utility = calculateUtility(characterId, action, bestItem)

      console.log(`  ✓ ${action}: utility ${utility.toFixed(2)} (${bestItem.itemName} in ${bestItem.spaceName}, cost ${bestItem.travelCost})`)

      intents.push({
        action,
        itemId: bestItem.itemId,
        itemName: bestItem.itemName,
        targetSpaceId: bestItem.spaceId,
        targetSpaceName: bestItem.spaceName,
        targetLotId: bestItem.lotId,
        targetLotName: bestItem.lotName,
        travelCost: bestItem.travelCost,
        utility
      })
    }

    // If no valid intents, return idle
    if (intents.length === 0) {
      console.log(`  ⚠️  No valid actions available - returning idle`)
      return {
        action: 'idle',
        utility: 0
      }
    }

    // Sort by utility (highest first)
    intents.sort((a, b) => b.utility - a.utility)

    const bestIntent = intents[0]
    console.log(`\n  🏆 Best intent: ${bestIntent.action} (utility ${bestIntent.utility.toFixed(2)})`)
    console.log(`     Item: ${bestIntent.itemName}`)
    console.log(`     Location: ${bestIntent.targetSpaceName} (${bestIntent.targetLotName})`)
    console.log(`     Travel cost: ${bestIntent.travelCost}`)

    return bestIntent
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

    // Actions
    initializeCharacter,
    executeTick,
    logActivity,
    applyActionEffects,
    startAutoTick,
    pauseAutoTick,
    resetSimulation,
    updateCharacterLocation,
    loadWorldData,
    findItemsWithAffordance,
    calculateUtility,
    selectBestIntent
  }
})
