import type { Ref } from 'vue'
import type { ActivityLogEntry, CharacterState } from '../types'
import { createActivityLogEntry } from './characterState'

const MAX_LOG_ENTRIES = 100

export interface SimulationLoggerRefs {
  currentTick: Ref<number>
  activityLog: Ref<ActivityLogEntry[]>
}

export function createSimulationLogger(refs: SimulationLoggerRefs) {
  function addActivityEntry(characterId: string, action: string, details: string): void {
    const logEntry = createActivityLogEntry(refs.currentTick.value, characterId, action, details)

    refs.activityLog.value.push(logEntry)
    if (refs.activityLog.value.length > MAX_LOG_ENTRIES) {
      refs.activityLog.value = refs.activityLog.value.slice(-MAX_LOG_ENTRIES)
    }
  }

  function logActivity(characterId: string, action: string, details: string): void {
    addActivityEntry(characterId, action, details)
    console.log(`[Tick ${refs.currentTick.value}] Character ${characterId}: ${action} - ${details}`)
  }

  function debug(message: string): void {
    console.log(message)
  }

  function warn(message: string): void {
    console.warn(message)
  }

  function error(message: string): void {
    console.error(message)
  }

  function logCharacterActionStart(characterId: string): void {
    debug(`\n⚡ Executing action for ${characterId}`)
  }

  function logUnknownAction(action: string): void {
    error(`❌ Unknown action: ${action}`)
  }

  function logMissingCharacter(characterId: string): void {
    error(`❌ Character not found: ${characterId}`)
  }

  function logNeedChange(need: string, oldValue: number, newValue: number, effect: number): void {
    debug(`  ✓ ${need}: ${oldValue.toFixed(2)} → ${newValue.toFixed(2)} (${effect >= 0 ? '+' : ''}${effect})`)
  }

  function logCooldownApplied(ticks: number): void {
    debug(`  ✓ Cooldown set: ${ticks} ticks`)
  }

  function logActionApplied(action: string, characterId: string): void {
    debug(`✅ Action "${action}" applied successfully`)
    debug(`⚡ Applied action "${action}" for ${characterId}`)
  }

  function logItemOccupied(characterId: string, itemId: string): void {
    debug(`  🪑 ${characterId} now occupying ${itemId}`)
  }

  function logItemReleased(characterId: string, itemId: string): void {
    debug(`  🚪 ${characterId} no longer occupying ${itemId}`)
  }

  function logIdle(characterId: string): void {
    debug(`  ${characterId}: idle (no actions available)`)
  }

  function logUnavailableItem(characterId: string, itemName: string | undefined, occupants: number, maxUsers: number | null | undefined): void {
    debug(`  ⚠️  Item ${itemName} became full during this tick (${occupants}/${maxUsers})`)
    debug(`  ${characterId}: falling back to idle`)
  }

  function logMoveStart(characterId: string, fromLotName: string | null | undefined, targetLotName: string | undefined): void {
    debug(`  🚶 Moving ${characterId} from ${fromLotName || 'unknown'} to ${targetLotName}`)
  }

  function logMoveSuccess(targetLotName: string | undefined, targetSpaceName: string | undefined): void {
    debug(`  ✓ Moved to ${targetLotName} (${targetSpaceName})`)
  }

  function logActivityStart(action: string): void {
    debug(`  ✓ Started activity "${action}" in database`)
  }

  function logAutoTickStarted(): void {
    debug('Auto-tick started (5s interval)')
  }

  function logAutoTickPaused(): void {
    debug('Auto-tick paused')
  }

  function logSimulationReset(): void {
    debug('Simulation reset')
  }

  return {
    addActivityEntry,
    logActivity,
    debug,
    warn,
    error,
    logCharacterActionStart,
    logUnknownAction,
    logMissingCharacter,
    logNeedChange,
    logCooldownApplied,
    logActionApplied,
    logItemOccupied,
    logItemReleased,
    logIdle,
    logUnavailableItem,
    logMoveStart,
    logMoveSuccess,
    logActivityStart,
    logAutoTickStarted,
    logAutoTickPaused,
    logSimulationReset
  }
}
