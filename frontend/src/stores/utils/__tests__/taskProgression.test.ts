import { describe, expect, it, vi } from 'vitest'
import { createCharacterState } from '../characterState'
import { progressActiveTask } from '../taskProgression'

describe('taskProgression utilities', () => {
  it('logs in-progress tasks and keeps them active', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = {
      action: 'sleep',
      itemId: 'item-1',
      itemName: 'Bed',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Bedroom',
      remainingTicks: 2,
      totalTicks: 3
    }
    const logActivity = vi.fn()
    const completeIntent = vi.fn()
    const clearItemOccupancy = vi.fn()

    const result = await progressActiveTask('char-1', state, {
      logActivity,
      completeIntent,
      clearItemOccupancy
    })

    expect(result).toBe(true)
    expect(state.currentTask?.remainingTicks).toBe(1)
    expect(state.currentAction).toBe('sleep')
    expect(logActivity).toHaveBeenCalledWith('char-1', 'sleep', 'In progress (1/3 ticks remaining)')
    expect(completeIntent).not.toHaveBeenCalled()
  })

  it('completes finished tasks and clears occupancy', async () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.currentTask = {
      action: 'sleep',
      itemId: 'item-1',
      itemName: 'Bed',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Bedroom',
      remainingTicks: 1,
      totalTicks: 3
    }
    const logActivity = vi.fn()
    const completeIntent = vi.fn()
    const clearItemOccupancy = vi.fn()

    const result = await progressActiveTask('char-1', state, {
      logActivity,
      completeIntent,
      clearItemOccupancy
    })

    expect(result).toBe(true)
    expect(state.currentTask).toBeNull()
    expect(completeIntent).toHaveBeenCalledWith('char-1', {
      action: 'sleep',
      itemId: 'item-1',
      itemName: 'Bed',
      source: 'manual',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      targetSpaceId: 'space-1',
      targetSpaceName: 'Bedroom',
      utility: 0,
      socialTargetId: undefined,
      socialTargetName: undefined
    })
    expect(clearItemOccupancy).toHaveBeenCalledWith('char-1')
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
})
