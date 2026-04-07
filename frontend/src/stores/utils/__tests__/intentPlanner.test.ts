import { describe, expect, it } from 'vitest'
import { createMockCharacterState, createMockItemOccupancy, createMockWorldData } from '../../__tests__/mockData'
import { buildPlanCandidates, planCandidateToIntent } from '../intentPlanner'
import type { WorldData } from '../../types'

function createEatingStrategyWorldData(): WorldData {
  const worldData = createMockWorldData()

  worldData.lots['lot-3'] = {
    id: 'lot-3',
    name: 'Main Street',
    regionId: 'region-1',
    lotType: 'COMMUNITY',
    isPublic: true,
    spaceIds: ['space-4']
  }

  worldData.spaces['space-1'].itemIds = ['item-1', 'item-2', 'item-5']
  worldData.spaces['space-2'].itemIds = ['item-3', 'item-6']
  worldData.spaces['space-4'] = {
    id: 'space-4',
    name: 'Pizza Shop',
    lotId: 'lot-3',
    itemIds: ['item-7', 'item-8']
  }

  worldData.items['item-5'] = {
    id: 'item-5',
    name: 'Dining Table',
    spaceId: 'space-1',
    lotId: 'lot-1',
    regionId: 'region-1',
    allowedActivities: [],
    affordances: [],
    maxSimultaneousUsers: 4
    ,
    classification: {
      isFoodStorage: false,
      isTakeoutSource: false,
      isGrocerySource: false,
      isKitchenStation: false,
      isTableSeat: true,
      isChairSeat: false,
      isLoungeSeat: false,
      isBedSeat: false,
      isBookSource: false
    }
  }
  worldData.items['item-6'] = {
    id: 'item-6',
    name: 'Kitchen Stove',
    spaceId: 'space-2',
    lotId: 'lot-1',
    regionId: 'region-1',
    allowedActivities: [],
    affordances: [],
    maxSimultaneousUsers: 1
    ,
    classification: {
      isFoodStorage: false,
      isTakeoutSource: false,
      isGrocerySource: false,
      isKitchenStation: true,
      isTableSeat: false,
      isChairSeat: false,
      isLoungeSeat: false,
      isBedSeat: false,
      isBookSource: false
    }
  }
  worldData.items['item-7'] = {
    id: 'item-7',
    name: 'Pizza Counter',
    spaceId: 'space-4',
    lotId: 'lot-3',
    regionId: 'region-1',
    allowedActivities: [],
    affordances: [],
    maxSimultaneousUsers: 4
    ,
    classification: {
      isFoodStorage: false,
      isTakeoutSource: true,
      isGrocerySource: false,
      isKitchenStation: false,
      isTableSeat: true,
      isChairSeat: false,
      isLoungeSeat: false,
      isBedSeat: false,
      isBookSource: false
    }
  }
  worldData.items['item-8'] = {
    id: 'item-8',
    name: 'Grocery Market',
    spaceId: 'space-4',
    lotId: 'lot-3',
    regionId: 'region-1',
    allowedActivities: [],
    affordances: [],
    maxSimultaneousUsers: 4
    ,
    classification: {
      isFoodStorage: false,
      isTakeoutSource: false,
      isGrocerySource: true,
      isKitchenStation: false,
      isTableSeat: false,
      isChairSeat: false,
      isLoungeSeat: false,
      isBedSeat: false,
      isBookSource: false
    }
  }

  return worldData
}

describe('intentPlanner', () => {
  it('builds candidates for available actions', () => {
    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })

    expect(candidates.length > 0).toBe(true)
  })

  it('sorts candidates by descending utility', () => {
    const characterState = createMockCharacterState()
    characterState.needs.food = 0.1

    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState,
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })

    expect(candidates[0].goal).toBe('eat')
  })

  it('creates at least one structured strategy for the current planner implementation', () => {
    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })

    expect(candidates.some((candidate) => !candidate.strategy.endsWith(':direct'))).toBe(true)
  })

  it('keeps a step list on each candidate', () => {
    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })

    expect(candidates[0].steps.length).toBe(1)
  })

  it('converts a candidate into an executable intent', () => {
    const candidate = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })[0]

    expect(planCandidateToIntent(candidate).steps).toEqual(candidate.steps)
  })

  it('builds a takeout eating strategy when takeout sources exist', () => {
    const characterState = createMockCharacterState()
    characterState.needs.food = 0.1

    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState,
      worldData: createEatingStrategyWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })

    expect(candidates.some((candidate) => candidate.strategy === 'eat:takeout-table')).toBe(true)
  })

  it('builds a cooked meal strategy when grocery and kitchen sources exist', () => {
    const characterState = createMockCharacterState()
    characterState.needs.food = 0.1

    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState,
      worldData: createEatingStrategyWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })

    expect(candidates.some((candidate) => candidate.strategy === 'eat:cook-meal-table')).toBe(true)
  })

  it('builds a chat strategy when a second character is available to participate', () => {
    const characterState = createMockCharacterState({
      needs: {
        ...createMockCharacterState().needs,
        friends: 0.1
      }
    })

    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState,
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy(),
      characterStates: {
        'char-1': characterState,
        'char-2': createMockCharacterState({
          name: 'Alex',
          location: {
            regionId: 'region-1',
            lotId: 'lot-1',
            lotName: 'Test House',
            spaceId: 'space-1',
            spaceName: 'Living Room'
          }
        })
      }
    })

    expect(candidates.some((candidate) => candidate.strategy === 'chat_friend:with-participant')).toBe(true)
  })

  it('does not build a chat strategy when no second character is available', () => {
    const characterState = createMockCharacterState({
      needs: {
        ...createMockCharacterState().needs,
        friends: 0.1
      }
    })

    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState,
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy(),
      characterStates: {
        'char-1': characterState
      }
    })

    expect(candidates.some((candidate) => candidate.strategy === 'chat_friend:with-participant')).toBe(false)
  })
})
