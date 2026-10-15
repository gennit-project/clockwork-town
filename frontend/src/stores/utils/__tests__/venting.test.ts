import { describe, expect, it } from 'vitest'
import {
  createMockCharacterState,
  createMockItemOccupancy,
  createMockNeeds,
  createMockWorldData,
  mockConsole
} from '../../__tests__/mockData'
import { VENTING } from '../../config/social'
import { buildPlanCandidates } from '../intentPlanner'
import {
  canVentTo,
  comfortEatBonus,
  comfortFromEating,
  isUpset,
  unventedGrievances,
  ventGrievances,
  ventingChatBonus
} from '../venting'
import { addGrievance } from '../witnessReactions'
import { getApprovalTopic } from '../../config/approvalTopics'
import type { CharacterRelationship, CharacterState, Grievance } from '../../types'

mockConsole()

const grievance = (aboutId: string, over: Partial<Grievance> = {}): Grievance => ({
  id: `${aboutId}:daytime-napping`,
  aboutCharacterId: aboutId,
  aboutName: aboutId.toUpperCase(),
  topicId: 'daytime-napping',
  summary: 'napping in the daytime',
  ticksRemaining: 600,
  times: 1,
  ...over
})

const relationship = (toId: string, longTermScore: number, over: Partial<CharacterRelationship> = {}): CharacterRelationship => ({
  id: `rel-${toId}`,
  fromCharacterId: 'me',
  toCharacterId: toId,
  shortTermScore: longTermScore,
  longTermScore,
  labels: [],
  isDeceasedTarget: false,
  ...over
})

const upsetAbout = (offenderId: string, relationships: CharacterRelationship[] = []) =>
  createMockCharacterState({ grievances: [grievance(offenderId)], relationships })

describe('being upset', () => {
  it('is upset while holding a grievance they have not talked over', () => {
    expect(isUpset(createMockCharacterState())).toBe(false)
    expect(isUpset(upsetAbout('cy'))).toBe(true)
    expect(isUpset(createMockCharacterState({ grievances: [grievance('cy', { vented: true })] }))).toBe(false)
    expect(unventedGrievances(createMockCharacterState({ grievances: [grievance('a'), grievance('b', { vented: true })] }))).toHaveLength(1)
  })
})

describe('canVentTo', () => {
  it('needs a good enough friend', () => {
    const upset = (score: number) => upsetAbout('cy', [relationship('bob', score)])
    expect(canVentTo(upset(VENTING.friendMinLongTerm), 'bob')).toBe(true)
    expect(canVentTo(upset(VENTING.friendMinLongTerm - 0.01), 'bob')).toBe(false)
    expect(canVentTo(upset(0.9), 'stranger')).toBe(false)
  })

  it('not someone they have lost', () => {
    const state = upsetAbout('cy', [relationship('bob', 0.9, { isDeceasedTarget: true })])
    expect(canVentTo(state, 'bob')).toBe(false)
  })

  it('not to the person they are upset with, unless they are also upset with someone else', () => {
    const state = upsetAbout('cy', [relationship('cy', 0.9)])
    expect(canVentTo(state, 'cy')).toBe(false)
    state.grievances = [grievance('cy'), grievance('dee')]
    expect(canVentTo(state, 'cy')).toBe(true)
  })

  it('not once everything has been talked over', () => {
    const state = createMockCharacterState({ grievances: [grievance('cy', { vented: true })], relationships: [relationship('bob', 0.9)] })
    expect(canVentTo(state, 'bob')).toBe(false)
  })
})

describe('planner nudges while upset', () => {
  it('chat bonus goes to a friend they can complain to only', () => {
    const state = upsetAbout('cy', [relationship('bob', 0.9), relationship('weak', 0.1), relationship('cy', 0.9)])
    expect(ventingChatBonus(state, 'bob')).toBe(VENTING.chatBonus)
    expect(ventingChatBonus(state, 'weak')).toBe(0)
    expect(ventingChatBonus(state, 'cy')).toBe(0)
    expect(ventingChatBonus(state, undefined)).toBe(0)
  })

  it('no bonus when not upset (control)', () => {
    const calm = createMockCharacterState({ relationships: [relationship('bob', 0.9)] })
    expect(ventingChatBonus(calm, 'bob')).toBe(0)
    expect(comfortEatBonus(calm)).toBe(0)
  })

  it('is much weaker when the basics are not met', () => {
    const starving = upsetAbout('cy', [relationship('bob', 0.9)])
    starving.needs = createMockNeeds({ food: 0, sleep: 0, bladder: 0, hygiene: 0, health: 0 })
    expect(ventingChatBonus(starving, 'bob')).toBeCloseTo(VENTING.chatBonus * 0.1)
  })

  it('comfort food is attractive while upset, and not once talked over', () => {
    expect(comfortEatBonus(upsetAbout('cy'))).toBe(VENTING.comfortEatBonus)
    expect(comfortEatBonus(createMockCharacterState({ grievances: [grievance('cy', { vented: true })] }))).toBe(0)
  })

  describe('in the planner', () => {
    const plan = (self: CharacterState, others: Record<string, CharacterState>, world = createMockWorldData()) =>
      buildPlanCandidates({
        characterId: 'me',
        characterState: self,
        worldData: world,
        itemOccupancy: createMockItemOccupancy(),
        characterStates: { me: self, ...others }
      })
    const withCapacity = (n: number) => {
      const world = createMockWorldData()
      world.items['item-1'].maxSimultaneousUsers = n
      return world
    }
    const best = (cs: ReturnType<typeof plan>, pred: (c: ReturnType<typeof plan>[number]) => boolean) =>
      cs.filter(pred).sort((a, b) => b.utility - a.utility)[0]
    const chatWith = (id: string) => (c: ReturnType<typeof plan>[number]) =>
      c.goal === 'chat_friend' && c.strategy === 'chat_friend:with-participant' && c.primaryStep.socialTargetId === id
    const others = () => ({ bob: createMockCharacterState({ name: 'Bob' }), cy: createMockCharacterState({ name: 'Cy' }) })

    it('an upset resident is drawn to chat with a friend more than a calm one is', () => {
      const rels = [relationship('bob', 0.9), relationship('cy', 0.9)]
      const calm = best(plan(createMockCharacterState({ relationships: rels }), others(), withCapacity(2)), chatWith('bob')).utility
      const upset = best(plan(upsetAbout('cy', rels), others(), withCapacity(2)), chatWith('bob')).utility
      expect(upset - calm).toBeCloseTo(VENTING.chatBonus)
    })

    it('but not toward the person they are upset with (control)', () => {
      const rels = [relationship('bob', 0.9), relationship('cy', 0.9)]
      const calm = best(plan(createMockCharacterState({ relationships: rels }), others(), withCapacity(2)), chatWith('cy')).utility
      const upset = best(plan(upsetAbout('cy', rels), others(), withCapacity(2)), chatWith('cy')).utility
      expect(upset).toBeCloseTo(calm)
    })

    it('a group chat whose main partner is a friend also gets the nudge', () => {
      // Bob is clearly the closest, so he is the group's main partner; Cy (the offender) is an extra.
      const rels = [relationship('bob', 0.99), relationship('cy', 0.5), relationship('dee', 0.5)]
      const all = { ...others(), dee: createMockCharacterState({ name: 'Dee' }) }
      const group = (cs: ReturnType<typeof plan>) => best(cs, (c) => c.strategy === 'chat_friend:group')
      const calm = group(plan(createMockCharacterState({ relationships: rels }), all, withCapacity(4)))
      const upset = group(plan(upsetAbout('cy', rels), all, withCapacity(4)))
      expect(calm.primaryStep.socialTargetId).toBe('bob')
      expect(upset.primaryStep.socialTargetId).toBe('bob')
      expect(upset.utility - calm.utility).toBeCloseTo(VENTING.chatBonus)
    })

    it('comfort eating becomes more attractive even when not hungry', () => {
      const full = createMockNeeds({ food: 1 })
      const calm = best(plan(createMockCharacterState({ needs: full }), {}), (c) => c.goal === 'eat')
      const upset = best(plan({ ...upsetAbout('cy'), needs: full } as CharacterState, {}), (c) => c.goal === 'eat')
      expect(upset.utility - calm.utility).toBeCloseTo(VENTING.comfortEatBonus)
    })
  })
})

describe('venting and comfort', () => {
  it('talking it over marks grievances as vented and shortens them', () => {
    const venter = { grievances: [grievance('cy', { ticksRemaining: 600 }), grievance('dee', { ticksRemaining: 300 })] }
    const vented = ventGrievances(venter, 'bob')
    expect(vented.map((g) => g.aboutCharacterId)).toEqual(['cy', 'dee'])
    expect(venter.grievances.map((g) => [g.vented, g.ticksRemaining])).toEqual([
      [true, Math.floor(600 * VENTING.ventedRemainingFraction)],
      [true, Math.floor(300 * VENTING.ventedRemainingFraction)]
    ])
  })

  it('does not complain about the listener to the listener', () => {
    const venter = { grievances: [grievance('cy'), grievance('dee')] }
    const vented = ventGrievances(venter, 'cy')
    expect(vented.map((g) => g.aboutCharacterId)).toEqual(['dee'])
    expect(venter.grievances.find((g) => g.aboutCharacterId === 'cy')?.vented).toBeUndefined()
  })

  it('does it once: talking it over again changes nothing', () => {
    const venter = { grievances: [grievance('cy', { ticksRemaining: 600 })] }
    ventGrievances(venter, 'bob')
    const after = venter.grievances[0].ticksRemaining
    expect(ventGrievances(venter, 'bob')).toEqual([])
    expect(venter.grievances[0].ticksRemaining).toBe(after)
  })

  it('never removes a grievance outright', () => {
    const venter = { grievances: [grievance('cy', { ticksRemaining: 1 })] }
    ventGrievances(venter, 'bob')
    expect(venter.grievances[0].ticksRemaining).toBeGreaterThanOrEqual(1)
  })

  it('doing it again reopens a grievance that had been talked over', () => {
    const witness: Pick<CharacterState, 'grievances'> = { grievances: [grievance('cy', { vented: true, ticksRemaining: 100 })] }
    addGrievance(witness, { id: 'cy', name: 'CY' }, getApprovalTopic('daytime-napping') as never)
    expect(witness.grievances![0].vented).toBe(false)
    expect(witness.grievances![0].times).toBe(2)
  })

  it('a comfort meal takes a little off every grievance', () => {
    const state = { grievances: [grievance('cy', { ticksRemaining: 600 }), grievance('dee', { ticksRemaining: 200, vented: true })] }
    comfortFromEating(state)
    expect(state.grievances.map((g) => g.ticksRemaining)).toEqual([
      Math.floor(600 * VENTING.comfortRemainingFraction),
      Math.floor(200 * VENTING.comfortRemainingFraction)
    ])
    expect(() => comfortFromEating({})).not.toThrow()
  })
})
