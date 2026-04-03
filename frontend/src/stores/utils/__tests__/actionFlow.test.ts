import { describe, expect, it, vi } from 'vitest'
import type { CharacterState, Intent } from '../../types'
import { createCharacterState } from '../characterState'
import {
  finalizeStartedIntent,
  handleIdleIntent,
  handleStartActivityFailure,
  handleUnavailableIntent,
  performIntentMovement
} from '../actionFlow'

function createState(): CharacterState {
  return createCharacterState({ id: 'char-1', name: 'Alice' })
}

describe('actionFlow utilities', () => {
  it('handles idle intents by resetting task state and logging', () => {
    const state = createState()
    state.currentTask = {
      action: 'sleep',
      remainingTicks: 2,
      totalTicks: 3
    }
    const clearItemOccupancy = vi.fn()
    const logActivity = vi.fn()

    handleIdleIntent('char-1', state, { clearItemOccupancy, logActivity })

    expect(state.currentAction).toBe('idle')
    expect(state.currentTask).toBeNull()
    expect(clearItemOccupancy).toHaveBeenCalledWith('char-1')
    expect(logActivity).toHaveBeenCalledWith('char-1', 'idle', 'No satisfying actions available')
  })

  it('handles unavailable intents by falling back to idle and logging reason', () => {
    const state = createState()
    const clearItemOccupancy = vi.fn()
    const logActivity = vi.fn()

    handleUnavailableIntent('char-1', state, 'Bed became unavailable', { clearItemOccupancy, logActivity })

    expect(state.currentAction).toBe('idle')
    expect(clearItemOccupancy).toHaveBeenCalledWith('char-1')
    expect(logActivity).toHaveBeenCalledWith('char-1', 'idle', 'Bed became unavailable')
  })

  it('performs movement and updates local location state', async () => {
    const state = createState()
    state.location.regionId = 'region-1'
    const moveCharacterToLot = vi.fn().mockResolvedValue(undefined)
    const updateCharacterLocation = vi.fn()

    const result = await performIntentMovement(
      'char-1',
      state,
      {
        shouldMove: true,
        targetLotId: 'lot-2',
        targetLotName: 'Library',
        targetSpaceId: 'space-2',
        targetSpaceName: 'Reading Room'
      },
      { moveCharacterToLot, updateCharacterLocation }
    )

    expect(result).toBe(true)
    expect(moveCharacterToLot).toHaveBeenCalledWith('char-1', 'lot-2')
    expect(updateCharacterLocation).toHaveBeenCalledWith('char-1', 'region-1', 'lot-2', 'Library', 'space-2', 'Reading Room')
  })

  it('finalizes a started multi-tick intent by assigning occupancy and task state', async () => {
    const state = createState()
    const intent = {
      action: 'sleep',
      itemId: 'item-1',
      utility: 4
    } as Intent
    const setItemOccupancy = vi.fn()
    const createTaskFromIntent = vi.fn().mockReturnValue({
      action: 'sleep',
      remainingTicks: 2,
      totalTicks: 3
    })
    const logActivity = vi.fn()
    const completeIntent = vi.fn()

    const result = await finalizeStartedIntent(
      'char-1',
      state,
      intent,
      { isMultiTick: true, logDetails: 'Started multi-tick action at Bed' },
      { setItemOccupancy, createTaskFromIntent, logActivity, completeIntent }
    )

    expect(result).toBe('multi_tick')
    expect(setItemOccupancy).toHaveBeenCalledWith('char-1', 'item-1')
    expect(createTaskFromIntent).toHaveBeenCalledWith(intent)
    expect(logActivity).toHaveBeenCalledWith('char-1', 'sleep', 'Started multi-tick action at Bed')
    expect(completeIntent).not.toHaveBeenCalled()
  })

  it('handles activity start failures by clearing occupancy and returning the message', async () => {
    const clearItemOccupancy = vi.fn()
    const logActivity = vi.fn()

    const result = await handleStartActivityFailure(
      'char-1',
      { action: 'read', utility: 1 } as Intent,
      new Error('network broke'),
      { clearItemOccupancy, logActivity }
    )

    expect(result).toBe('network broke')
    expect(clearItemOccupancy).toHaveBeenCalledWith('char-1')
    expect(logActivity).toHaveBeenCalledWith('char-1', 'failed', 'Could not perform read: network broke')
  })
})
