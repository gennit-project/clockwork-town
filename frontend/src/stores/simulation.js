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

    // Phase 2-3: Decision & Execution (stub for now)
    // TODO: Implement utility-based decision making and action execution
    for (const characterId in characterStates.value) {
      const state = characterStates.value[characterId]

      // For now, just log that character is idle
      logActivity(characterId, 'idle', 'Waiting for tick engine implementation')
    }

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
  function updateCharacterLocation(characterId, lotId, lotName, spaceId, spaceName) {
    if (characterStates.value[characterId]) {
      characterStates.value[characterId].location = {
        lotId,
        lotName,
        spaceId,
        spaceName
      }
    }
  }

  return {
    // State
    currentTick,
    isPaused,
    activityLog,
    characterStates,

    // Getters
    isRunning,
    getCharacterState,
    recentActivityLog,

    // Actions
    initializeCharacter,
    executeTick,
    logActivity,
    startAutoTick,
    pauseAutoTick,
    resetSimulation,
    updateCharacterLocation
  }
})
