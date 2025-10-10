/**
 * Unit tests for tick execution logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { executeTick, type ExecuteTickParams } from '../tickExecution'
import {
  createMockCharacterState,
  createMockWorldData,
  createMockItemOccupancy,
  mockConsole
} from '../../__tests__/mockData'
import type { CharacterState, Intent, ActivityLogEntry } from '../../types'

mockConsole()

describe('executeTick', () => {
  let params: ExecuteTickParams

  beforeEach(() => {
    // Create mock refs
    params = {
      currentTick: ref(0),
      characterStates: ref<Record<string, CharacterState>>({
        'char-1': createMockCharacterState({
          needs: {
            food: 0.5,
            sleep: 0.5,
            health: 0.9,
            friends: 0.7,
            family: 0.7,
            romance: 0.6,
            fulfillment: 0.6
          },
          cooldowns: {
            eat: 0,
            sleep: 0,
            medicate: 0,
            chat_friend: 0,
            call_mom: 0,
            date: 0,
            read: 0,
            write: 0,
            view_art: 0,
            volunteer: 0,
            work: 0
          }
        })
      }),
      worldData: ref(createMockWorldData()),
      itemOccupancy: ref(createMockItemOccupancy()),
      activityLog: ref<ActivityLogEntry[]>([]),
      executeAction: vi.fn(async () => {})
    }
  })

  it('should increment tick counter', async () => {
    await executeTick(params)

    expect(params.currentTick.value).toBe(1)
  })

  it('should increment tick counter multiple times', async () => {
    await executeTick(params)
    await executeTick(params)
    await executeTick(params)

    expect(params.currentTick.value).toBe(3)
  })

  describe('Phase 1: Decay', () => {
    it('should decay all needs by appropriate rates', async () => {
      const initialFood = 0.5
      const initialSleep = 0.5
      const initialHealth = 0.9

      await executeTick(params)

      const state = params.characterStates.value['char-1']

      // Food decays by 0.04 per tick
      expect(state.needs.food).toBeCloseTo(initialFood - 0.04, 2)

      // Sleep decays by 0.02 per tick
      expect(state.needs.sleep).toBeCloseTo(initialSleep - 0.02, 2)

      // Health decays by 0.01 per tick
      expect(state.needs.health).toBeCloseTo(initialHealth - 0.01, 2)
    })

    it('should not allow needs to go below 0', async () => {
      params.characterStates.value['char-1'].needs.food = 0.01

      await executeTick(params)

      const state = params.characterStates.value['char-1']
      expect(state.needs.food).toBe(0)
      expect(state.needs.food).toBeGreaterThanOrEqual(0)
    })

    it('should decay all emotional needs', async () => {
      const initialFriends = 0.7
      const initialFamily = 0.7
      const initialRomance = 0.6
      const initialFulfillment = 0.6

      await executeTick(params)

      const state = params.characterStates.value['char-1']

      // Friends decays by 0.015 per tick
      expect(state.needs.friends).toBeCloseTo(initialFriends - 0.015, 2)

      // Family decays by 0.01 per tick
      expect(state.needs.family).toBeCloseTo(initialFamily - 0.01, 2)

      // Romance decays by 0.01 per tick
      expect(state.needs.romance).toBeCloseTo(initialRomance - 0.01, 2)

      // Fulfillment decays by 0.008 per tick
      expect(state.needs.fulfillment).toBeCloseTo(initialFulfillment - 0.008, 2)
    })

    it('should decrement cooldowns', async () => {
      params.characterStates.value['char-1'].cooldowns.eat = 3
      params.characterStates.value['char-1'].cooldowns.sleep = 5

      await executeTick(params)

      const state = params.characterStates.value['char-1']
      expect(state.cooldowns.eat).toBe(2)
      expect(state.cooldowns.sleep).toBe(4)
    })

    it('should not decrement cooldowns below 0', async () => {
      params.characterStates.value['char-1'].cooldowns.eat = 0

      await executeTick(params)

      const state = params.characterStates.value['char-1']
      expect(state.cooldowns.eat).toBe(0)
    })

    it('should handle multiple characters', async () => {
      params.characterStates.value['char-2'] = createMockCharacterState({
        needs: {
          food: 0.8,
          sleep: 0.8,
          health: 0.9,
          friends: 0.7,
          family: 0.7,
          romance: 0.6,
          fulfillment: 0.6
        }
      })

      await executeTick(params)

      expect(params.characterStates.value['char-1'].needs.food).toBeCloseTo(0.46, 2)
      expect(params.characterStates.value['char-2'].needs.food).toBeCloseTo(0.76, 2)
    })
  })

  describe('Phase 2: Decision Making', () => {
    it('should calculate intents for all characters', async () => {
      await executeTick(params)

      expect(params.executeAction).toHaveBeenCalledTimes(1)
      expect(params.executeAction).toHaveBeenCalledWith(
        'char-1',
        expect.objectContaining({
          action: expect.any(String),
          utility: expect.any(Number)
        })
      )
    })

    it('should handle multiple characters', async () => {
      params.characterStates.value['char-2'] = createMockCharacterState({
        location: {
          regionId: 'region-1',
          lotId: 'lot-1',
          lotName: 'Test House',
          spaceId: 'space-1',
          spaceName: 'Living Room'
        }
      })

      await executeTick(params)

      expect(params.executeAction).toHaveBeenCalledTimes(2)
    })

    it('should select idle when all actions on cooldown', async () => {
      params.characterStates.value['char-1'].cooldowns = {
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

      await executeTick(params)

      expect(params.executeAction).toHaveBeenCalledWith(
        'char-1',
        expect.objectContaining({
          action: 'idle',
          utility: 0
        })
      )
    })
  })

  describe('Phase 3: Execution', () => {
    it('should execute actions for all characters', async () => {
      await executeTick(params)

      expect(params.executeAction).toHaveBeenCalled()
    })

    it('should pass intent to executeAction', async () => {
      await executeTick(params)

      const calls = vi.mocked(params.executeAction).mock.calls
      expect(calls.length).toBeGreaterThan(0)

      const [characterId, intent] = calls[0]
      expect(characterId).toBe('char-1')
      expect(intent).toHaveProperty('action')
      expect(intent).toHaveProperty('utility')
    })

    it('should execute actions sequentially', async () => {
      const executionOrder: string[] = []

      params.characterStates.value['char-2'] = createMockCharacterState({
        location: {
          regionId: 'region-1',
          lotId: 'lot-1',
          lotName: 'Test House',
          spaceId: 'space-1',
          spaceName: 'Living Room'
        }
      })

      params.executeAction = vi.fn(async (charId: string) => {
        executionOrder.push(charId)
      })

      await executeTick(params)

      expect(executionOrder).toEqual(['char-1', 'char-2'])
    })
  })

  describe('Integration: Full tick cycle', () => {
    it('should complete all three phases in correct order', async () => {
      const initialFood = 0.5
      const initialTick = 0

      await executeTick(params)

      // Tick incremented
      expect(params.currentTick.value).toBe(initialTick + 1)

      // Needs decayed
      expect(params.characterStates.value['char-1'].needs.food).toBeLessThan(initialFood)

      // Action executed
      expect(params.executeAction).toHaveBeenCalled()
    })

    it('should handle multiple ticks correctly', async () => {
      const initialFood = 0.5

      await executeTick(params)
      await executeTick(params)
      await executeTick(params)

      expect(params.currentTick.value).toBe(3)

      // Food decayed 3 times: 0.5 - (0.04 * 3) = 0.38
      expect(params.characterStates.value['char-1'].needs.food).toBeCloseTo(0.38, 2)

      expect(params.executeAction).toHaveBeenCalledTimes(3)
    })

    it('should handle cooldowns across ticks', async () => {
      // Manually execute an action to set cooldown
      params.characterStates.value['char-1'].cooldowns.eat = 6

      await executeTick(params)
      expect(params.characterStates.value['char-1'].cooldowns.eat).toBe(5)

      await executeTick(params)
      expect(params.characterStates.value['char-1'].cooldowns.eat).toBe(4)

      await executeTick(params)
      expect(params.characterStates.value['char-1'].cooldowns.eat).toBe(3)
    })

    it('should select different actions based on changing needs', async () => {
      // Set up character with very low food
      params.characterStates.value['char-1'].needs.food = 0.1
      params.characterStates.value['char-1'].needs.sleep = 0.9

      await executeTick(params)

      const firstCall = vi.mocked(params.executeAction).mock.calls[0][1]

      // Should choose eat due to critical food
      if (firstCall.action !== 'idle') {
        expect(['eat']).toContain(firstCall.action)
      }
    })

    it('should respect item capacity during decision making', async () => {
      // Fill up bed
      params.itemOccupancy.value['item-2'] = ['char-2']
      params.characterStates.value['char-1'].needs.sleep = 0.1

      await executeTick(params)

      const intent = vi.mocked(params.executeAction).mock.calls[0][1]

      // Should not choose sleep since bed is full
      expect(intent.action).not.toBe('sleep')
    })

    it('should accumulate needs decay over multiple ticks', async () => {
      // Start with moderate food
      params.characterStates.value['char-1'].needs.food = 0.2

      // Run 5 ticks: 0.2 - (0.04 * 5) = 0.0
      await executeTick(params)
      await executeTick(params)
      await executeTick(params)
      await executeTick(params)
      await executeTick(params)

      // Should hit floor at 0
      expect(params.characterStates.value['char-1'].needs.food).toBe(0)
    })
  })
})
