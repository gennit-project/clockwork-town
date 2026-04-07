import type { Ref } from 'vue'
import type {
  ActionName,
  ActivityLogEntry,
  AutoTickSpeed,
  CharacterState,
  Intent,
  ItemOccupancy,
  SimulationDateTime,
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
import { updateStateLocation } from './characterState'
import { assignItemOccupancy, clearCharacterOccupancy } from './itemOccupancy'
import { createSimulationLogger } from './simulationLogger'
import { createTaskFromIntent, getActionDuration } from './taskLifecycle'
import { progressActiveTask } from './taskProgression'
import { executeTick as runTick } from './tickExecution'
import { createSimulationDateTime } from './simulationCalendar'

export interface SimulationRuntimeRefs {
  currentTick: Ref<number>
  simulationDateTime: Ref<SimulationDateTime>
  isPaused: Ref<boolean>
  tickIntervalId: Ref<NodeJS.Timeout | null>
  activityLog: Ref<ActivityLogEntry[]>
  characterStates: Ref<Record<string, CharacterState>>
  worldData: Ref<WorldData>
  itemOccupancy: Ref<ItemOccupancy>
  activeCharacterId: Ref<string | null>
  autoTickSpeed: Ref<AutoTickSpeed>
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
  const AUTO_TICK_INTERVALS: Record<AutoTickSpeed, number> = {
    slow: 5000,
    normal: 2000,
    fast: 750
  }

  const logger = createSimulationLogger({
    currentTick: refs.currentTick,
    activityLog: refs.activityLog
  })

  const { logActivity } = logger

  function setItemOccupancy(characterId: string, itemId: string): void {
    assignItemOccupancy(refs.itemOccupancy.value, characterId, itemId)
    logger.logItemOccupied(characterId, itemId)
  }

  function clearItemOccupancy(characterId: string): void {
    const occupiedItemIds = Object.keys(refs.itemOccupancy.value).filter((itemId) =>
      refs.itemOccupancy.value[itemId]?.includes(characterId)
    )

    clearCharacterOccupancy(refs.itemOccupancy.value, characterId)

    for (const itemId of occupiedItemIds) {
      logger.logItemReleased(characterId, itemId)
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
      logger.logUnknownAction(action)
      return
    }

    const state = refs.characterStates.value[characterId]
    if (!state) {
      logger.logMissingCharacter(characterId)
      return
    }

    logger.debug(`⚡ Applying action "${action}" to character ${characterId}`)

    const stateChange = applyActionToCharacterState(state, action, actionData)

    if (stateChange.primaryNeedChange) {
      const { need, oldValue, newValue, effect } = stateChange.primaryNeedChange
      logger.logNeedChange(need, oldValue, newValue, effect)
    }

    for (const change of stateChange.secondaryNeedChanges) {
      logger.logNeedChange(change.need, change.oldValue, change.newValue, change.effect)
    }

    if (stateChange.cooldownTicksApplied !== null) {
      logger.logCooldownApplied(stateChange.cooldownTicksApplied)
    }

    const details = itemName ? `using ${itemName}` : 'action performed'
    logActivity(characterId, action, details)

    logger.logActionApplied(action, characterId)
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
      logger.logMissingCharacter(characterId)
      return
    }

    logger.logCharacterActionStart(characterId)

    if (intent.action === 'idle') {
      handleIdleIntent(characterId, state, { clearItemOccupancy, logActivity })
      logger.logIdle(characterId)
      return
    }

    const availability = validateIntentItemAvailability(intent, refs.worldData.value, refs.itemOccupancy.value)
    if (!availability.available) {
      const currentOccupants = intent.itemId ? refs.itemOccupancy.value[intent.itemId] || [] : []
      const maxUsers = intent.itemId ? refs.worldData.value.items[intent.itemId]?.maxSimultaneousUsers : null
      logger.logUnavailableItem(characterId, intent.itemName, currentOccupants.length, maxUsers)
      handleUnavailableIntent(characterId, state, availability.reason || `${intent.itemName} became unavailable`, {
        clearItemOccupancy,
        logActivity
      })
      return
    }

    const movementPlan = buildMovementPlan(state.location, intent)
    if (intent.travelCost && intent.travelCost > 0 && !movementPlan.targetLotId) {
      logger.warn('  ⚠️  No target lot specified for movement')
      return
    }

    if (movementPlan.shouldMove && movementPlan.targetLotId) {
      logger.logMoveStart(characterId, state.location?.lotName, intent.targetLotName)

      try {
        await performIntentMovement(characterId, state, movementPlan, {
          moveCharacterToLot: dependencies.moveCharacterToLot,
          updateCharacterLocation
        })

        logger.logMoveSuccess(intent.targetLotName, intent.targetSpaceName)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`  ❌ Failed to move character: ${errorMessage}`)
      }
    }

    try {
      await dependencies.startCharacterActivity(characterId, intent.action)
      logger.logActivityStart(intent.action)

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
      logger.error(`  ❌ Failed to start activity in database: ${errorMessage}`)
    }
  }

  async function executeTick() {
    await runTick({
      currentTick: refs.currentTick,
      simulationDateTime: refs.simulationDateTime,
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
    logger.logAutoTickPaused()
  }

  function startAutoTick() {
    if (refs.tickIntervalId.value) return

    refs.isPaused.value = false
    refs.tickIntervalId.value = setInterval(() => {
      executeTick()
    }, AUTO_TICK_INTERVALS[refs.autoTickSpeed.value])

    logger.logAutoTickStarted()
  }

  function setAutoTickSpeed(speed: AutoTickSpeed) {
    refs.autoTickSpeed.value = speed

    if (!refs.isPaused.value) {
      pauseAutoTick()
      startAutoTick()
    }
  }

  function resetSimulation() {
    pauseAutoTick()
    refs.currentTick.value = 0
    refs.simulationDateTime.value = createSimulationDateTime()
    refs.activityLog.value = []
    refs.characterStates.value = {}
    refs.itemOccupancy.value = {}
    refs.activeCharacterId.value = null
    logger.logSimulationReset()
  }

  return {
    executeTick,
    logActivity,
    applyActionEffects,
    executeAction,
    progressTask,
    startAutoTick,
    pauseAutoTick,
    setAutoTickSpeed,
    resetSimulation,
    updateCharacterLocation,
    setItemOccupancy,
    clearItemOccupancy
  }
}
