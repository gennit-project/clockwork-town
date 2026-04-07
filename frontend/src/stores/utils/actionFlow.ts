import type { CharacterState, Intent } from '../types'

export interface ActionFlowDependencies {
  clearItemOccupancy: (characterId: string) => void
  logActivity: (characterId: string, action: string, details: string) => void
  moveCharacterToLot: (characterId: string, lotId: string) => Promise<void>
  updateCharacterLocation: (
    characterId: string,
    regionId: string | null,
    lotId: string,
    lotName: string,
    spaceId: string,
    spaceName: string
  ) => void
  startCharacterActivity: (characterId: string, action: Intent['action']) => Promise<void>
  setItemOccupancy: (characterId: string, itemId: string) => void
  createTaskFromIntent: (intent: Intent) => CharacterState['currentTask']
  completeIntent: (characterId: string, intent: Intent) => Promise<void>
}

export function handleIdleIntent(
  characterId: string,
  state: CharacterState,
  dependencies: Pick<ActionFlowDependencies, 'clearItemOccupancy' | 'logActivity'>
): void {
  state.currentAction = 'idle'
  state.currentTask = null
  dependencies.clearItemOccupancy(characterId)
  dependencies.logActivity(characterId, 'idle', 'No satisfying actions available')
}

export function handleUnavailableIntent(
  characterId: string,
  state: CharacterState,
  reason: string,
  dependencies: Pick<ActionFlowDependencies, 'clearItemOccupancy' | 'logActivity'>
): void {
  state.currentAction = 'idle'
  dependencies.clearItemOccupancy(characterId)
  dependencies.logActivity(characterId, 'idle', reason)
}

export async function performIntentMovement(
  characterId: string,
  state: CharacterState,
  movementPlan: {
    shouldMove: boolean
    targetLotId: string | null
    targetLotName: string
    targetSpaceId: string
    targetSpaceName: string
  },
  dependencies: Pick<ActionFlowDependencies, 'moveCharacterToLot' | 'updateCharacterLocation'>
): Promise<boolean> {
  if (!movementPlan.targetLotId || !movementPlan.targetSpaceId) {
    return false
  }

  if (!movementPlan.shouldMove) {
    return true
  }

  if (state.location?.lotId !== movementPlan.targetLotId) {
    await dependencies.moveCharacterToLot(characterId, movementPlan.targetLotId)
  }

  dependencies.updateCharacterLocation(
    characterId,
    state.location?.regionId || null,
    movementPlan.targetLotId,
    movementPlan.targetLotName,
    movementPlan.targetSpaceId,
    movementPlan.targetSpaceName
  )
  return true
}

export async function finalizeStartedIntent(
  characterId: string,
  state: CharacterState,
  intent: Intent,
  startedActionPlan: {
    shouldCreateTask: boolean
    logDetails: string | null
  },
  dependencies: Pick<ActionFlowDependencies, 'setItemOccupancy' | 'createTaskFromIntent' | 'completeIntent' | 'logActivity'>
): Promise<'multi_tick' | 'completed'> {
  if (intent.itemId) {
    dependencies.setItemOccupancy(characterId, intent.itemId)
  }

  if (startedActionPlan.shouldCreateTask) {
    state.currentAction = intent.action
    state.currentTask = dependencies.createTaskFromIntent(intent)
    dependencies.logActivity(characterId, intent.action, startedActionPlan.logDetails || 'Started planned action')
    return 'multi_tick'
  }

  await dependencies.completeIntent(characterId, intent)
  return 'completed'
}

export async function handleStartActivityFailure(
  characterId: string,
  intent: Intent,
  error: unknown,
  dependencies: Pick<ActionFlowDependencies, 'clearItemOccupancy' | 'logActivity'>
): Promise<string> {
  const errorMessage = error instanceof Error ? error.message : String(error)
  dependencies.clearItemOccupancy(characterId)
  dependencies.logActivity(characterId, 'failed', `Could not perform ${intent.action}: ${errorMessage}`)
  return errorMessage
}
