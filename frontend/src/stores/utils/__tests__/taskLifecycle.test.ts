import { describe, expect, it } from 'vitest'
import { advanceTask, buildCompletionIntent, createTaskFromIntent, getActionDuration, isTaskComplete } from '../taskLifecycle'

describe('taskLifecycle', () => {
  it('returns configured durations for multi-tick actions', () => {
    expect(getActionDuration('sleep')).toBe(3)
    expect(getActionDuration('shower')).toBe(2)
    expect(getActionDuration('eat')).toBe(1)
  })

  it('creates a task from an intent', () => {
    const task = createTaskFromIntent({
      action: 'sleep',
      itemId: 'bed-1',
      itemName: 'Bed',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Bedroom',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      utility: 2
    })

    expect(task).toMatchObject({
      goal: 'sleep',
      action: 'sleep',
      itemId: 'bed-1',
      itemName: 'Bed',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Bedroom',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      remainingTicks: 2,
      totalTicks: 3,
      currentStepIndex: 0
    })
    expect(task.planId).toEqual(expect.any(String))
    expect(task.steps).toHaveLength(1)
    expect(task.steps[0]).toMatchObject({ action: 'sleep', totalTicks: 3, remainingTicks: 2 })
  })

  it('advances and completes tasks', () => {
    const task = createTaskFromIntent({ action: 'shower', utility: 1 })
    const advanced = advanceTask(task)

    expect(advanced.remainingTicks).toBe(0)
    expect(isTaskComplete(advanced)).toBe(true)
  })

  it('builds completion intent from a task', () => {
    const task = createTaskFromIntent({
      action: 'invite_over',
      itemId: 'door-1',
      itemName: 'Front Door',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Porch',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      socialTargetId: 'char-2',
      socialTargetName: 'Alex',
      utility: 1
    })

    expect(buildCompletionIntent(task)).toEqual({
      goal: 'invite_over',
      strategy: 'task:completion',
      action: 'invite_over',
      itemId: 'door-1',
      itemName: 'Front Door',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Porch',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      utility: 0,
      source: 'manual',
      socialTargetId: 'char-2',
      socialTargetName: 'Alex'
    })
  })
})
