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

function createTask() {
  return {
    planId: 'task-1',
    goal: 'sleep',
    action: 'sleep',
    remainingTicks: 2,
    totalTicks: 3,
    currentStepIndex: 0,
    steps: [{
      action: 'sleep',
      remainingTicks: 2,
      totalTicks: 3
    }]
  }
}

describe('actionFlow utilities', () => {
  it('sets the current action to idle when handling an idle intent', () => {
    const state = createState()
    state.currentTask = createTask()

    handleIdleIntent('char-1', state, { clearItemOccupancy: vi.fn(), logActivity: vi.fn() })

    expect(state.currentAction).toBe('idle')
  })

  it('clears the active task when handling an idle intent', () => {
    const state = createState()
    state.currentTask = createTask()

    handleIdleIntent('char-1', state, { clearItemOccupancy: vi.fn(), logActivity: vi.fn() })

    expect(state.currentTask).toBeNull()
  })

  it('clears occupancy when handling an idle intent', () => {
    const clearItemOccupancy = vi.fn()

    handleIdleIntent('char-1', createState(), { clearItemOccupancy, logActivity: vi.fn() })

    expect(clearItemOccupancy).toHaveBeenCalledWith('char-1')
  })

  it('logs the idle fallback reason', () => {
    const logActivity = vi.fn()

    handleIdleIntent('char-1', createState(), { clearItemOccupancy: vi.fn(), logActivity })

    expect(logActivity).toHaveBeenCalledWith('char-1', 'idle', 'No satisfying actions available')
  })

  it('falls back to idle when an intent becomes unavailable', () => {
    const state = createState()

    handleUnavailableIntent('char-1', state, 'Bed became unavailable', { clearItemOccupancy: vi.fn(), logActivity: vi.fn() })

    expect(state.currentAction).toBe('idle')
  })

  it('logs the unavailable item reason', () => {
    const logActivity = vi.fn()

    handleUnavailableIntent('char-1', createState(), 'Bed became unavailable', { clearItemOccupancy: vi.fn(), logActivity })

    expect(logActivity).toHaveBeenCalledWith('char-1', 'idle', 'Bed became unavailable')
  })

  it('moves to a different lot when needed', async () => {
    const moveCharacterToLot = vi.fn().mockResolvedValue(undefined)

    await performIntentMovement(
      'char-1',
      createState(),
      {
        shouldMove: true,
        targetLotId: 'lot-2',
        targetLotName: 'Library',
        targetSpaceId: 'space-2',
        targetSpaceName: 'Reading Room'
      },
      { moveCharacterToLot, updateCharacterLocation: vi.fn() }
    )

    expect(moveCharacterToLot).toHaveBeenCalledWith('char-1', 'lot-2')
  })

  it('updates local location state after movement', async () => {
    const state = createState()
    state.location.regionId = 'region-1'
    const updateCharacterLocation = vi.fn()

    await performIntentMovement(
      'char-1',
      state,
      {
        shouldMove: true,
        targetLotId: 'lot-2',
        targetLotName: 'Library',
        targetSpaceId: 'space-2',
        targetSpaceName: 'Reading Room'
      },
      { moveCharacterToLot: vi.fn().mockResolvedValue(undefined), updateCharacterLocation }
    )

    expect(updateCharacterLocation).toHaveBeenCalledWith('char-1', 'region-1', 'lot-2', 'Library', 'space-2', 'Reading Room')
  })

  it('does not trigger a lot move when the character stays on the same lot', async () => {
    const state = createState()
    state.location.regionId = 'region-1'
    state.location.lotId = 'lot-1'
    const moveCharacterToLot = vi.fn().mockResolvedValue(undefined)

    await performIntentMovement(
      'char-1',
      state,
      {
        shouldMove: true,
        targetLotId: 'lot-1',
        targetLotName: 'Home',
        targetSpaceId: 'space-2',
        targetSpaceName: 'Bathroom'
      },
      { moveCharacterToLot, updateCharacterLocation: vi.fn() }
    )

    expect(moveCharacterToLot).not.toHaveBeenCalled()
  })

  it('updates room location when staying on the same lot', async () => {
    const state = createState()
    state.location.regionId = 'region-1'
    state.location.lotId = 'lot-1'
    const updateCharacterLocation = vi.fn()

    await performIntentMovement(
      'char-1',
      state,
      {
        shouldMove: true,
        targetLotId: 'lot-1',
        targetLotName: 'Home',
        targetSpaceId: 'space-2',
        targetSpaceName: 'Bathroom'
      },
      { moveCharacterToLot: vi.fn().mockResolvedValue(undefined), updateCharacterLocation }
    )

    expect(updateCharacterLocation).toHaveBeenCalledWith('char-1', 'region-1', 'lot-1', 'Home', 'space-2', 'Bathroom')
  })

  it('marks long actions as multi-tick', async () => {
    const state = createState()
    const result = await finalizeStartedIntent(
      'char-1',
      state,
      { action: 'sleep', itemId: 'item-1', utility: 4 } as Intent,
      { isMultiTick: true, logDetails: 'Started multi-tick action at Bed' },
      {
        setItemOccupancy: vi.fn(),
        createTaskFromIntent: vi.fn().mockReturnValue(createTask()),
        logActivity: vi.fn(),
        completeIntent: vi.fn()
      }
    )

    expect(result).toBe('multi_tick')
  })

  it('assigns occupancy when a multi-tick intent starts', async () => {
    const setItemOccupancy = vi.fn()

    await finalizeStartedIntent(
      'char-1',
      createState(),
      { action: 'sleep', itemId: 'item-1', utility: 4 } as Intent,
      { isMultiTick: true, logDetails: 'Started multi-tick action at Bed' },
      {
        setItemOccupancy,
        createTaskFromIntent: vi.fn().mockReturnValue(createTask()),
        logActivity: vi.fn(),
        completeIntent: vi.fn()
      }
    )

    expect(setItemOccupancy).toHaveBeenCalledWith('char-1', 'item-1')
  })

  it('creates task state when a multi-tick intent starts', async () => {
    const createTaskFromIntent = vi.fn().mockReturnValue(createTask())

    await finalizeStartedIntent(
      'char-1',
      createState(),
      { action: 'sleep', itemId: 'item-1', utility: 4 } as Intent,
      { isMultiTick: true, logDetails: 'Started multi-tick action at Bed' },
      {
        setItemOccupancy: vi.fn(),
        createTaskFromIntent,
        logActivity: vi.fn(),
        completeIntent: vi.fn()
      }
    )

    expect(createTaskFromIntent).toHaveBeenCalledWith({ action: 'sleep', itemId: 'item-1', utility: 4 })
  })

  it('logs a multi-tick start event', async () => {
    const logActivity = vi.fn()

    await finalizeStartedIntent(
      'char-1',
      createState(),
      { action: 'sleep', itemId: 'item-1', utility: 4 } as Intent,
      { isMultiTick: true, logDetails: 'Started multi-tick action at Bed' },
      {
        setItemOccupancy: vi.fn(),
        createTaskFromIntent: vi.fn().mockReturnValue(createTask()),
        logActivity,
        completeIntent: vi.fn()
      }
    )

    expect(logActivity).toHaveBeenCalledWith('char-1', 'sleep', 'Started multi-tick action at Bed')
  })

  it('does not complete a multi-tick action immediately', async () => {
    const completeIntent = vi.fn()

    await finalizeStartedIntent(
      'char-1',
      createState(),
      { action: 'sleep', itemId: 'item-1', utility: 4 } as Intent,
      { isMultiTick: true, logDetails: 'Started multi-tick action at Bed' },
      {
        setItemOccupancy: vi.fn(),
        createTaskFromIntent: vi.fn().mockReturnValue(createTask()),
        logActivity: vi.fn(),
        completeIntent
      }
    )

    expect(completeIntent).not.toHaveBeenCalled()
  })

  it('returns the failure message when activity start fails', async () => {
    const result = await handleStartActivityFailure(
      'char-1',
      { action: 'read', utility: 1 } as Intent,
      new Error('network broke'),
      { clearItemOccupancy: vi.fn(), logActivity: vi.fn() }
    )

    expect(result).toBe('network broke')
  })

  it('clears occupancy when activity start fails', async () => {
    const clearItemOccupancy = vi.fn()

    await handleStartActivityFailure(
      'char-1',
      { action: 'read', utility: 1 } as Intent,
      new Error('network broke'),
      { clearItemOccupancy, logActivity: vi.fn() }
    )

    expect(clearItemOccupancy).toHaveBeenCalledWith('char-1')
  })

  it('logs the failure details when activity start fails', async () => {
    const logActivity = vi.fn()

    await handleStartActivityFailure(
      'char-1',
      { action: 'read', utility: 1 } as Intent,
      new Error('network broke'),
      { clearItemOccupancy: vi.fn(), logActivity }
    )

    expect(logActivity).toHaveBeenCalledWith('char-1', 'failed', 'Could not perform read: network broke')
  })
})
