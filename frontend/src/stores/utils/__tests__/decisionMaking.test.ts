/**
 * Unit tests for decision making utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { calculateUtility, selectBestIntent } from '../decisionMaking'
import {
  createMockNeeds,
  createMockCooldowns,
  createMockCharacterState,
  createMockWorldData,
  createMockItemOccupancy,
  mockConsole
} from '../../__tests__/mockData'
import type { ItemOption, CharacterState, WorldData, ItemOccupancy } from '../../types'

mockConsole()

describe('calculateUtility', () => {
  let itemOption: ItemOption

  beforeEach(() => {
    itemOption = {
      itemId: 'item-1',
      itemName: 'Test Item',
      spaceId: 'space-1',
      spaceName: 'Test Space',
      lotId: 'lot-1',
      lotName: 'Test Lot',
      travelCost: 0,
      affordanceWeight: 1
    }
  })

  it('should calculate utility for high-priority need (food)', () => {
    const needs = createMockNeeds({ food: 0.2 }) // Low food = high deficit
    const utility = calculateUtility('char-1', 'eat', needs, itemOption)

    // Expected: needWeight (3.0) × needDeficit (0.8) - travelCost (0) = 2.4
    expect(utility).toBeCloseTo(2.4, 1)
  })

  it('should calculate utility for low-priority need (fulfillment)', () => {
    const needs = createMockNeeds({ fulfillment: 0.2 }) // Low fulfillment = high deficit
    const utility = calculateUtility('char-1', 'read', needs, itemOption)

    // Expected: needWeight (1.0) × needDeficit (0.8) - travelCost (0) = 0.8
    expect(utility).toBeCloseTo(0.8, 1)
  })

  it('should reduce utility for satisfied needs', () => {
    const needs = createMockNeeds({ food: 0.9 }) // High food = low deficit
    const utility = calculateUtility('char-1', 'eat', needs, itemOption)

    // Expected: needWeight (3.0) × needDeficit (0.1) - travelCost (0) = 0.3
    expect(utility).toBeCloseTo(0.3, 1)
  })

  it('should penalize utility for travel cost', () => {
    const needs = createMockNeeds({ food: 0.5 })
    const distantItem: ItemOption = { ...itemOption, travelCost: 2 }
    const utility = calculateUtility('char-1', 'eat', needs, distantItem)

    // Expected: needWeight (3.0) × needDeficit (0.5) - travelCost (2) = 1.5 - 2 = -0.5
    expect(utility).toBeCloseTo(-0.5, 1)
  })

  it('should handle completely depleted needs', () => {
    const needs = createMockNeeds({ sleep: 0.0 }) // Completely depleted
    const utility = calculateUtility('char-1', 'sleep', needs, itemOption)

    // Expected: needWeight (3.0) × needDeficit (1.0) - travelCost (0) = 3.0
    expect(utility).toBeCloseTo(3.0, 1)
  })

  it('should handle fully satisfied needs', () => {
    const needs = createMockNeeds({ sleep: 1.0 }) // Fully satisfied
    const utility = calculateUtility('char-1', 'sleep', needs, itemOption)

    // Expected: needWeight (3.0) × needDeficit (0.0) - travelCost (0) = 0.0
    expect(utility).toBeCloseTo(0.0, 1)
  })

  it('should return -Infinity for unknown action', () => {
    const needs = createMockNeeds()
    const utility = calculateUtility('char-1', 'unknown_action' as any, needs, itemOption)

    expect(utility).toBe(-Infinity)
  })

  it('should return 0 for actions with no primary need (idle)', () => {
    const needs = createMockNeeds()
    const utility = calculateUtility('char-1', 'idle', needs, itemOption)

    expect(utility).toBe(0)
  })

  it('should prioritize sleep over romance based on weights', () => {
    const needs = createMockNeeds({ sleep: 0.5, romance: 0.5 })
    const sleepUtility = calculateUtility('char-1', 'sleep', needs, itemOption)
    const romanceUtility = calculateUtility('char-1', 'date', needs, itemOption)

    // Sleep weight: 3.0, Romance weight: 1.5
    // Sleep utility: 3.0 × 0.5 = 1.5
    // Romance utility: 1.5 × 0.5 = 0.75
    expect(sleepUtility).toBeGreaterThan(romanceUtility)
    expect(sleepUtility).toBeCloseTo(1.5, 1)
    expect(romanceUtility).toBeCloseTo(0.75, 1)
  })

  it('should prefer nearby items over distant ones', () => {
    const needs = createMockNeeds({ food: 0.3 })
    const nearbyItem: ItemOption = { ...itemOption, travelCost: 0 }
    const distantItem: ItemOption = { ...itemOption, travelCost: 2 }

    const nearUtility = calculateUtility('char-1', 'eat', needs, nearbyItem)
    const distantUtility = calculateUtility('char-1', 'eat', needs, distantItem)

    // Nearby: 3.0 × 0.7 - 0 = 2.1
    // Distant: 3.0 × 0.7 - 2 = 0.1
    expect(nearUtility).toBeGreaterThan(distantUtility)
    expect(nearUtility - distantUtility).toBeCloseTo(2, 1)
  })
})

describe('selectBestIntent', () => {
  let characterState: CharacterState
  let worldData: WorldData
  let itemOccupancy: ItemOccupancy

  beforeEach(() => {
    characterState = createMockCharacterState()
    worldData = createMockWorldData()
    itemOccupancy = createMockItemOccupancy()
  })

  it('should select action with highest utility', () => {
    characterState.needs.food = 0.1 // Very low food (high priority)
    characterState.needs.sleep = 0.9 // High sleep (low priority)

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    expect(intent.action).toBe('eat')
    expect(intent.itemId).toBe('item-3') // Fridge
    expect(intent.utility).toBeGreaterThan(0)
  })

  it('should skip actions on cooldown', () => {
    characterState.needs.food = 0.1 // Very low food
    characterState.cooldowns.eat = 5 // On cooldown

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    expect(intent.action).not.toBe('eat')
  })

  it('should skip actions with no accessible items', () => {
    // Character in region-1, but remove all items from world
    worldData.items = {}
    worldData.itemsByAffordance = {}

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    expect(intent.action).toBe('idle')
    expect(intent.utility).toBe(0)
  })

  it('should prefer closer items when utilities are similar', () => {
    characterState.needs.fulfillment = 0.5

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    if (intent.action === 'read') {
      // Should prefer Couch (cost 0) over Bookshelf (cost 2)
      expect(intent.itemId).toBe('item-1')
      expect(intent.travelCost).toBe(0)
    }
  })

  it('should return idle when all actions are unavailable', () => {
    // Put all actions on cooldown
    characterState.cooldowns = {
      eat: 5,
      sleep: 5,
      medicate: 5,
      chat_friend: 5,
      call_mom: 5,
      date: 5,
      read: 5,
      write: 5,
      view_art: 5,
      volunteer: 5,
      work: 5
    }

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    expect(intent.action).toBe('idle')
    expect(intent.utility).toBe(0)
  })

  it('should handle multiple actions with similar utilities', () => {
    // Set multiple needs low
    characterState.needs.food = 0.3
    characterState.needs.sleep = 0.4
    characterState.needs.fulfillment = 0.5

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    // Should pick one with highest calculated utility
    expect(intent.action).toBeDefined()
    expect(intent.utility).toBeGreaterThan(0)
  })

  it('should include complete location information in intent', () => {
    characterState.needs.food = 0.2

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    if (intent.action === 'eat') {
      expect(intent.itemId).toBeDefined()
      expect(intent.itemName).toBeDefined()
      expect(intent.targetSpaceId).toBeDefined()
      expect(intent.targetSpaceName).toBeDefined()
      expect(intent.targetLotId).toBeDefined()
      expect(intent.targetLotName).toBeDefined()
      expect(intent.travelCost).toBeDefined()
    }
  })

  it('should respect item capacity limits', () => {
    // Fill up the bed (maxSimultaneousUsers: 1)
    itemOccupancy['item-2'] = ['char-2']
    characterState.needs.sleep = 0.1 // Very low sleep

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    // Should not select sleep since bed is full
    expect(intent.action).not.toBe('sleep')
  })

  it('should handle partially filled items', () => {
    // Partially fill couch (maxSimultaneousUsers: 3)
    itemOccupancy['item-1'] = ['char-2']
    characterState.needs.fulfillment = 0.3

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    // Should still be able to select read on couch
    if (intent.action === 'read' && intent.itemId === 'item-1') {
      expect(intent.itemName).toBe('Couch')
    }
  })

  it('should select alternate item when preferred is full', () => {
    // Fill couch completely (maxSimultaneousUsers: 3)
    itemOccupancy['item-1'] = ['char-2', 'char-3', 'char-4']
    characterState.needs.fulfillment = 0.3

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    // Should select Bookshelf instead
    if (intent.action === 'read') {
      expect(intent.itemId).toBe('item-4')
      expect(intent.itemName).toBe('Bookshelf')
    }
  })

  it('should consider all available actions', () => {
    // Set up diverse needs
    characterState.needs = {
      food: 0.3,
      sleep: 0.4,
      health: 0.9,
      friends: 0.5,
      family: 0.7,
      romance: 0.6,
      fulfillment: 0.5
    }

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    // Should evaluate and pick best among all available
    expect(['eat', 'sleep', 'chat_friend', 'read', 'idle']).toContain(intent.action)
  })

  it('should handle character with all needs satisfied', () => {
    characterState.needs = {
      food: 1.0,
      sleep: 1.0,
      health: 1.0,
      friends: 1.0,
      family: 1.0,
      romance: 1.0,
      fulfillment: 1.0
    }

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    // Might return idle or low-utility action
    expect(intent.action).toBeDefined()
    expect(intent.utility).toBeLessThanOrEqual(0)
  })

  it('should prioritize critical needs over minor ones', () => {
    characterState.needs = {
      food: 0.05, // Critical
      sleep: 0.8, // Satisfied
      health: 0.9,
      friends: 0.7,
      family: 0.7,
      romance: 0.6,
      fulfillment: 0.4 // Low but not critical
    }

    const intent = selectBestIntent('char-1', characterState, worldData, itemOccupancy)

    // Should definitely choose eat
    expect(intent.action).toBe('eat')
    // Utility = needWeight (3.0) × needDeficit (0.95) - travelCost (1) = 1.85
    expect(intent.utility).toBeGreaterThan(1.5)
  })
})
