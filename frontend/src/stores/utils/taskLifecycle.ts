import { ACTION_DURATIONS } from '../config/actionEffects'
import type { ActionName, ActiveTask, Intent, TaskStep } from '../types'

export function getActionDuration(action: ActionName): number {
  return action in ACTION_DURATIONS
    ? ACTION_DURATIONS[action as keyof typeof ACTION_DURATIONS]
    : 1
}

export function createTaskFromIntent(intent: Intent): ActiveTask {
  const totalTicks = getActionDuration(intent.action)
  const step: TaskStep = {
    action: intent.action,
    itemId: intent.itemId,
    itemName: intent.itemName,
    targetSpaceId: intent.targetSpaceId,
    targetSpaceName: intent.targetSpaceName,
    targetLotId: intent.targetLotId,
    targetLotName: intent.targetLotName,
    totalTicks,
    remainingTicks: totalTicks - 1,
    socialTargetId: intent.socialTargetId,
    socialTargetName: intent.socialTargetName
  }

  return {
    planId: crypto.randomUUID(),
    goal: intent.action,
    action: step.action,
    itemId: step.itemId,
    itemName: step.itemName,
    targetSpaceId: step.targetSpaceId,
    targetSpaceName: step.targetSpaceName,
    targetLotId: step.targetLotId,
    targetLotName: step.targetLotName,
    remainingTicks: step.remainingTicks,
    totalTicks: step.totalTicks,
    socialTargetId: step.socialTargetId,
    socialTargetName: step.socialTargetName,
    currentStepIndex: 0,
    steps: [step]
  }
}

export function advanceTask(task: ActiveTask): ActiveTask {
  const activeStep = getCurrentTaskStep(task)
  if (!activeStep) {
    return task
  }

  const steps = task.steps.map((step, index) => index === task.currentStepIndex
    ? { ...step, remainingTicks: step.remainingTicks - 1 }
    : step)

  return syncTaskSnapshot({
    ...task,
    steps
  })
}

export function isTaskComplete(task: ActiveTask): boolean {
  const activeStep = getCurrentTaskStep(task)
  return !activeStep || (task.currentStepIndex >= task.steps.length - 1 && activeStep.remainingTicks <= 0)
}

export function buildCompletionIntent(task: ActiveTask): Intent {
  const activeStep = getCurrentTaskStep(task) ?? task.steps.at(-1)

  return {
    action: activeStep?.action ?? task.action,
    itemId: activeStep?.itemId ?? task.itemId,
    itemName: activeStep?.itemName ?? task.itemName,
    targetSpaceId: activeStep?.targetSpaceId ?? task.targetSpaceId,
    targetSpaceName: activeStep?.targetSpaceName ?? task.targetSpaceName,
    targetLotId: activeStep?.targetLotId ?? task.targetLotId,
    targetLotName: activeStep?.targetLotName ?? task.targetLotName,
    utility: 0,
    source: 'manual',
    socialTargetId: activeStep?.socialTargetId ?? task.socialTargetId,
    socialTargetName: activeStep?.socialTargetName ?? task.socialTargetName
  }
}

export function getCurrentTaskStep(task: ActiveTask): TaskStep | null {
  return task.steps[task.currentStepIndex] || null
}

export function moveToNextTaskStep(task: ActiveTask): ActiveTask {
  return syncTaskSnapshot({
    ...task,
    currentStepIndex: task.currentStepIndex + 1
  })
}

export function syncTaskSnapshot(task: ActiveTask): ActiveTask {
  const activeStep = getCurrentTaskStep(task)
  if (!activeStep) {
    return task
  }

  return {
    ...task,
    action: activeStep.action,
    itemId: activeStep.itemId,
    itemName: activeStep.itemName,
    targetSpaceId: activeStep.targetSpaceId,
    targetSpaceName: activeStep.targetSpaceName,
    targetLotId: activeStep.targetLotId,
    targetLotName: activeStep.targetLotName,
    remainingTicks: activeStep.remainingTicks,
    totalTicks: activeStep.totalTicks,
    socialTargetId: activeStep.socialTargetId,
    socialTargetName: activeStep.socialTargetName
  }
}
