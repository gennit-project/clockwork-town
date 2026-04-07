import type {
  ActionName,
  CharacterState,
  Cooldowns,
  ItemOption,
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

function buildAccessibleItemOptions({
  characterId,
  characterState,
  worldData,
  itemOccupancy,
  matcher
}: {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy: ItemOccupancy
  matcher: (itemId: string) => boolean
}): ItemOption[] {
  const options: ItemOption[] = []

  for (const item of Object.values(worldData.items)) {
    if (!matcher(item.id)) {
      continue
    }

    const withReadAffordance = findItemsWithAffordance({
      characterId,
      action: item.allowedActivities[0] || 'idle',
      characterContext: characterState,
      worldData,
      itemOccupancy
    }).find((option) => option.itemId === item.id)

    if (!withReadAffordance) {
      const space = worldData.spaces[item.spaceId]
      const lot = worldData.lots[item.lotId]
      if (!space || !lot) {
        continue
      }

      let travelCost: number | null = null
      if (item.spaceId === characterState.location.spaceId) {
        travelCost = 0
      } else if (item.lotId === characterState.location.lotId) {
        travelCost = 1
      } else if (item.regionId === characterState.location.regionId) {
        travelCost = 2
      }

      if (travelCost === null) {
        continue
      }

      options.push({
        itemId: item.id,
        itemName: item.name,
        spaceId: item.spaceId,
        spaceName: space.name,
        lotId: item.lotId,
        lotName: lot.name,
        travelCost,
        affordanceWeight: 1
      })
      continue
    }

    options.push(withReadAffordance)
  }

  return options.sort((left, right) => left.travelCost - right.travelCost)
}

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

function buildStructuredReadCandidates({
  characterId,
  characterState,
  worldData,
  itemOccupancy
}: {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy: ItemOccupancy
}): PlanCandidate[] {
  const sources = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isBookSource
  })

  const seats = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => {
      const classification = worldData.items[itemId].classification
      return classification.isChairSeat || classification.isBedSeat
    }
  })

  const candidates: PlanCandidate[] = []

  for (const source of sources) {
    for (const seat of seats) {
      const totalTravelCost = source.travelCost + seat.travelCost
      const utility = calculateUtility(characterId, 'read', characterState.needs, {
        ...seat,
        travelCost: totalTravelCost,
        affordanceWeight: seat.affordanceWeight + 0.35
      })
      const steps: TaskStep[] = [
        {
          action: 'read',
          label: `acquire-book:${source.itemName}`,
          itemId: source.itemId,
          itemName: source.itemName,
          targetSpaceId: source.spaceId,
          targetSpaceName: source.spaceName,
          targetLotId: source.lotId,
          targetLotName: source.lotName,
          totalTicks: 1,
          remainingTicks: 0
        },
        {
          action: 'read',
          label: `read-seated:${seat.itemName}`,
          itemId: seat.itemId,
          itemName: seat.itemName,
          targetSpaceId: seat.spaceId,
          targetSpaceName: seat.spaceName,
          targetLotId: seat.lotId,
          targetLotName: seat.lotName,
          totalTicks: 2,
          remainingTicks: 1
        }
      ]

      candidates.push({
        goal: 'read',
        strategy: 'read:bookshelf-seat',
        utility,
        travelCost: totalTravelCost,
        primaryStep: steps[0],
        steps
      })
    }
  }

  return candidates
}

function buildStructuredEatCandidates({
  characterId,
  characterState,
  worldData,
  itemOccupancy
}: {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy: ItemOccupancy
}): PlanCandidate[] {
  const storageItems = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isFoodStorage
  })

  const tableSeats = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isTableSeat
  })

  const fallbackSeats = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => {
      const classification = worldData.items[itemId].classification
      return classification.isChairSeat || classification.isLoungeSeat
    }
  })

  const candidates: PlanCandidate[] = []

  candidates.push(...buildSeatedEatCandidates({
    characterId,
    characterState,
    seatOptions: tableSeats,
    sourceOptions: storageItems,
    sourceStepLabel: 'acquire-food',
    strategy: 'eat:stored-food-table',
    seatBonus: 0.4
  }))

  candidates.push(...buildSeatedEatCandidates({
    characterId,
    characterState,
    seatOptions: fallbackSeats,
    sourceOptions: storageItems,
    sourceStepLabel: 'acquire-food',
    strategy: 'eat:stored-food-seat',
    seatBonus: 0.2
  }))

  const takeoutSources = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isTakeoutSource
  })

  candidates.push(...buildSeatedEatCandidates({
    characterId,
    characterState,
    seatOptions: tableSeats,
    sourceOptions: takeoutSources,
    sourceStepLabel: 'order-takeout',
    strategy: 'eat:takeout-table',
    seatBonus: 0.5
  }))

  candidates.push(...buildSeatedEatCandidates({
    characterId,
    characterState,
    seatOptions: fallbackSeats,
    sourceOptions: takeoutSources,
    sourceStepLabel: 'order-takeout',
    strategy: 'eat:takeout-seat',
    seatBonus: 0.3
  }))

  const grocerySources = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isGrocerySource
  })

  const kitchenStations = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isKitchenStation
  })

  candidates.push(...buildCookedMealCandidates({
    characterId,
    characterState,
    grocerySources,
    kitchenStations,
    seatOptions: tableSeats,
    strategy: 'eat:cook-meal-table',
    seatBonus: 0.7
  }))

  candidates.push(...buildCookedMealCandidates({
    characterId,
    characterState,
    grocerySources,
    kitchenStations,
    seatOptions: fallbackSeats,
    strategy: 'eat:cook-meal-seat',
    seatBonus: 0.45
  }))

  return candidates
}

function buildSeatedEatCandidates({
  characterId,
  characterState,
  sourceOptions,
  seatOptions,
  sourceStepLabel,
  strategy,
  seatBonus
}: {
  characterId: string
  characterState: CharacterState
  sourceOptions: ItemOption[]
  seatOptions: ItemOption[]
  sourceStepLabel: string
  strategy: string
  seatBonus: number
}): PlanCandidate[] {
  const candidates: PlanCandidate[] = []

  for (const source of sourceOptions) {
    for (const seat of seatOptions) {
      const totalTravelCost = source.travelCost + seat.travelCost
      const utility = calculateUtility(characterId, 'eat', characterState.needs, {
        ...seat,
        travelCost: totalTravelCost,
        affordanceWeight: seat.affordanceWeight + seatBonus
      })
      const steps: TaskStep[] = [
        {
          action: 'eat',
          label: `${sourceStepLabel}:${source.itemName}`,
          itemId: source.itemId,
          itemName: source.itemName,
          targetSpaceId: source.spaceId,
          targetSpaceName: source.spaceName,
          targetLotId: source.lotId,
          targetLotName: source.lotName,
          totalTicks: 1,
          remainingTicks: 0
        },
        {
          action: 'eat',
          label: `eat-seated:${seat.itemName}`,
          itemId: seat.itemId,
          itemName: seat.itemName,
          targetSpaceId: seat.spaceId,
          targetSpaceName: seat.spaceName,
          targetLotId: seat.lotId,
          targetLotName: seat.lotName,
          totalTicks: 2,
          remainingTicks: 1
        }
      ]

      candidates.push({
        goal: 'eat',
        strategy,
        utility,
        travelCost: totalTravelCost,
        primaryStep: steps[0],
        steps
      })
    }
  }

  return candidates
}

function buildCookedMealCandidates({
  characterId,
  characterState,
  grocerySources,
  kitchenStations,
  seatOptions,
  strategy,
  seatBonus
}: {
  characterId: string
  characterState: CharacterState
  grocerySources: ItemOption[]
  kitchenStations: ItemOption[]
  seatOptions: ItemOption[]
  strategy: string
  seatBonus: number
}): PlanCandidate[] {
  const candidates: PlanCandidate[] = []

  for (const grocery of grocerySources) {
    for (const kitchen of kitchenStations) {
      for (const seat of seatOptions) {
        const totalTravelCost = grocery.travelCost + kitchen.travelCost + seat.travelCost
        const utility = calculateUtility(characterId, 'eat', characterState.needs, {
          ...seat,
          travelCost: totalTravelCost,
          affordanceWeight: seat.affordanceWeight + seatBonus
        })
        const steps: TaskStep[] = [
          {
            action: 'eat',
            label: `buy-groceries:${grocery.itemName}`,
            itemId: grocery.itemId,
            itemName: grocery.itemName,
            targetSpaceId: grocery.spaceId,
            targetSpaceName: grocery.spaceName,
            targetLotId: grocery.lotId,
            targetLotName: grocery.lotName,
            totalTicks: 1,
            remainingTicks: 0
          },
          {
            action: 'eat',
            label: `cook-meal:${kitchen.itemName}`,
            itemId: kitchen.itemId,
            itemName: kitchen.itemName,
            targetSpaceId: kitchen.spaceId,
            targetSpaceName: kitchen.spaceName,
            targetLotId: kitchen.lotId,
            targetLotName: kitchen.lotName,
            totalTicks: 2,
            remainingTicks: 1
          },
          {
            action: 'eat',
            label: `eat-seated:${seat.itemName}`,
            itemId: seat.itemId,
            itemName: seat.itemName,
            targetSpaceId: seat.spaceId,
            targetSpaceName: seat.spaceName,
            targetLotId: seat.lotId,
            targetLotName: seat.lotName,
            totalTicks: 2,
            remainingTicks: 1
          }
        ]

        candidates.push({
          goal: 'eat',
          strategy,
          utility,
          travelCost: totalTravelCost,
          primaryStep: steps[0],
          steps
        })
      }
    }
  }

  return candidates
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

    if (action === 'read') {
      candidates.push(...buildStructuredReadCandidates({
        characterId,
        characterState,
        worldData,
        itemOccupancy
      }))
    }

    if (action === 'eat') {
      candidates.push(...buildStructuredEatCandidates({
        characterId,
        characterState,
        worldData,
        itemOccupancy
      }))
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
