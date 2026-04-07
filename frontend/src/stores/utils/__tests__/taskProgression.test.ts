import { describe, expect, it, vi } from 'vitest'
import { createCharacterState } from '../characterState'
import { progressActiveTask } from '../taskProgression'

function createTask(overrides: Record<string, unknown> = {}) {
  return {
    planId: 'task-1',
    goal: 'sleep',
    action: 'sleep',
    itemId: 'item-1',
    itemName: 'Bed',
    targetLotId: 'lot-1',
    targetLotName: 'Home',
    targetSpaceId: 'space-1',
    targetSpaceName: 'Bedroom',
    remainingTicks: 2,
    totalTicks: 3,
    currentStepIndex: 0,
    steps: [{
      action: 'sleep',
      itemId: 'item-1',
      itemName: 'Bed',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Bedroom',
      remainingTicks: 2,
      totalTicks: 3
    }],
    ...overrides
  }
}

describe('taskProgression utilities', () => {
  it('keeps the task active after an in-progress tick', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = createTask()

    await progressActiveTask('char-1', state, {
      logActivity: vi.fn(),
      completeIntent: vi.fn(),
      clearItemOccupancy: vi.fn()
    })

    expect(state.currentTask?.remainingTicks).toBe(1)
  })

  it('updates the action from the active task while progressing', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = createTask()

    await progressActiveTask('char-1', state, {
      logActivity: vi.fn(),
      completeIntent: vi.fn(),
      clearItemOccupancy: vi.fn()
    })

    expect(state.currentAction).toBe('sleep')
  })

  it('logs the in-progress task state', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = createTask()
    const logActivity = vi.fn()

    await progressActiveTask('char-1', state, {
      logActivity,
      completeIntent: vi.fn(),
      clearItemOccupancy: vi.fn()
    })

    expect(logActivity).toHaveBeenCalledWith('char-1', 'sleep', 'In progress (1/3 ticks remaining)')
  })

  it('does not complete an in-progress task early', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = createTask()
    const completeIntent = vi.fn()

    await progressActiveTask('char-1', state, {
      logActivity: vi.fn(),
      completeIntent,
      clearItemOccupancy: vi.fn()
    })

    expect(completeIntent).not.toHaveBeenCalled()
  })

  it('clears the task when the final step completes', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = createTask({
      remainingTicks: 1,
      steps: [{
        action: 'sleep',
        itemId: 'item-1',
        itemName: 'Bed',
        targetLotId: 'lot-1',
        targetLotName: 'Home',
        targetSpaceId: 'space-1',
        targetSpaceName: 'Bedroom',
        remainingTicks: 1,
        totalTicks: 3
      }]
    })

    await progressActiveTask('char-1', state, {
      logActivity: vi.fn(),
      completeIntent: vi.fn(),
      clearItemOccupancy: vi.fn()
    })

    expect(state.currentTask).toBeNull()
  })

  it('completes the task using the built intent snapshot', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = createTask({
      remainingTicks: 1,
      steps: [{
        action: 'sleep',
        itemId: 'item-1',
        itemName: 'Bed',
        targetLotId: 'lot-1',
        targetLotName: 'Home',
        targetSpaceId: 'space-1',
        targetSpaceName: 'Bedroom',
        remainingTicks: 1,
        totalTicks: 3
      }]
    })
    const completeIntent = vi.fn()

    await progressActiveTask('char-1', state, {
      logActivity: vi.fn(),
      completeIntent,
      clearItemOccupancy: vi.fn()
    })

    expect(completeIntent).toHaveBeenCalledWith('char-1', {
      action: 'sleep',
      goal: 'sleep',
      itemId: 'item-1',
      itemName: 'Bed',
      source: 'manual',
      strategy: 'task:completion',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Bedroom',
      utility: 0,
      socialTargetId: undefined,
      socialTargetName: undefined
    })
  })

  it('clears occupancy after task completion', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = createTask({
      remainingTicks: 1,
      steps: [{
        action: 'sleep',
        itemId: 'item-1',
        itemName: 'Bed',
        targetLotId: 'lot-1',
        targetLotName: 'Home',
        targetSpaceId: 'space-1',
        targetSpaceName: 'Bedroom',
        remainingTicks: 1,
        totalTicks: 3
      }]
    })
    const clearItemOccupancy = vi.fn()

    await progressActiveTask('char-1', state, {
      logActivity: vi.fn(),
      completeIntent: vi.fn(),
      clearItemOccupancy
    })

    expect(clearItemOccupancy).toHaveBeenCalledWith('char-1')
  })

  it('does not log a completion step as in-progress', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = createTask({
      remainingTicks: 1,
      steps: [{
        action: 'sleep',
        itemId: 'item-1',
        itemName: 'Bed',
        targetLotId: 'lot-1',
        targetLotName: 'Home',
        targetSpaceId: 'space-1',
        targetSpaceName: 'Bedroom',
        remainingTicks: 1,
        totalTicks: 3
      }]
    })
    const logActivity = vi.fn()

    await progressActiveTask('char-1', state, {
      logActivity,
      completeIntent: vi.fn(),
      clearItemOccupancy: vi.fn()
    })

    expect(logActivity).not.toHaveBeenCalled()
  })

  it('returns false when no task is active', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })

    const result = await progressActiveTask('char-1', state, {
      logActivity: vi.fn(),
      completeIntent: vi.fn(),
      clearItemOccupancy: vi.fn()
    })

    expect(result).toBe(false)
  })

  it('queues the next step when a multi-step task advances', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = createTask({
      remainingTicks: 0,
      totalTicks: 1,
      steps: [
        {
          action: 'eat',
          itemId: 'item-1',
          itemName: 'Fridge',
          targetLotId: 'lot-1',
          targetLotName: 'Home',
          targetSpaceId: 'space-1',
          targetSpaceName: 'Kitchen',
          remainingTicks: 0,
          totalTicks: 1
        },
        {
          action: 'eat',
          itemId: 'item-2',
          itemName: 'Couch',
          targetLotId: 'lot-1',
          targetLotName: 'Home',
          targetSpaceId: 'space-2',
          targetSpaceName: 'Living Room',
          remainingTicks: 1,
          totalTicks: 2
        }
      ]
    })

    await progressActiveTask('char-1', state, {
      logActivity: vi.fn(),
      completeIntent: vi.fn(),
      clearItemOccupancy: vi.fn()
    })

    expect(state.queuedActions?.[0]?.itemId).toBe('item-2')
  })
})
