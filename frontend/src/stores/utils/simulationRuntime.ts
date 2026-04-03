import type { Ref } from 'vue'
import type {
  ActionName,
  ActivityLogEntry,
  CharacterState,
  Intent,
  ItemOccupancy,
  WorldData
} from '../types'
import { ACTION_EFFECTS } from '../config/actionEffects'
import { applyActionToCharacterState } from './actionState'
import {
  buildMovementPlan,
  buildStartedActionPlan,
  validateIntentItemAvailability
} from './actionExecution'
import {
  finalizeStartedIntent,
  handleIdleIntent,
  handleStartActivityFailure,
  handleUnavailableIntent,
  performIntentMovement
} from './actionFlow'
import { createActivityLogEntry, updateStateLocation } from './characterState'
import { assignItemOccupancy, clearCharacterOccupancy } from './itemOccupancy'
import { createTaskFromIntent, getActionDuration } from './taskLifecycle'
import { progressActiveTask } from './taskProgression'
import { executeTick as runTick } from './tickExecution'

const MAX_LOG_ENTRIES = 100

export interface SimulationRuntimeRefs {
  currentTick: Ref<number>
  isPaused: Ref<boolean>
  tickIntervalId: Ref<NodeJS.Timeout | null>
  activityLog: Ref<ActivityLogEntry[]>
  characterStates: Ref<Record<string, CharacterState>>
  worldData: Ref<WorldData>
  itemOccupancy: Ref<ItemOccupancy>
  activeCharacterId: Ref<string | null>
}

export interface SimulationRuntimeDependencies {
  recordShortTermMemory: (characterId: string, intent: Intent) => void
  moveCharacterToLot: (characterId: string, lotId: string) => Promise<void>
  startCharacterActivity: (characterId: string, action: ActionName) => Promise<void>
}

export function createSimulationRuntime(
  refs: SimulationRuntimeRefs,
  dependencies: SimulationRuntimeDependencies
) {
  function logActivity(characterId: string, action: string, details: string): void {
    const logEntry = createActivityLogEntry(refs.currentTick.value, characterId, action, details)

    refs.activityLog.value.push(logEntry)
    if (refs.activityLog.value.length > MAX_LOG_ENTRIES) {
      refs.activityLog.value = refs.activityLog.value.slice(-MAX_LOG_ENTRIES)
    }

    console.log(`[Tick ${refs.currentTick.value}] Character ${characterId}: ${action} - ${details}`)
  }

  function setItemOccupancy(characterId: string, itemId: string): void {
    assignItemOccupancy(refs.itemOccupancy.value, characterId, itemId)
    console.log(`  🪑 ${characterId} now occupying ${itemId}`)
  }

  function clearItemOccupancy(characterId: string): void {
    const occupiedItemIds = Object.keys(refs.itemOccupancy.value).filter((itemId) =>
      refs.itemOccupancy.value[itemId]?.includes(characterId)
    )

    clearCharacterOccupancy(refs.itemOccupancy.value, characterId)

    for (const itemId of occupiedItemIds) {
      console.log(`  🚪 ${characterId} no longer occupying ${itemId}`)
    }
  }

  function updateCharacterLocation(
    characterId: string,
    regionId: string | null,
    lotId: string,
    lotName: string,
    spaceId: string,
    spaceName: string
  ): void {
    if (refs.characterStates.value[characterId]) {
      updateStateLocation(refs.characterStates.value[characterId], {
        regionId,
        lotId,
        lotName,
        spaceId,
        spaceName
      })
    }
  }

  function applyActionEffects(characterId: string, action: ActionName, itemName: string | null = null): void {
    const actionData = ACTION_EFFECTS[action]
    if (!actionData) {
      console.error(`❌ Unknown action: ${action}`)
      return
    }

    const state = refs.characterStates.value[characterId]
    if (!state) {
      console.error(`❌ Character not found: ${characterId}`)
      return
    }

    console.log(`⚡ Applying action "${action}" to character ${characterId}`)

    const stateChange = applyActionToCharacterState(state, action, actionData)

    if (stateChange.primaryNeedChange) {
      const { need, oldValue, newValue, effect } = stateChange.primaryNeedChange
      console.log(`  ✓ ${need}: ${oldValue.toFixed(2)} → ${newValue.toFixed(2)} (+${effect})`)
    }

    for (const change of stateChange.secondaryNeedChanges) {
      console.log(
        `  ✓ ${change.need}: ${change.oldValue.toFixed(2)} → ${change.newValue.toFixed(2)} (${change.effect >= 0 ? '+' : ''}${change.effect})`
      )
    }

    if (stateChange.cooldownTicksApplied !== null) {
      console.log(`  ✓ Cooldown set: ${stateChange.cooldownTicksApplied} ticks`)
    }

    const details = itemName ? `using ${itemName}` : 'action performed'
    logActivity(characterId, action, details)

    console.log(`✅ Action "${action}" applied successfully`)
  }

  async function completeIntent(characterId: string, intent: Intent): Promise<void> {
    applyActionEffects(characterId, intent.action, intent.itemName || intent.socialTargetName || null)

    if (intent.itemId) {
      setItemOccupancy(characterId, intent.itemId)
    }

    dependencies.recordShortTermMemory(characterId, intent)
  }

  async function progressTask(characterId: string): Promise<boolean> {
    const state = refs.characterStates.value[characterId]
    if (!state) {
      return false
    }

    return progressActiveTask(characterId, state, {
      logActivity,
      completeIntent,
      clearItemOccupancy
    })
  }

  async function executeAction(characterId: string, intent: Intent): Promise<void> {
    const state = refs.characterStates.value[characterId]
    if (!state) {
      console.error(`❌ Character not found: ${characterId}`)
      return
    }

    console.log(`\n⚡ Executing action for ${characterId}`)

    if (intent.action === 'idle') {
      handleIdleIntent(characterId, state, { clearItemOccupancy, logActivity })
      console.log(`  ${characterId}: idle (no actions available)`)
      return
    }

    const availability = validateIntentItemAvailability(intent, refs.worldData.value, refs.itemOccupancy.value)
    if (!availability.available) {
      const currentOccupants = intent.itemId ? refs.itemOccupancy.value[intent.itemId] || [] : []
      const maxUsers = intent.itemId ? refs.worldData.value.items[intent.itemId]?.maxSimultaneousUsers : null
      console.log(`  ⚠️  Item ${intent.itemName} became full during this tick (${currentOccupants.length}/${maxUsers})`)
      console.log(`  ${characterId}: falling back to idle`)
      handleUnavailableIntent(characterId, state, availability.reason || `${intent.itemName} became unavailable`, {
        clearItemOccupancy,
        logActivity
      })
      return
    }

    const movementPlan = buildMovementPlan(state.location, intent)
    if (intent.travelCost && intent.travelCost > 0 && !movementPlan.targetLotId) {
      console.warn('  ⚠️  No target lot specified for movement')
      return
    }

    if (movementPlan.shouldMove && movementPlan.targetLotId) {
      console.log(`  🚶 Moving ${characterId} from ${state.location?.lotName || 'unknown'} to ${intent.targetLotName}`)

      try {
        await performIntentMovement(characterId, state, movementPlan, {
          moveCharacterToLot: dependencies.moveCharacterToLot,
          updateCharacterLocation
        })

        console.log(`  ✓ Moved to ${intent.targetLotName} (${intent.targetSpaceName})`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`  ❌ Failed to move character: ${errorMessage}`)
      }
    }

    try {
      await dependencies.startCharacterActivity(characterId, intent.action)
      console.log(`  ✓ Started activity "${intent.action}" in database`)

      const duration = getActionDuration(intent.action)
      const startedActionPlan = buildStartedActionPlan(intent, duration)
      await finalizeStartedIntent(characterId, state, intent, startedActionPlan, {
        setItemOccupancy,
        createTaskFromIntent,
        completeIntent,
        logActivity
      })
    } catch (error) {
      const errorMessage = await handleStartActivityFailure(characterId, intent, error, {
        clearItemOccupancy,
        logActivity
      })
      console.error(`  ❌ Failed to start activity in database: ${errorMessage}`)
    }
  }

  async function executeTick() {
    await runTick({
      currentTick: refs.currentTick,
      characterStates: refs.characterStates,
      worldData: refs.worldData,
      itemOccupancy: refs.itemOccupancy,
      activityLog: refs.activityLog,
      executeAction,
      progressTask
    })
  }

  function pauseAutoTick() {
    if (refs.tickIntervalId.value) {
      clearInterval(refs.tickIntervalId.value)
      refs.tickIntervalId.value = null
    }
    refs.isPaused.value = true
    console.log('Auto-tick paused')
  }

  function startAutoTick() {
    if (refs.tickIntervalId.value) return

    refs.isPaused.value = false
    refs.tickIntervalId.value = setInterval(() => {
      executeTick()
    }, 5000)

    console.log('Auto-tick started (5s interval)')
  }

  function resetSimulation() {
    pauseAutoTick()
    refs.currentTick.value = 0
    refs.activityLog.value = []
    refs.characterStates.value = {}
    refs.itemOccupancy.value = {}
    refs.activeCharacterId.value = null
    console.log('Simulation reset')
  }

  return {
    executeTick,
    logActivity,
    applyActionEffects,
    executeAction,
    progressTask,
    startAutoTick,
    pauseAutoTick,
    resetSimulation,
    updateCharacterLocation,
    setItemOccupancy,
    clearItemOccupancy
  }
}
