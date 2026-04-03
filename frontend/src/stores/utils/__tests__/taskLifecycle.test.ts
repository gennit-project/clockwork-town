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

    expect(task).toEqual({
      action: 'sleep',
      itemId: 'bed-1',
      itemName: 'Bed',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Bedroom',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      remainingTicks: 2,
      totalTicks: 3,
      socialTargetId: undefined,
      socialTargetName: undefined
    })
  })

  it('advances and completes tasks', () => {
    const advanced = advanceTask({
      action: 'shower',
      remainingTicks: 1,
      totalTicks: 2
    })

    expect(advanced.remainingTicks).toBe(0)
    expect(isTaskComplete(advanced)).toBe(true)
  })

  it('builds completion intent from a task', () => {
    expect(buildCompletionIntent({
      action: 'invite_over',
      itemId: 'door-1',
      itemName: 'Front Door',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Porch',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      remainingTicks: 0,
      totalTicks: 2,
      socialTargetId: 'char-2',
      socialTargetName: 'Alex'
    })).toEqual({
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
