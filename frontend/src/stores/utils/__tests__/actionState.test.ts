import { describe, expect, it } from 'vitest'
import { ACTION_EFFECTS } from '../../config/actionEffects'
import { createCharacterState } from '../characterState'
import { applyActionToCharacterState } from '../actionState'

describe('actionState utilities', () => {
  it('applies primary and secondary need effects and cooldowns', () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.needs.romance = 0.2
    state.needs.friends = 0.4

    const result = applyActionToCharacterState(state, 'date', ACTION_EFFECTS.date)

    expect(result.primaryNeedChange).toEqual({
      need: 'romance',
      oldValue: 0.2,
      newValue: 0.55,
      effect: 0.35
    })
    expect(result.secondaryNeedChanges).toEqual([
      {
        need: 'friends',
        oldValue: 0.4,
        newValue: 0.5,
        effect: 0.1
      }
    ])
    expect(result.cooldownTicksApplied).toBe(18)
    expect(state.currentAction).toBe('date')
    expect(state.cooldowns.date).toBe(18)
  })

  it('clamps need values within bounds', () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })
    state.needs.food = 0.9
    state.needs.sleep = 0.05

    const eatResult = applyActionToCharacterState(state, 'eat', ACTION_EFFECTS.eat)
    const workResult = applyActionToCharacterState(state, 'work', ACTION_EFFECTS.work)

    expect(eatResult.primaryNeedChange?.newValue).toBe(1)
    expect(workResult.secondaryNeedChanges).toEqual([
      {
        need: 'sleep',
        oldValue: 0.05,
        newValue: 0,
        effect: -0.15
      }
    ])
  })

  it('does not apply cooldowns for idle', () => {
    const state = createCharacterState({ id: 'char-1', name: 'Alice' })

    const result = applyActionToCharacterState(state, 'idle', ACTION_EFFECTS.idle)

    expect(result.cooldownTicksApplied).toBeNull()
    expect(state.currentAction).toBe('idle')
  })
})
