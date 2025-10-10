/**
 * Unit tests for pathfinding utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { findItemsWithAffordance, buildWorldData } from '../pathfinding'
import {
  createMockWorldData,
  createMockItemOccupancy,
  mockConsole
} from '../../__tests__/mockData'
import type { CharacterLocation, WorldData, ItemOccupancy } from '../../types'

mockConsole()

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

  it('should find items in same space with travel cost 0', () => {
    const results = findItemsWithAffordance(
      'char-1',
      'read',
      characterLocation,
      worldData
    )

    const sameSpaceItems = results.filter(r => r.travelCost === 0)
    expect(sameSpaceItems.length).toBe(1)
    expect(sameSpaceItems[0].itemId).toBe('item-1')
    expect(sameSpaceItems[0].itemName).toBe('Couch')
    expect(sameSpaceItems[0].spaceId).toBe('space-1')
  })

  it('should find items in same lot with travel cost 1', () => {
    const results = findItemsWithAffordance(
      'char-1',
      'eat',
      characterLocation,
      worldData
    )

    expect(results.length).toBe(1)
    expect(results[0].travelCost).toBe(1)
    expect(results[0].itemId).toBe('item-3')
    expect(results[0].itemName).toBe('Fridge')
    expect(results[0].lotId).toBe('lot-1')
    expect(results[0].spaceId).toBe('space-2')
  })

  it('should find items in same region with travel cost 2', () => {
    const results = findItemsWithAffordance(
      'char-1',
      'read',
      characterLocation,
      worldData
    )

    const differentLotItems = results.filter(r => r.travelCost === 2)
    expect(differentLotItems.length).toBe(1)
    expect(differentLotItems[0].itemId).toBe('item-4')
    expect(differentLotItems[0].itemName).toBe('Bookshelf')
    expect(differentLotItems[0].lotId).toBe('lot-2')
  })

  it('should sort results by travel cost (lowest first)', () => {
    const results = findItemsWithAffordance(
      'char-1',
      'read',
      characterLocation,
      worldData
    )

    expect(results.length).toBe(2)
    expect(results[0].travelCost).toBe(0) // Couch in same space
    expect(results[1].travelCost).toBe(2) // Bookshelf in different lot
  })

  it('should return empty array for non-existent action', () => {
    const results = findItemsWithAffordance(
      'char-1',
      'nonexistent_action',
      characterLocation,
      worldData
    )

    expect(results).toEqual([])
  })

  it('should exclude items at capacity', () => {
    const itemOccupancy: ItemOccupancy = {
      'item-2': ['char-2'] // Bed has maxSimultaneousUsers: 1
    }

    const results = findItemsWithAffordance(
      'char-1',
      'sleep',
      characterLocation,
      worldData,
      itemOccupancy
    )

    expect(results).toEqual([])
  })

  it('should include items below capacity', () => {
    const itemOccupancy: ItemOccupancy = {
      'item-1': ['char-2', 'char-3'] // Couch has maxSimultaneousUsers: 3
    }

    const results = findItemsWithAffordance(
      'char-1',
      'read',
      characterLocation,
      worldData,
      itemOccupancy
    )

    const couch = results.find(r => r.itemId === 'item-1')
    expect(couch).toBeDefined()
  })

  it('should not limit items with null maxSimultaneousUsers', () => {
    const itemOccupancy: ItemOccupancy = {
      'item-3': ['char-2', 'char-3', 'char-4', 'char-5'] // Fridge has no limit
    }

    const results = findItemsWithAffordance(
      'char-1',
      'eat',
      characterLocation,
      worldData,
      itemOccupancy
    )

    expect(results.length).toBe(1)
    expect(results[0].itemId).toBe('item-3')
  })

  it('should return empty array for incomplete character location', () => {
    const incompleteLocation: CharacterLocation = {
      regionId: null,
      lotId: null,
      lotName: null,
      spaceId: null,
      spaceName: null
    }

    const results = findItemsWithAffordance(
      'char-1',
      'eat',
      incompleteLocation,
      worldData
    )

    expect(results).toEqual([])
  })

  it('should handle items with multiple affordances', () => {
    // Couch has both 'read' and 'chat_friend'
    const readResults = findItemsWithAffordance(
      'char-1',
      'read',
      characterLocation,
      worldData
    )
    const chatResults = findItemsWithAffordance(
      'char-1',
      'chat_friend',
      characterLocation,
      worldData
    )

    expect(readResults.some(r => r.itemId === 'item-1')).toBe(true)
    expect(chatResults.some(r => r.itemId === 'item-1')).toBe(true)
  })
})

describe('buildWorldData', () => {
  it('should build world data from lot array', () => {
    const lots = [
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

    const worldData = buildWorldData(lots, 'test-region')

    // Check lots
    expect(Object.keys(worldData.lots)).toHaveLength(1)
    expect(worldData.lots['test-lot-1'].name).toBe('Test Building')
    expect(worldData.lots['test-lot-1'].regionId).toBe('test-region')
    expect(worldData.lots['test-lot-1'].spaceIds).toEqual(['room-1', 'area-1'])

    // Check spaces
    expect(Object.keys(worldData.spaces)).toHaveLength(2)
    expect(worldData.spaces['room-1'].name).toBe('Main Room')
    expect(worldData.spaces['room-1'].lotId).toBe('test-lot-1')
    expect(worldData.spaces['room-1'].itemIds).toEqual(['item-1'])

    // Check items
    expect(Object.keys(worldData.items)).toHaveLength(2)
    expect(worldData.items['item-1'].name).toBe('Table')
    expect(worldData.items['item-1'].spaceId).toBe('room-1')
    expect(worldData.items['item-1'].lotId).toBe('test-lot-1')
    expect(worldData.items['item-1'].regionId).toBe('test-region')
    expect(worldData.items['item-1'].allowedActivities).toEqual(['eat', 'work'])
    expect(worldData.items['item-1'].maxSimultaneousUsers).toBe(4)

    // Check itemsByAffordance index
    expect(worldData.itemsByAffordance['eat']).toEqual(['item-1'])
    expect(worldData.itemsByAffordance['work']).toEqual(['item-1'])
    expect(worldData.itemsByAffordance['read']).toEqual(['item-2'])
  })

  it('should handle lots with only indoor rooms', () => {
    const lots = [
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
    ]

    const worldData = buildWorldData(lots, 'region-1')

    expect(Object.keys(worldData.spaces)).toHaveLength(1)
    expect(worldData.spaces['room-1']).toBeDefined()
  })

  it('should handle lots with only outdoor areas', () => {
    const lots = [
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
    ]

    const worldData = buildWorldData(lots, 'region-1')

    expect(Object.keys(worldData.spaces)).toHaveLength(1)
    expect(worldData.spaces['area-1']).toBeDefined()
  })

  it('should handle spaces with no items', () => {
    const lots = [
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
    ]

    const worldData = buildWorldData(lots, 'region-1')

    expect(worldData.spaces['empty-room'].itemIds).toEqual([])
    expect(Object.keys(worldData.items)).toHaveLength(0)
  })

  it('should handle items with no allowedActivities', () => {
    const lots = [
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
    ]

    const worldData = buildWorldData(lots, 'region-1')

    expect(worldData.items['item-1'].allowedActivities).toEqual([])
    expect(Object.keys(worldData.itemsByAffordance)).toHaveLength(0)
  })

  it('should index multiple items with same affordance', () => {
    const lots = [
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
    ]

    const worldData = buildWorldData(lots, 'region-1')

    expect(worldData.itemsByAffordance['read']).toEqual(['item-1', 'item-2'])
  })
})
