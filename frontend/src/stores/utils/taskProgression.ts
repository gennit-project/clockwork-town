import {
  advanceTask,
  buildCompletionIntent,
  getCurrentTaskStep,
  isTaskComplete,
  moveToNextTaskStep,
  syncTaskSnapshot
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
    const upcomingTask = moveToNextTaskStep(nextTask)
    state.currentTask = syncTaskSnapshot(upcomingTask)
    state.currentAction = state.currentTask.action
    dependencies.logActivity(
      characterId,
      state.currentTask.action,
      `Advanced to step ${state.currentTask.currentStepIndex + 1}/${state.currentTask.steps.length}`
    )
    return true
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
