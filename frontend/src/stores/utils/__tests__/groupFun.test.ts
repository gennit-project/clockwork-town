import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  createMockCharacterState,
  createMockItemOccupancy,
  createMockNeeds,
  createMockWorldData,
  mockConsole
} from '../../__tests__/mockData'
import { GROUP_FUN } from '../../config/social'
import { buildGroupCandidate, buildPlanCandidates } from '../intentPlanner'
import { describeActionTarget, isGroupCapableAction, isGroupFunAction, requiresInvitation } from '../groupSocial'
import { executeTick, type ExecuteTickParams } from '../tickExecution'
import type { ActivityLogEntry, CharacterState, Intent, PlanCandidate, TaskStep } from '../../types'

mockConsole()

describe('which actions can be done together', () => {
  it('only chats and shared fun can be groups; a date never can', () => {
    expect(isGroupCapableAction('chat_friend')).toBe(true)
    expect(isGroupCapableAction('view_movie')).toBe(true)
    expect(isGroupCapableAction('view_art')).toBe(true)
    expect(isGroupCapableAction('date')).toBe(false)
    expect(isGroupCapableAction('read')).toBe(false)
    expect(isGroupFunAction('view_movie')).toBe(true)
    expect(isGroupFunAction('chat_friend')).toBe(false)
  })

  it('needs an invitation for chats and dates, and for fun only when it was planned with people', () => {
    expect(requiresInvitation({ action: 'chat_friend' })).toBe(true)
    expect(requiresInvitation({ action: 'date' })).toBe(true)
    expect(requiresInvitation({ action: 'view_movie', strategy: 'view_movie:group' })).toBe(true)
    expect(requiresInvitation({ action: 'view_movie', strategy: 'view_movie:with-participant' })).toBe(true)
    expect(requiresInvitation({ action: 'view_art', strategy: 'view_art:group' })).toBe(true)
    // Solo, and the follow-up to being invited over, involve no new invitation.
    expect(requiresInvitation({ action: 'view_movie', strategy: 'view_movie:direct' })).toBe(false)
    expect(requiresInvitation({ action: 'view_movie', strategy: 'invite_over:watch_movie' })).toBe(false)
    expect(requiresInvitation({ action: 'view_movie' })).toBe(false)
    expect(requiresInvitation({ action: 'read', strategy: 'read:group' })).toBe(false)
  })

  it('describes fun done together with the item and the people', () => {
    expect(describeActionTarget({ action: 'view_movie', itemName: 'the TV', socialTargetName: 'Bo', groupTargetNames: ['Cy'] })).toBe(
      'the TV with Bo and Cy'
    )
    expect(describeActionTarget({ action: 'view_art', itemName: 'Poster', socialTargetName: 'Bo' })).toBe('Poster with Bo')
    expect(describeActionTarget({ action: 'view_movie', socialTargetName: 'Bo' })).toBe('a movie with Bo')
    // Solo is unchanged.
    expect(describeActionTarget({ action: 'view_movie', itemName: 'the TV' })).toBe('the TV')
  })
})

const step = (id: string, name: string): TaskStep => ({
  action: 'view_movie',
  label: `view_movie:${name}`,
  totalTicks: 1,
  remainingTicks: 0,
  socialTargetId: id,
  socialTargetName: name
})
const funEntry = (id: string, utility: number) => ({
  id,
  name: id.toUpperCase(),
  isHousehold: false,
  candidate: { goal: 'view_movie', strategy: 'view_movie:with-participant', utility, travelCost: 0, primaryStep: step(id, id.toUpperCase()), steps: [step(id, id.toUpperCase())] } as PlanCandidate
})

describe('buildGroupCandidate for fun', () => {
  it('names its strategy after the action and adds the fun bonus per extra', () => {
    const group = buildGroupCandidate({ action: 'view_movie', pool: [funEntry('b', 1), funEntry('c', 1)], maxUsers: null })
    expect(group?.strategy).toBe('view_movie:group')
    expect(group?.primaryStep.groupTargetIds).toEqual(['c'])
    expect(group?.utility).toBeCloseTo(1 + GROUP_FUN.bonusPerOtherParticipant)
    expect(group?.primaryStep.label).toBe('view_movie:B+C')
  })
})

// ---------------------------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------------------------
describe('planner: group fun before solo', () => {
  const funWorld = (capacity: number | null = null) => {
    const world = createMockWorldData()
    const couch = world.items['item-1']
    couch.maxSimultaneousUsers = capacity
    for (const action of ['view_movie', 'view_art'] as const) {
      couch.affordances.push({ action, weight: 1 })
      couch.allowedActivities.push(action)
      world.itemsByAffordance[action] = ['item-1']
    }
    return world
  }

  const plan = (self: CharacterState, others: Record<string, CharacterState>, world = funWorld()) =>
    buildPlanCandidates({
      characterId: 'me',
      characterState: self,
      worldData: world,
      itemOccupancy: createMockItemOccupancy(),
      characterStates: { me: self, ...others }
    })

  const bored = () => createMockNeeds({ fulfillment: 0.2 })
  const content = () => createMockNeeds({ fulfillment: 0.9 })
  const people = (n: number) =>
    Object.fromEntries(Array.from({ length: n }, (_, i) => [`p${i + 1}`, createMockCharacterState({ name: `P${i + 1}` })]))

  const isFun = (c: PlanCandidate) => ['read', 'write', 'view_art', 'view_movie'].includes(c.goal)
  const best = (cs: PlanCandidate[], pred: (c: PlanCandidate) => boolean) =>
    cs.filter(pred).sort((a, b) => b.utility - a.utility)[0]
  const solo = (c: PlanCandidate) => isFun(c) && !c.primaryStep.socialTargetId
  const together = (c: PlanCandidate) => isFun(c) && !!c.primaryStep.socialTargetId

  it('offers movies and art together as well as alone', () => {
    const candidates = plan(createMockCharacterState({ needs: bored() }), people(3))
    const strategies = new Set(candidates.map((c) => c.strategy))
    for (const wanted of ['view_movie:with-participant', 'view_movie:group', 'view_art:with-participant', 'view_art:group']) {
      expect(strategies.has(wanted)).toBe(true)
    }
    expect(candidates.some((c) => c.goal === 'view_movie' && !c.primaryStep.socialTargetId)).toBe(true)
  })

  it('when bored with company available, the best fun is done with people', () => {
    const candidates = plan(createMockCharacterState({ needs: bored() }), people(3))
    expect(together(best(candidates, isFun))).toBe(true)
    expect(best(candidates, isFun).strategy).toMatch(/:group$/)
  })

  it('solo fun is held back only when bored and a group option exists (with controls)', () => {
    const baselineSolo = best(plan(createMockCharacterState({ needs: bored() }), {}), solo).utility

    // Bored but alone: nothing to hold back, solo is the fallback at full strength.
    expect(best(plan(createMockCharacterState({ needs: bored() }), {}), solo).utility).toBeCloseTo(baselineSolo)

    // Bored with company: solo is lowered by exactly the penalty.
    const withCompany = best(plan(createMockCharacterState({ needs: bored() }), people(2)), solo).utility
    expect(withCompany).toBeCloseTo(baselineSolo - GROUP_FUN.soloPenalty)

    // Not bored: company doesn't change solo fun, though together is still available.
    const contentSolo = best(plan(createMockCharacterState({ needs: content() }), {}), solo).utility
    const contentWithCompany = best(plan(createMockCharacterState({ needs: content() }), people(2)), solo).utility
    expect(contentWithCompany).toBeCloseTo(contentSolo)
  })

  it('falls back to a solo hobby when no one is available', () => {
    const candidates = plan(createMockCharacterState({ needs: bored() }), {})
    expect(candidates.some(together)).toBe(false)
    expect(isFun(best(candidates, isFun))).toBe(true)
  })

  it('does not penalize volunteering or pet care, only the solo hobbies', () => {
    const base = plan(createMockCharacterState({ needs: bored() }), {})
    const withCompany = plan(createMockCharacterState({ needs: bored() }), people(2))
    for (const goal of ['eat', 'sleep']) {
      const a = best(base, (c) => c.goal === goal)?.utility
      const b = best(withCompany, (c) => c.goal === goal)?.utility
      if (a !== undefined) expect(b).toBeCloseTo(a)
    }
  })

  it('respects the item capacity: room for two means a pair, not a group', () => {
    const candidates = plan(createMockCharacterState({ needs: bored() }), people(3), funWorld(2))
    expect(candidates.some((c) => c.strategy === 'view_movie:with-participant')).toBe(true)
    expect(candidates.some((c) => c.strategy === 'view_movie:group')).toBe(false)
  })

  it('does not let relationships inflate fun the way they inflate chats', () => {
    const close = (id: string) => ({
      id: `rel-${id}`, fromCharacterId: 'me', toCharacterId: id, shortTermScore: 0.9, longTermScore: 0.9, labels: ['family'], isDeceasedTarget: false
    })
    const strangers = best(plan(createMockCharacterState({ needs: bored() }), people(3)), (c) => c.strategy === 'view_movie:group')
    const family = best(
      plan(createMockCharacterState({ needs: bored(), relationships: [close('p1'), close('p2'), close('p3')] }), people(3)),
      (c) => c.strategy === 'view_movie:group'
    )
    expect(family.utility).toBeCloseTo(strangers.utility)
  })

  it('never makes a date part of a group, even now that fun can be', () => {
    const world = funWorld()
    world.items['item-1'].affordances.push({ action: 'date', weight: 1 })
    world.items['item-1'].allowedActivities.push('date')
    world.itemsByAffordance.date = ['item-1']
    const candidates = plan(createMockCharacterState({ needs: createMockNeeds({ romance: 0, fulfillment: 0.2 }) }), people(3), world)
    for (const date of candidates.filter((c) => c.goal === 'date')) {
      expect(date.strategy).not.toContain('group')
      expect(date.primaryStep.groupTargetIds).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------------------------
// Coordination
// ---------------------------------------------------------------------------------------------
describe('coordinating group fun', () => {
  const busyTask: NonNullable<CharacterState['currentTask']> = {
    planId: 'busy', goal: 'idle', action: 'idle', remainingTicks: 5, totalTicks: 5, currentStepIndex: 0,
    steps: [{ action: 'idle', totalTicks: 5, remainingTicks: 5 }]
  }

  const movieIntent = (over: Partial<Intent> = {}): Intent => ({
    goal: 'view_movie',
    strategy: 'view_movie:group',
    action: 'view_movie',
    itemId: 'item-1',
    itemName: 'Couch',
    targetSpaceId: 'space-1',
    targetSpaceName: 'Living Room',
    targetLotId: 'lot-1',
    targetLotName: 'Test House',
    travelCost: 0,
    utility: 5,
    source: 'manual',
    socialTargetId: 'b',
    socialTargetName: 'Bo',
    groupTargetIds: ['c'],
    groupTargetNames: ['Cy'],
    ...over
  })

  function run(intent: Intent) {
    const a = createMockCharacterState({ name: 'Al', needs: createMockNeeds({ fulfillment: 0.2 }) })
    a.queuedActions = [intent]
    // Fun carries little weight, so a guest only says yes if nothing else is pressing: everything
    // else is fully met, and they're bored.
    const bored = () =>
      createMockNeeds({ food: 1, sleep: 1, bladder: 1, hygiene: 1, health: 1, friends: 1, family: 1, romance: 1, fulfillment: 0.2 })
    const states: Record<string, CharacterState> = {
      a,
      b: createMockCharacterState({ name: 'Bo', needs: bored(), currentTask: busyTask }),
      c: createMockCharacterState({ name: 'Cy', needs: bored(), currentTask: busyTask })
    }
    const executeAction = vi.fn(async (_id: string, _intent: Intent) => {})
    const params: ExecuteTickParams = {
      currentTick: ref(0),
      characterStates: ref(states),
      worldData: ref(createMockWorldData()),
      itemOccupancy: ref(createMockItemOccupancy()),
      activityLog: ref<ActivityLogEntry[]>([]),
      executeAction,
      progressTask: vi.fn(async (id: string) => id !== 'a')
    }
    const intentFor = (id: string) => executeAction.mock.calls.find(([who]) => who === id)?.[1] as Intent | undefined
    const log = () => params.activityLog.value.map((e) => `${e.characterId}:${e.action}`)
    return { params, intentFor, log }
  }

  it('invites the whole group to a movie and tells each person who else is there', async () => {
    const { params, intentFor, log } = run(movieIntent())
    await executeTick(params)
    expect(log().filter((l) => l === 'a:invite')).toHaveLength(2)
    expect(log().filter((l) => l.endsWith(':accept_invite'))).toHaveLength(2)
    expect(intentFor('a')?.groupTargetIds).toEqual(['c'])
    expect(intentFor('b')).toMatchObject({ action: 'view_movie', isSocialParticipant: true, groupTargetIds: ['c'] })
    expect(intentFor('c')).toMatchObject({ action: 'view_movie', isSocialParticipant: true, groupTargetIds: ['b'] })
  })

  it('does not treat the follow-up to being invited over as a fresh invitation (control)', async () => {
    const { params, intentFor, log } = run(
      movieIntent({ strategy: 'invite_over:watch_movie', groupTargetIds: undefined, groupTargetNames: undefined })
    )
    await executeTick(params)
    expect(log().filter((l) => l.endsWith(':invite'))).toHaveLength(0)
    expect(intentFor('a')?.action).toBe('view_movie')
  })

  it('a solo movie involves no invitations either', async () => {
    const { params, intentFor, log } = run(
      movieIntent({ strategy: 'view_movie:direct', socialTargetId: undefined, socialTargetName: undefined, groupTargetIds: undefined, groupTargetNames: undefined })
    )
    await executeTick(params)
    expect(log().filter((l) => l.endsWith(':invite'))).toHaveLength(0)
    expect(intentFor('a')?.action).toBe('view_movie')
  })
})
