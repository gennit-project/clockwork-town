import { describe, it, expect } from 'vitest'
import { NEED_GATING } from '../../config/needGating'
import { calculateUtility, selectBestIntent } from '../decisionMaking'
import { gatingMultiplier, isTierUnlocked, tierAverage, tierOfNeed } from '../needGating'
import {
  createMockCharacterState,
  createMockItemOccupancy,
  createMockNeeds,
  createMockWorldData,
  mockConsole
} from '../../__tests__/mockData'
import type { ItemOption } from '../../types'

mockConsole()

const basicNeeds = (value: number) => ({ food: value, sleep: value, bladder: value, hygiene: value, health: value })
const emotionalNeeds = (value: number) => ({ friends: value, family: value, romance: value })

const option: ItemOption = {
  itemId: 'i', itemName: 'i', spaceId: 's', spaceName: 's', lotId: 'l', lotName: 'l', travelCost: 0, affordanceWeight: 1
}

describe('need tiers', () => {
  it('classifies needs into tiers', () => {
    expect(tierOfNeed('food')).toBe('basic')
    expect(tierOfNeed('romance')).toBe('emotional')
    expect(tierOfNeed('fulfillment')).toBe('higher')
  })

  it('averages a tier', () => {
    const needs = createMockNeeds({ ...basicNeeds(0.5), food: 0, sleep: 1 })
    expect(tierAverage('basic', needs)).toBeCloseTo(0.5)
  })

  it('always unlocks basic; unlocks emotional on basic average, higher on emotional average', () => {
    const starving = createMockNeeds({ ...basicNeeds(0), ...emotionalNeeds(1) })
    expect(isTierUnlocked('basic', starving)).toBe(true)
    expect(isTierUnlocked('emotional', starving)).toBe(false)

    const lonely = createMockNeeds({ ...basicNeeds(1), ...emotionalNeeds(0) })
    expect(isTierUnlocked('emotional', lonely)).toBe(true)
    expect(isTierUnlocked('higher', lonely)).toBe(false)
  })

  it('unlocks exactly at the threshold', () => {
    const t = NEED_GATING.unlockThreshold
    expect(isTierUnlocked('emotional', createMockNeeds(basicNeeds(t)))).toBe(true)
    expect(isTierUnlocked('emotional', createMockNeeds(basicNeeds(t - 0.01)))).toBe(false)
  })

  it('multiplier is 1 when unlocked and the penalty when locked', () => {
    expect(gatingMultiplier('friends', createMockNeeds(basicNeeds(1)))).toBe(1)
    expect(gatingMultiplier('friends', createMockNeeds(basicNeeds(0)))).toBe(NEED_GATING.lockedUtilityMultiplier)
    expect(gatingMultiplier('food', createMockNeeds(basicNeeds(0)))).toBe(1)
  })
})

describe('gating in calculateUtility', () => {
  it('suppresses a social action while basic needs are unmet and restores it afterward', () => {
    const needs = { ...emotionalNeeds(0) }
    const locked = calculateUtility('c', 'chat_friend', createMockNeeds({ ...needs, ...basicNeeds(0.1) }), option)
    const unlocked = calculateUtility('c', 'chat_friend', createMockNeeds({ ...needs, ...basicNeeds(0.9) }), option)
    expect(locked).toBeCloseTo(2.0 * NEED_GATING.lockedUtilityMultiplier, 5)
    expect(unlocked).toBeCloseTo(2.0, 5)
  })

  it('does not change basic-need utility', () => {
    const u = calculateUtility('c', 'eat', createMockNeeds({ ...basicNeeds(0.1) }), option)
    expect(u).toBeCloseTo(3.0 * 0.9, 5)
  })

  it('suppresses fulfillment actions while emotional needs are unmet', () => {
    const u = calculateUtility('c', 'read', createMockNeeds({ ...basicNeeds(1), ...emotionalNeeds(0), fulfillment: 0 }), option)
    expect(u).toBeCloseTo(NEED_GATING.lockedUtilityMultiplier, 5)
  })
})

describe('gating in selectBestIntent', () => {
  it('a struggling resident picks a basic-need action even when social need is maxed out', () => {
    const state = createMockCharacterState()
    Object.assign(state.needs, basicNeeds(0.1), { friends: 0, family: 0, romance: 0, fulfillment: 0 })
    const intent = selectBestIntent({
      characterId: 'char-1',
      characterState: state,
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })
    expect(['eat', 'sleep', 'use_toilet', 'shower', 'medicate']).toContain(intent.action)
  })
})
