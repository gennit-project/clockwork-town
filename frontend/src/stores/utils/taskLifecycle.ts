import { ACTION_DURATIONS } from '../config/actionEffects'
import type { ActionName, ActiveTask, Intent } from '../types'

export function getActionDuration(action: ActionName): number {
  return action in ACTION_DURATIONS
    ? ACTION_DURATIONS[action as keyof typeof ACTION_DURATIONS]
    : 1
}

export function createTaskFromIntent(intent: Intent): ActiveTask {
  const totalTicks = getActionDuration(intent.action)

  return {
    action: intent.action,
    itemId: intent.itemId,
    itemName: intent.itemName,
    targetSpaceId: intent.targetSpaceId,
    targetSpaceName: intent.targetSpaceName,
    targetLotId: intent.targetLotId,
    targetLotName: intent.targetLotName,
    remainingTicks: totalTicks - 1,
    totalTicks,
    socialTargetId: intent.socialTargetId,
    socialTargetName: intent.socialTargetName
  }
}

export function advanceTask(task: ActiveTask): ActiveTask {
  return {
    ...task,
    remainingTicks: task.remainingTicks - 1
  }
}

export function isTaskComplete(task: ActiveTask): boolean {
  return task.remainingTicks <= 0
}

export function buildCompletionIntent(task: ActiveTask): Intent {
  return {
    action: task.action,
    itemId: task.itemId,
    itemName: task.itemName,
    targetSpaceId: task.targetSpaceId,
    targetSpaceName: task.targetSpaceName,
    targetLotId: task.targetLotId,
    targetLotName: task.targetLotName,
    utility: 0,
    source: 'manual',
    socialTargetId: task.socialTargetId,
    socialTargetName: task.socialTargetName
  }
}
