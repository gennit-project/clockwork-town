import { describe, expect, it } from 'vitest'
import { createMockCharacterState, createMockNeeds } from '../../__tests__/mockData'
import { WITNESS_MOOD } from '../../config/social'
import { TRAIT_EFFECTS } from '../../config/traitEffects'
import { applyWitnessMood, witnessMoodGain, witnessMoodsOf } from '../witnessMood'
import type { CharacterState } from '../../types'

const GOOD = 'trait-good-hearted'
const BITTER = 'trait-bitter'

const allNeeds = (value: number) =>
  createMockNeeds({
    food: value, sleep: value, bladder: value, hygiene: value, health: value,
    friends: value, family: value, romance: value, fulfillment: value
  })
const neighbor = (happiness: number): Pick<CharacterState, 'needs' | 'traitIds'> => ({ needs: allNeeds(happiness), traitIds: [] })

describe('witness mood traits', () => {
  it('maps traits to reactions, and only those traits', () => {
    expect([...witnessMoodsOf([GOOD])]).toEqual(['joy'])
    expect([...witnessMoodsOf([BITTER])]).toEqual(['schadenfreude'])
    expect(witnessMoodsOf(['trait-big-appetite']).size).toBe(0)
    expect(witnessMoodsOf(undefined).size).toBe(0)
  })

  it('declares only valid reactions in the trait effects', () => {
    for (const effect of Object.values(TRAIT_EFFECTS)) {
      if (effect.witnessMood) expect(['joy', 'schadenfreude']).toContain(effect.witnessMood)
    }
  })
})

describe('witnessMoodGain', () => {
  it('a good-hearted resident gains from happy neighbors only', () => {
    expect(witnessMoodGain([GOOD], [neighbor(0.9)])).toBeCloseTo(WITNESS_MOOD.perNeighbor)
    expect(witnessMoodGain([GOOD], [neighbor(0.55)])).toBe(0)
    expect(witnessMoodGain([GOOD], [neighbor(0.2)])).toBe(0)
  })

  it('a bitter resident gains from unhappy neighbors only', () => {
    expect(witnessMoodGain([BITTER], [neighbor(0.2)])).toBeCloseTo(WITNESS_MOOD.perNeighbor)
    expect(witnessMoodGain([BITTER], [neighbor(0.55)])).toBe(0)
    expect(witnessMoodGain([BITTER], [neighbor(0.9)])).toBe(0)
  })

  it('an ordinary resident gains nothing either way (control)', () => {
    expect(witnessMoodGain([], [neighbor(0.9), neighbor(0.1)])).toBe(0)
  })

  it('the thresholds are inclusive', () => {
    expect(witnessMoodGain([GOOD], [neighbor(WITNESS_MOOD.happyAtOrAbove)])).toBeGreaterThan(0)
    expect(witnessMoodGain([BITTER], [neighbor(WITNESS_MOOD.unhappyAtOrBelow)])).toBeGreaterThan(0)
  })

  it('adds up per neighbor but is capped per tick', () => {
    expect(witnessMoodGain([GOOD], [neighbor(0.9), neighbor(0.9)])).toBeCloseTo(2 * WITNESS_MOOD.perNeighbor)
    const crowd = Array.from({ length: 10 }, () => neighbor(0.9))
    expect(witnessMoodGain([GOOD], crowd)).toBe(WITNESS_MOOD.maxPerTick)
  })

  it('someone with both traits gains from both kinds of neighbor', () => {
    expect(witnessMoodGain([GOOD, BITTER], [neighbor(0.9), neighbor(0.1)])).toBeCloseTo(2 * WITNESS_MOOD.perNeighbor)
  })
})

describe('applyWitnessMood', () => {
  const lot = (id: string) => ({ regionId: 'r', lotId: id, lotName: id, spaceId: 's', spaceName: 's' })

  it('lifts fulfillment for a good-hearted resident among happy people on the same lot', () => {
    const states = {
      kind: createMockCharacterState({ traitIds: [GOOD], location: lot('a'), needs: createMockNeeds({ fulfillment: 0.5 }) }),
      happy: createMockCharacterState({ location: lot('a'), needs: allNeeds(0.95) }),
      faraway: createMockCharacterState({ location: lot('b'), needs: allNeeds(0.95) })
    }
    applyWitnessMood(states)
    expect(states.kind.needs.fulfillment).toBeCloseTo(0.5 + WITNESS_MOOD.perNeighbor) // not the one on another lot
    expect(states.happy.needs.fulfillment).toBe(0.95)
  })

  it('does nothing for someone alone, and never goes past full', () => {
    const alone = { kind: createMockCharacterState({ traitIds: [GOOD], location: lot('a'), needs: createMockNeeds({ fulfillment: 0.5 }) }) }
    applyWitnessMood(alone)
    expect(alone.kind.needs.fulfillment).toBe(0.5)

    const full = {
      kind: createMockCharacterState({ traitIds: [GOOD], location: lot('a'), needs: createMockNeeds({ fulfillment: 1 }) }),
      happy: createMockCharacterState({ location: lot('a'), needs: allNeeds(0.95) })
    }
    applyWitnessMood(full)
    expect(full.kind.needs.fulfillment).toBe(1)
  })

  it('a bitter resident is cheered by an unhappy neighbor', () => {
    const states = {
      grump: createMockCharacterState({ traitIds: [BITTER], location: lot('a'), needs: createMockNeeds({ fulfillment: 0.5 }) }),
      sad: createMockCharacterState({ location: lot('a'), needs: allNeeds(0.1) })
    }
    applyWitnessMood(states)
    expect(states.grump.needs.fulfillment).toBeCloseTo(0.5 + WITNESS_MOOD.perNeighbor)
  })
})
