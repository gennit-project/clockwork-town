import { describe, expect, it } from 'vitest'
import { createMockCharacterState, createMockNeeds, mockConsole } from '../../__tests__/mockData'
import { FAMILY_TIME } from '../../config/social'
import { applyFamilyPresence, familyTimeBoost, isFamilyOf } from '../familyTime'
import type { CharacterRelationship, CharacterState } from '../../types'

mockConsole()

const rel = (toCharacterId: string, labels: string[]): CharacterRelationship => ({
  id: `r-${toCharacterId}`,
  fromCharacterId: 'me',
  toCharacterId,
  shortTermScore: 0.5,
  longTermScore: 0.5,
  labels,
  isDeceasedTarget: false
})

describe('isFamilyOf', () => {
  it('counts blood relatives, partners and housemates; not friends or strangers', () => {
    const me = createMockCharacterState({ householdId: 'h1', relationships: [rel('mum', ['mother']), rel('wife', ['spouse']), rel('pal', ['best friend'])] })
    expect(isFamilyOf(me, 'mum', createMockCharacterState({ householdId: 'h2' }))).toBe(true)
    expect(isFamilyOf(me, 'wife', createMockCharacterState({ householdId: 'h3' }))).toBe(true)
    expect(isFamilyOf(me, 'flat', createMockCharacterState({ householdId: 'h1' }))).toBe(true)
    expect(isFamilyOf(me, 'pal', createMockCharacterState({ householdId: 'h4' }))).toBe(false)
    expect(isFamilyOf(me, 'nobody', undefined)).toBe(false)
  })
})

describe('familyTimeBoost', () => {
  const me = createMockCharacterState({ relationships: [rel('mum', ['mother']), rel('pal', ['friend'])] })
  const states = { mum: createMockCharacterState(), pal: createMockCharacterState() }

  it('a chat that includes family tops up the family need; with only friends, or a solo hobby, it does not', () => {
    expect(familyTimeBoost(me, { action: 'chat_friend', socialTargetId: 'mum' }, states)).toBe(FAMILY_TIME.boost)
    expect(familyTimeBoost(me, { action: 'chat_friend', socialTargetId: 'pal', groupTargetIds: ['mum'] }, states)).toBe(FAMILY_TIME.boost)
    expect(familyTimeBoost(me, { action: 'chat_friend', socialTargetId: 'pal' }, states)).toBe(0)
    expect(familyTimeBoost(me, { action: 'read' }, states)).toBe(0)
    expect(familyTimeBoost(me, { action: 'date', socialTargetId: 'mum' }, states)).toBe(0)
  })
})

describe('applyFamilyPresence', () => {
  const lot = (lotId: string) => ({ regionId: 'r', lotId, lotName: lotId, spaceId: 's', spaceName: 's' })
  const make = (over: Partial<CharacterState>) => createMockCharacterState({ needs: createMockNeeds({ family: 0.2 }), ...over })

  it('living alongside awake family adds a little each tick; apart, asleep, or with a stranger it does not', () => {
    const together = { a: make({ householdId: 'h', location: lot('home') }), b: make({ householdId: 'h', location: lot('home') }) }
    applyFamilyPresence(together)
    expect(together.a.needs.family).toBeCloseTo(0.2 + FAMILY_TIME.presencePerTick)
    expect(together.b.needs.family).toBeCloseTo(0.2 + FAMILY_TIME.presencePerTick)

    const apart = { a: make({ householdId: 'h', location: lot('home') }), b: make({ householdId: 'h', location: lot('work') }) }
    applyFamilyPresence(apart)
    expect(apart.a.needs.family).toBe(0.2)

    const asleep = { a: make({ householdId: 'h', location: lot('home'), currentAction: 'sleep' }), b: make({ householdId: 'h', location: lot('home'), currentAction: 'sleep' }) }
    applyFamilyPresence(asleep)
    expect(asleep.a.needs.family).toBe(0.2)

    const stranger = { a: make({ householdId: 'h', location: lot('home') }), b: make({ householdId: 'other', location: lot('home') }) }
    applyFamilyPresence(stranger)
    expect(stranger.a.needs.family).toBe(0.2)
  })

  it('never goes above full', () => {
    const full = { a: make({ householdId: 'h', location: lot('home'), needs: createMockNeeds({ family: 0.999 }) }), b: make({ householdId: 'h', location: lot('home') }) }
    applyFamilyPresence(full)
    expect(full.a.needs.family).toBe(1)
  })
})
