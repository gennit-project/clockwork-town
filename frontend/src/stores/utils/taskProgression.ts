import {
  advanceTask,
  buildCompletionIntent,
  buildStepTransitionIntent,
  getCurrentTaskStep,
  isTaskComplete
} from './taskLifecycle'
import type { CharacterState, Intent } from '../types'

export interface TaskProgressionDependencies {
  logActivity: (characterId: string, action: string, details: string) => void
  completeIntent: (characterId: string, intent: Intent) => Promise<void>
  clearItemOccupancy: (characterId: string) => void
}

export async function finalizeIntentCompletion(
  characterId: string,
  intent: Intent,
  dependencies: Pick<TaskProgressionDependencies, 'completeIntent'>
): Promise<void> {
  await dependencies.completeIntent(characterId, intent)
}

export async function progressActiveTask(
  characterId: string,
  state: CharacterState,
  dependencies: TaskProgressionDependencies
): Promise<boolean> {
  const task = state.currentTask
  if (!task) {
    return false
  }

  const nextTask = advanceTask(task)
  const activeStep = getCurrentTaskStep(nextTask)

  if (activeStep && activeStep.remainingTicks <= 0 && nextTask.currentStepIndex < nextTask.steps.length - 1) {
    const nextStepIndex = nextTask.currentStepIndex + 1
    const queuedIntent = buildStepTransitionIntent(nextTask, nextStepIndex)

    state.currentTask = null
    state.currentAction = 'idle'
    state.queuedActions = [queuedIntent, ...(state.queuedActions || [])]
    dependencies.clearItemOccupancy(characterId)
    dependencies.logActivity(
      characterId,
      queuedIntent.action,
      `Queued step ${nextStepIndex + 1}/${nextTask.steps.length}`
    )
    return false
  }

  state.currentTask = nextTask

  if (!isTaskComplete(nextTask)) {
    state.currentAction = nextTask.action
    dependencies.logActivity(
      characterId,
      nextTask.action,
      `In progress (${nextTask.remainingTicks}/${nextTask.totalTicks} ticks remaining)`
    )
    return true
  }

  const completedIntent = buildCompletionIntent(nextTask)
  await finalizeIntentCompletion(characterId, completedIntent, dependencies)
  state.currentTask = null
  dependencies.clearItemOccupancy(characterId)
  return true
}
