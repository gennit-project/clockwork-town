import type { ActionEffect, ActionName, CharacterState, NeedName } from '../types'

function clampNeed(value: number): number {
  return Math.min(1.0, Math.max(0, value))
}

export interface ActionStateChange {
  nextState: CharacterState
  primaryNeedChange?: {
    need: NeedName
    oldValue: number
    newValue: number
    effect: number
  }
  secondaryNeedChanges: Array<{
    need: NeedName
    oldValue: number
    newValue: number
    effect: number
  }>
  cooldownTicksApplied: number | null
}

export function applyActionToCharacterState(
  state: CharacterState,
  action: ActionName,
  actionEffect: ActionEffect
): ActionStateChange {
  let primaryNeedChange: ActionStateChange['primaryNeedChange']
  const secondaryNeedChanges: ActionStateChange['secondaryNeedChanges'] = []

  if (actionEffect.primaryNeed && actionEffect.primaryEffect !== 0) {
    const oldValue = state.needs[actionEffect.primaryNeed]
    const newValue = clampNeed(oldValue + actionEffect.primaryEffect)
    state.needs[actionEffect.primaryNeed] = newValue

    primaryNeedChange = {
      need: actionEffect.primaryNeed,
      oldValue,
      newValue,
      effect: actionEffect.primaryEffect
    }
  }

  for (const [need, effect] of Object.entries(actionEffect.secondaryEffects)) {
    const needKey = need as NeedName
    const effectValue = effect as number
    const oldValue = state.needs[needKey]
    const newValue = clampNeed(oldValue + effectValue)
    state.needs[needKey] = newValue

    secondaryNeedChanges.push({
      need: needKey,
      oldValue,
      newValue,
      effect: effectValue
    })
  }

  let cooldownTicksApplied: number | null = null
  if (action !== 'idle' && action in state.cooldowns) {
    state.cooldowns[action] = actionEffect.cooldownTicks
    cooldownTicksApplied = actionEffect.cooldownTicks
  }

  state.currentAction = action

  return {
    nextState: state,
    primaryNeedChange,
    secondaryNeedChanges,
    cooldownTicksApplied
  }
}
