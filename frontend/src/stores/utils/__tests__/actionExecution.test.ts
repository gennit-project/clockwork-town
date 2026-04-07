import { describe, expect, it } from 'vitest'
import type { CharacterLocation, Intent, ItemOccupancy, WorldData } from '../../types'
import {
  buildMovementPlan,
  buildStartedActionPlan,
  validateIntentItemAvailability
} from '../actionExecution'

function createWorldData(): WorldData {
  return {
    lots: {},
    spaces: {},
    items: {
      'item-1': {
        id: 'item-1',
        name: 'Bed',
        spaceId: 'space-1',
        lotId: 'lot-1',
        regionId: 'region-1',
        allowedActivities: ['sleep'],
        affordances: [{ action: 'sleep', weight: 1 }],
        maxSimultaneousUsers: 1
      }
    },
    itemsByAffordance: {}
  }
}

describe('actionExecution utilities', () => {
  it('reports when an intended item becomes unavailable', () => {
    const worldData = createWorldData()
    const occupancy: ItemOccupancy = { 'item-1': ['char-2'] }
    const intent: Intent = {
      action: 'sleep',
      itemId: 'item-1',
      itemName: 'Bed',
      utility: 2
    }

    expect(validateIntentItemAvailability(intent, worldData, occupancy)).toEqual({
      available: false,
      reason: 'Bed became unavailable'
    })
  })

  it('builds a movement plan only when cross-lot travel is needed', () => {
    const location: CharacterLocation = {
      regionId: 'region-1',
      lotId: 'lot-1',
      lotName: 'Home',
      spaceId: 'space-1',
      spaceName: 'Bedroom'
    }
    const intent: Intent = {
      action: 'read',
      targetLotId: 'lot-2',
      targetLotName: 'Library',
      targetSpaceId: 'space-2',
      targetSpaceName: 'Reading Room',
      travelCost: 1,
      utility: 1
    }

    expect(buildMovementPlan(location, intent)).toEqual({
      shouldMove: true,
      targetLotId: 'lot-2',
      targetLotName: 'Library',
      targetSpaceId: 'space-2',
      targetSpaceName: 'Reading Room'
    })
  })

  it('builds a movement plan for same-lot room changes', () => {
    const location: CharacterLocation = {
      regionId: 'region-1',
      lotId: 'lot-1',
      lotName: 'Home',
      spaceId: 'space-1',
      spaceName: 'Living Room'
    }
    const intent: Intent = {
      action: 'use_toilet',
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      targetSpaceId: 'space-2',
      targetSpaceName: 'Bathroom',
      travelCost: 1,
      utility: 1
    }

    expect(buildMovementPlan(location, intent)).toEqual({
      shouldMove: true,
      targetLotId: 'lot-1',
      targetLotName: 'Home',
      targetSpaceId: 'space-2',
      targetSpaceName: 'Bathroom'
    })
  })

  it('builds multi-tick start metadata from duration', () => {
    const multiTick = buildStartedActionPlan(
      { action: 'sleep', itemName: 'Bed', utility: 4 } as Intent,
      3
    )
    const singleTick = buildStartedActionPlan(
      { action: 'eat', itemName: 'Fridge', utility: 2 } as Intent,
      1
    )

    expect(multiTick).toEqual({
      shouldCreateTask: true,
      logDetails: 'Started planned action at Bed'
    })
    expect(singleTick).toEqual({
      shouldCreateTask: false,
      logDetails: null
    })
  })
})
