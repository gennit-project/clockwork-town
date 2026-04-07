import type {
  ActionName,
  ItemOption,
  Needs
} from '../types'
import { ACTION_EFFECTS, NEED_WEIGHTS } from '../config/actionEffects'

export function calculateUtility(
  characterId: string,
  action: ActionName,
  characterNeeds: Needs,
  itemOption: ItemOption
): number {
  const actionData = ACTION_EFFECTS[action]
  if (!actionData) {
    console.warn(`Unknown action: ${action} for ${characterId}`)
    return -Infinity
  }

  const primaryNeed = actionData.primaryNeed
  if (!primaryNeed) {
    return 0
  }

  const currentNeedValue = characterNeeds[primaryNeed] || 0
  const needDeficit = 1.0 - currentNeedValue
  const needWeight = NEED_WEIGHTS[primaryNeed] || 1.0
  const baseUtility = needWeight * needDeficit
  const travelPenalty = itemOption.travelCost
  const affordanceBonus = itemOption.affordanceWeight - 1
  const contextBonus = 0

  return baseUtility - travelPenalty + contextBonus + affordanceBonus
}
