/**
 * Unit tests for pathfinding utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { findItemsWithAffordance, buildWorldData } from '../pathfinding'
import {
  createMockWorldData,
  createMockCharacterState,
  mockConsole
} from '../../__tests__/mockData'
import type { CharacterLocation, CharacterState, WorldData, ItemOccupancy } from '../../types'

mockConsole()

function findResults(overrides: {
  action?: string
  characterContext?: CharacterLocation | CharacterState
  worldData?: WorldData
  itemOccupancy?: ItemOccupancy
} = {}) {
  return findItemsWithAffordance({
    characterId: 'char-1',
    action: overrides.action ?? 'read',
    characterContext: overrides.characterContext ?? {
      regionId: 'region-1',
      lotId: 'lot-1',
      lotName: 'Test House',
      spaceId: 'space-1',
      spaceName: 'Living Room'
    },
    worldData: overrides.worldData ?? createMockWorldData(),
    itemOccupancy: overrides.itemOccupancy
  })
}

describe('findItemsWithAffordance', () => {
  let worldData: WorldData
  let characterLocation: CharacterLocation

  beforeEach(() => {
    worldData = createMockWorldData()
    characterLocation = {
      regionId: 'region-1',
      lotId: 'lot-1',
      lotName: 'Test House',
      spaceId: 'space-1',
      spaceName: 'Living Room'
    }
  })

  it('finds one same-space result for reading', () => {
    const sameSpaceItems = findResults({ worldData, characterContext: characterLocation }).filter((result) => result.travelCost === 0)

    expect(sameSpaceItems.length).toBe(1)
  })

  it('returns the couch as the same-space reading item', () => {
    const sameSpaceItems = findResults({ worldData, characterContext: characterLocation }).filter((result) => result.travelCost === 0)

    expect(sameSpaceItems[0].itemId).toBe('item-1')
  })

  it('returns the couch name for the same-space reading item', () => {
    const sameSpaceItems = findResults({ worldData, characterContext: characterLocation }).filter((result) => result.travelCost === 0)

    expect(sameSpaceItems[0].itemName).toBe('Couch')
  })

  it('returns the living room space id for the same-space reading item', () => {
    const sameSpaceItems = findResults({ worldData, characterContext: characterLocation }).filter((result) => result.travelCost === 0)

    expect(sameSpaceItems[0].spaceId).toBe('space-1')
  })

  it('finds one same-lot result for eating', () => {
    const results = findResults({ action: 'eat', worldData, characterContext: characterLocation })

    expect(results.length).toBe(1)
  })

  it('assigns travel cost 1 to the same-lot eating option', () => {
    const results = findResults({ action: 'eat', worldData, characterContext: characterLocation })

    expect(results[0].travelCost).toBe(1)
  })

  it('returns the fridge as the same-lot eating item', () => {
    const results = findResults({ action: 'eat', worldData, characterContext: characterLocation })

    expect(results[0].itemId).toBe('item-3')
  })

  it('returns the fridge name for the same-lot eating item', () => {
    const results = findResults({ action: 'eat', worldData, characterContext: characterLocation })

    expect(results[0].itemName).toBe('Fridge')
  })

  it('returns the home lot id for the same-lot eating item', () => {
    const results = findResults({ action: 'eat', worldData, characterContext: characterLocation })

    expect(results[0].lotId).toBe('lot-1')
  })

  it('returns the kitchen space id for the same-lot eating item', () => {
    const results = findResults({ action: 'eat', worldData, characterContext: characterLocation })

    expect(results[0].spaceId).toBe('space-2')
  })

  it('finds one same-region reading result in another lot', () => {
    const differentLotItems = findResults({ worldData, characterContext: characterLocation }).filter((result) => result.travelCost === 2)

    expect(differentLotItems.length).toBe(1)
  })

  it('returns the bookshelf as the same-region reading item', () => {
    const differentLotItems = findResults({ worldData, characterContext: characterLocation }).filter((result) => result.travelCost === 2)

    expect(differentLotItems[0].itemId).toBe('item-4')
  })

  it('returns the bookshelf name for the same-region reading item', () => {
    const differentLotItems = findResults({ worldData, characterContext: characterLocation }).filter((result) => result.travelCost === 2)

    expect(differentLotItems[0].itemName).toBe('Bookshelf')
  })

  it('returns the community lot id for the same-region reading item', () => {
    const differentLotItems = findResults({ worldData, characterContext: characterLocation }).filter((result) => result.travelCost === 2)

    expect(differentLotItems[0].lotId).toBe('lot-2')
  })

  it('returns two reading options sorted by travel cost', () => {
    const results = findResults({ worldData, characterContext: characterLocation })

    expect(results.map((result) => result.travelCost)).toEqual([0, 2])
  })

  it('returns no items for a nonexistent action', () => {
    const results = findResults({
      action: 'nonexistent_action',
      worldData,
      characterContext: characterLocation
    })

    expect(results).toEqual([])
  })

  it('excludes items at capacity', () => {
    const results = findResults({
      action: 'sleep',
      worldData,
      characterContext: characterLocation,
      itemOccupancy: {
        'item-2': ['char-2']
      }
    })

    expect(results).toEqual([])
  })

  it('includes items that are below capacity', () => {
    const results = findResults({
      worldData,
      characterContext: characterLocation,
      itemOccupancy: {
        'item-1': ['char-2', 'char-3']
      }
    })

    expect(results.some((result) => result.itemId === 'item-1')).toBe(true)
  })

  it('does not limit items with null capacity', () => {
    const results = findResults({
      action: 'eat',
      worldData,
      characterContext: characterLocation,
      itemOccupancy: {
        'item-3': ['char-2', 'char-3', 'char-4', 'char-5']
      }
    })

    expect(results[0].itemId).toBe('item-3')
  })

  it('returns no items for incomplete character location', () => {
    const results = findResults({
      action: 'eat',
      worldData,
      characterContext: {
        regionId: null,
        lotId: null,
        lotName: null,
        spaceId: null,
        spaceName: null
      }
    })

    expect(results).toEqual([])
  })

  it('supports reading on items with multiple affordances', () => {
    const results = findResults({ worldData, characterContext: characterLocation })

    expect(results.some((result) => result.itemId === 'item-1')).toBe(true)
  })

  it('supports chatting on items with multiple affordances', () => {
    const results = findResults({
      action: 'chat_friend',
      worldData,
      characterContext: characterLocation
    })

    expect(results.some((result) => result.itemId === 'item-1')).toBe(true)
  })

  it('excludes sleep items on inaccessible residential lots', () => {
    worldData.lots['lot-3'] = {
      id: 'lot-3',
      name: 'Neighbor House',
      regionId: 'region-1',
      lotType: 'RESIDENTIAL',
      isPublic: false,
      spaceIds: ['space-4']
    }
    worldData.spaces['space-4'] = {
      id: 'space-4',
      name: 'Guest Room',
      lotId: 'lot-3',
      itemIds: ['item-5']
    }
    worldData.items['item-5'] = {
      id: 'item-5',
      name: 'Guest Bed',
      spaceId: 'space-4',
      lotId: 'lot-3',
      regionId: 'region-1',
      comfort: 0.25,
      allowedActivities: ['sleep'],
      affordances: [{ action: 'sleep', weight: 1 }],
      maxSimultaneousUsers: 1,
      classification: {
        isFoodStorage: false,
        isTakeoutSource: false,
        isGrocerySource: false,
        isKitchenStation: false,
        isTableSeat: false,
        isChairSeat: false,
        isLoungeSeat: false,
        isBedSeat: true,
        isBookSource: false
      }
    }
    worldData.itemsByAffordance.sleep = ['item-2', 'item-5']

    const results = findResults({
      action: 'sleep',
      worldData,
      characterContext: createMockCharacterState({
        accessibleLotIds: ['lot-1', 'lot-2']
      })
    })

    expect(results.some((result) => result.itemId === 'item-5')).toBe(false)
  })
})

describe('buildWorldData', () => {
  const completeLots = [
    {
      id: 'test-lot-1',
      name: 'Test Building',
      lotType: 'residential',
      indoorRooms: [
        {
          id: 'room-1',
          name: 'Main Room',
          items: [
            {
              id: 'item-1',
              name: 'Table',
              allowedActivities: ['eat', 'work'],
              maxSimultaneousUsers: 4
            }
          ]
        }
      ],
      outdoorAreas: [
        {
          id: 'area-1',
          name: 'Yard',
          items: [
            {
              id: 'item-2',
              name: 'Bench',
              allowedActivities: ['read'],
              maxSimultaneousUsers: null
            }
          ]
        }
      ]
    }
  ]

  it('creates one lot entry', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(Object.keys(worldData.lots)).toHaveLength(1)
  })

  it('stores the lot name', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.lots['test-lot-1'].name).toBe('Test Building')
  })

  it('stores the lot region id', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.lots['test-lot-1'].regionId).toBe('test-region')
  })

  it('stores the original lot type', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.lots['test-lot-1'].lotType).toBe('residential')
  })

  it('marks residential lots as non-public', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.lots['test-lot-1'].isPublic).toBe(false)
  })

  it('stores all space ids on the lot', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.lots['test-lot-1'].spaceIds).toEqual(['room-1', 'area-1'])
  })

  it('creates two space entries', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(Object.keys(worldData.spaces)).toHaveLength(2)
  })

  it('stores the room name', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.spaces['room-1'].name).toBe('Main Room')
  })

  it('stores the room lot id', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.spaces['room-1'].lotId).toBe('test-lot-1')
  })

  it('stores the room item ids', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.spaces['room-1'].itemIds).toEqual(['item-1'])
  })

  it('creates two item entries', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(Object.keys(worldData.items)).toHaveLength(2)
  })

  it('stores the item name', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.items['item-1'].name).toBe('Table')
  })

  it('stores the item space id', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.items['item-1'].spaceId).toBe('room-1')
  })

  it('stores the item lot id', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.items['item-1'].lotId).toBe('test-lot-1')
  })

  it('stores the item region id', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.items['item-1'].regionId).toBe('test-region')
  })

  it('stores item activities', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.items['item-1'].allowedActivities).toEqual(['eat', 'work'])
  })

  it('classifies the bench as neither food storage nor a book source', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.items['item-2'].classification).toEqual({
      isFoodStorage: false,
      isTakeoutSource: false,
      isGrocerySource: false,
      isKitchenStation: false,
      isTableSeat: false,
      isChairSeat: true,
      isLoungeSeat: false,
      isBedSeat: false,
      isBookSource: false
    })
  })

  it('stores the max simultaneous users value', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.items['item-1'].maxSimultaneousUsers).toBe(4)
  })

  it('indexes the eat affordance', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.itemsByAffordance['eat']).toEqual(['item-1'])
  })

  it('indexes the work affordance', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.itemsByAffordance['work']).toEqual(['item-1'])
  })

  it('indexes the read affordance', () => {
    const worldData = buildWorldData(completeLots, 'test-region')

    expect(worldData.itemsByAffordance['read']).toEqual(['item-2'])
  })

  it('handles lots with only indoor rooms', () => {
    const worldData = buildWorldData([
      {
        id: 'indoor-lot',
        name: 'Apartment',
        lotType: 'residential',
        indoorRooms: [
          {
            id: 'room-1',
            name: 'Living Room',
            items: []
          }
        ]
      }
    ], 'region-1')

    expect(Object.keys(worldData.spaces)).toHaveLength(1)
  })

  it('keeps indoor-only spaces addressable by id', () => {
    const worldData = buildWorldData([
      {
        id: 'indoor-lot',
        name: 'Apartment',
        lotType: 'residential',
        indoorRooms: [
          {
            id: 'room-1',
            name: 'Living Room',
            items: []
          }
        ]
      }
    ], 'region-1')

    expect(worldData.spaces['room-1']).toBeDefined()
  })

  it('indexes actions from affordances when allowedActivities is empty', () => {
    const worldData = buildWorldData([
      {
        id: 'lot-1',
        name: 'Affordance House',
        lotType: 'residential',
        indoorRooms: [
          {
            id: 'space-1',
            name: 'Bathroom',
            items: [
              {
                id: 'item-1',
                name: 'Shower Stall',
                affordances: [{ action: 'shower', weight: 1.5 }],
                allowedActivities: []
              }
            ]
          }
        ],
        outdoorAreas: []
      }
    ], 'region-1')

    expect(worldData.items['item-1'].allowedActivities).toEqual(['shower'])
  })

  it('creates an affordance index from explicit affordances', () => {
    const worldData = buildWorldData([
      {
        id: 'lot-1',
        name: 'Affordance House',
        lotType: 'residential',
        indoorRooms: [
          {
            id: 'space-1',
            name: 'Bathroom',
            items: [
              {
                id: 'item-1',
                name: 'Shower Stall',
                affordances: [{ action: 'shower', weight: 1.5 }],
                allowedActivities: []
              }
            ]
          }
        ],
        outdoorAreas: []
      }
    ], 'region-1')

    expect(worldData.itemsByAffordance.shower).toEqual(['item-1'])
  })

  it('handles lots with only outdoor areas', () => {
    const worldData = buildWorldData([
      {
        id: 'outdoor-lot',
        name: 'Park',
        lotType: 'community',
        outdoorAreas: [
          {
            id: 'area-1',
            name: 'Playground',
            items: []
          }
        ]
      }
    ], 'region-1')

    expect(Object.keys(worldData.spaces)).toHaveLength(1)
  })

  it('keeps outdoor-only spaces addressable by id', () => {
    const worldData = buildWorldData([
      {
        id: 'outdoor-lot',
        name: 'Park',
        lotType: 'community',
        outdoorAreas: [
          {
            id: 'area-1',
            name: 'Playground',
            items: []
          }
        ]
      }
    ], 'region-1')

    expect(worldData.spaces['area-1']).toBeDefined()
  })

  it('stores empty item lists for empty spaces', () => {
    const worldData = buildWorldData([
      {
        id: 'empty-lot',
        name: 'Empty Building',
        lotType: 'residential',
        indoorRooms: [
          {
            id: 'empty-room',
            name: 'Empty Room',
            items: []
          }
        ]
      }
    ], 'region-1')

    expect(worldData.spaces['empty-room'].itemIds).toEqual([])
  })

  it('creates no item entries for empty spaces', () => {
    const worldData = buildWorldData([
      {
        id: 'empty-lot',
        name: 'Empty Building',
        lotType: 'residential',
        indoorRooms: [
          {
            id: 'empty-room',
            name: 'Empty Room',
            items: []
          }
        ]
      }
    ], 'region-1')

    expect(Object.keys(worldData.items)).toHaveLength(0)
  })

  it('stores empty activity lists when items have no allowed activities', () => {
    const worldData = buildWorldData([
      {
        id: 'lot-1',
        name: 'Test',
        lotType: 'residential',
        indoorRooms: [
          {
            id: 'room-1',
            name: 'Room',
            items: [
              {
                id: 'item-1',
                name: 'Decoration',
                allowedActivities: [],
                maxSimultaneousUsers: null
              }
            ]
          }
        ]
      }
    ], 'region-1')

    expect(worldData.items['item-1'].allowedActivities).toEqual([])
  })

  it('does not create affordance indexes for activity-less items', () => {
    const worldData = buildWorldData([
      {
        id: 'lot-1',
        name: 'Test',
        lotType: 'residential',
        indoorRooms: [
          {
            id: 'room-1',
            name: 'Room',
            items: [
              {
                id: 'item-1',
                name: 'Decoration',
                allowedActivities: [],
                maxSimultaneousUsers: null
              }
            ]
          }
        ]
      }
    ], 'region-1')

    expect(Object.keys(worldData.itemsByAffordance)).toHaveLength(0)
  })

  it('indexes multiple items with the same affordance', () => {
    const worldData = buildWorldData([
      {
        id: 'lot-1',
        name: 'Test',
        lotType: 'residential',
        indoorRooms: [
          {
            id: 'room-1',
            name: 'Room',
            items: [
              {
                id: 'item-1',
                name: 'Chair',
                allowedActivities: ['read'],
                maxSimultaneousUsers: 1
              },
              {
                id: 'item-2',
                name: 'Couch',
                allowedActivities: ['read'],
                maxSimultaneousUsers: 3
              }
            ]
          }
        ]
      }
    ], 'region-1')

    expect(worldData.itemsByAffordance.read).toEqual(['item-1', 'item-2'])
  })
})
