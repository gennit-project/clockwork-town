import type {
  ActionName,
  CharacterState,
  Cooldowns,
  Intent,
  ItemOccupancy,
  PlanCandidate,
  TaskStep,
  WorldData
} from '../types'
import { calculateUtility } from './actionUtility'
import { findItemsWithAffordance } from './pathfinding'

export interface BuildPlanCandidatesParams {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy?: ItemOccupancy
}

type CooldownAction = keyof Cooldowns

const DEFAULT_PLANNED_ACTIONS: CooldownAction[] = [
  'eat',
  'sleep',
  'use_toilet',
  'shower',
  'medicate',
  'chat_friend',
  'call_mom',
  'date',
  'read',
  'write',
  'view_art',
  'volunteer'
]

function buildDirectStep(action: ActionName, option: ReturnType<typeof findItemsWithAffordance>[number]): TaskStep {
  return {
    action,
    label: `${action}:${option.itemName}`,
    itemId: option.itemId,
    itemName: option.itemName,
    targetSpaceId: option.spaceId,
    targetSpaceName: option.spaceName,
    targetLotId: option.lotId,
    targetLotName: option.lotName,
    totalTicks: 1,
    remainingTicks: 0
  }
}

function buildDirectPlanCandidates({
  characterId,
  action,
  characterState,
  worldData,
  itemOccupancy
}: {
  characterId: string
  action: ActionName
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy?: ItemOccupancy
}): PlanCandidate[] {
  const items = findItemsWithAffordance({
    characterId,
    action,
    characterContext: characterState,
    worldData,
    itemOccupancy
  })

  return items.map((itemOption) => {
    const primaryStep = buildDirectStep(action, itemOption)

    return {
      goal: action,
      strategy: `${action}:direct`,
      utility: calculateUtility(characterId, action, characterState.needs, itemOption),
      travelCost: itemOption.travelCost,
      primaryStep,
      steps: [primaryStep]
    }
  })
}

export function buildPlanCandidates({
  characterId,
  characterState,
  worldData,
  itemOccupancy = {}
}: BuildPlanCandidatesParams): PlanCandidate[] {
  const candidates: PlanCandidate[] = []

  for (const action of DEFAULT_PLANNED_ACTIONS) {
    if (characterState.cooldowns[action] > 0) {
      continue
    }

    candidates.push(...buildDirectPlanCandidates({
      characterId,
      action,
      characterState,
      worldData,
      itemOccupancy
    }))
  }

  return candidates.sort((left, right) => {
    if (right.utility !== left.utility) {
      return right.utility - left.utility
    }

    if (left.travelCost !== right.travelCost) {
      return left.travelCost - right.travelCost
    }

    return left.strategy.localeCompare(right.strategy)
  })
}

export function planCandidateToIntent(candidate: PlanCandidate): Intent {
  return {
    goal: candidate.goal,
    strategy: candidate.strategy,
    action: candidate.primaryStep.action,
    itemId: candidate.primaryStep.itemId,
    itemName: candidate.primaryStep.itemName,
    targetSpaceId: candidate.primaryStep.targetSpaceId,
    targetSpaceName: candidate.primaryStep.targetSpaceName,
    targetLotId: candidate.primaryStep.targetLotId,
    targetLotName: candidate.primaryStep.targetLotName,
    travelCost: candidate.travelCost,
    utility: candidate.utility,
    source: 'auto',
    socialTargetId: candidate.primaryStep.socialTargetId,
    socialTargetName: candidate.primaryStep.socialTargetName,
    steps: candidate.steps
  }
}
