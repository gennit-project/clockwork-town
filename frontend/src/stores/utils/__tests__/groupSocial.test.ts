import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  createMockCharacterState,
  createMockItemOccupancy,
  createMockNeeds,
  createMockWorldData,
  mockConsole
} from '../../__tests__/mockData'
import { GROUP_SOCIAL } from '../../config/social'
import { backOffInvitation } from '../inviteBackoff'
import { buildGroupChatCandidate, buildPlanCandidates, planCandidateToIntent } from '../intentPlanner'
import {
  describeActionTarget,
  isSocialAction,
  joinNames,
  socialParticipantIds,
  socialParticipantNames
} from '../groupSocial'
import { executeTick, type ExecuteTickParams } from '../tickExecution'
import type { ActivityLogEntry, CharacterState, Intent, PlanCandidate, TaskStep } from '../../types'

mockConsole()

describe('group helpers', () => {
  it('lists everyone in a social intent, primary partner first', () => {
    const intent = { socialTargetId: 'b', socialTargetName: 'Bo', groupTargetIds: ['c', 'd'], groupTargetNames: ['Cy', 'Di'] }
    expect(socialParticipantIds(intent)).toEqual(['b', 'c', 'd'])
    expect(socialParticipantNames(intent)).toEqual(['Bo', 'Cy', 'Di'])
    expect(socialParticipantIds({})).toEqual([])
  })

  it('joins names the way people say them', () => {
    expect(joinNames([])).toBe('')
    expect(joinNames(['A'])).toBe('A')
    expect(joinNames(['A', 'B'])).toBe('A and B')
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C')
  })

  it('classifies social actions', () => {
    expect(isSocialAction('chat_friend')).toBe(true)
    expect(isSocialAction('date')).toBe(true)
    expect(isSocialAction('read')).toBe(false)
  })

  it('names the whole group for social actions, and the item or pet otherwise', () => {
    expect(describeActionTarget({ action: 'chat_friend', itemName: 'Couch', socialTargetName: 'Bo' })).toBe('Bo')
    expect(
      describeActionTarget({ action: 'chat_friend', itemName: 'Couch', socialTargetName: 'Bo', groupTargetNames: ['Cy', 'Di'] })
    ).toBe('Bo, Cy and Di')
    expect(describeActionTarget({ action: 'read', itemName: 'Bookshelf' })).toBe('Bookshelf')
    expect(describeActionTarget({ action: 'pet_animal', animalTargetName: 'Diego' })).toBe('Diego')
    expect(describeActionTarget({ action: 'eat' })).toBeNull()
  })

  it('falls back to the item when a social intent has no names', () => {
    expect(describeActionTarget({ action: 'chat_friend', itemName: 'Couch' })).toBe('Couch')
  })
})

// ---------------------------------------------------------------------------------------------
// The group candidate builder (pure)
// ---------------------------------------------------------------------------------------------
const pairCandidate = (id: string, name: string, utility: number): PlanCandidate => {
  const step: TaskStep = {
    action: 'chat_friend',
    label: `chat_friend:${name}`,
    totalTicks: 1,
    remainingTicks: 0,
    socialTargetId: id,
    socialTargetName: name
  }
  return { goal: 'chat_friend', strategy: 'chat_friend:with-participant', utility, travelCost: 0, primaryStep: step, steps: [step] }
}
const entry = (id: string, utility: number, isHousehold = false) => ({
  id,
  name: id.toUpperCase(),
  isHousehold,
  candidate: pairCandidate(id, id.toUpperCase(), utility)
})

describe('buildGroupChatCandidate', () => {
  it('forms a group from the best pair plus up to two more people', () => {
    const group = buildGroupChatCandidate({
      pool: [entry('b', 2), entry('c', 1.5), entry('d', 1), entry('e', 0.5)],
      maxUsers: null
    })
    expect(group?.strategy).toBe('chat_friend:group')
    expect(group?.primaryStep.socialTargetId).toBe('b')
    expect(group?.primaryStep.groupTargetIds).toEqual(['c', 'd'])
    expect(group?.primaryStep.groupTargetNames).toEqual(['C', 'D'])
    expect(group?.utility).toBeCloseTo(2 + 2 * GROUP_SOCIAL.groupChatBonusPerExtra)
  })

  it('never exceeds the item\'s capacity (initiator + primary + extras)', () => {
    const pool = [entry('b', 2), entry('c', 1.5), entry('d', 1)]
    expect(buildGroupChatCandidate({ pool, maxUsers: 4 })?.primaryStep.groupTargetIds).toEqual(['c', 'd'])
    expect(buildGroupChatCandidate({ pool, maxUsers: 3 })?.primaryStep.groupTargetIds).toEqual(['c'])
    expect(buildGroupChatCandidate({ pool, maxUsers: 2 })).toBeNull()
  })

  it('needs at least two people to be a group', () => {
    expect(buildGroupChatCandidate({ pool: [entry('b', 2)], maxUsers: null })).toBeNull()
    expect(buildGroupChatCandidate({ pool: [], maxUsers: null })).toBeNull()
  })

  it('invites housemates before better-scoring strangers as extras', () => {
    const group = buildGroupChatCandidate({
      pool: [entry('b', 3), entry('stranger', 2), entry('housemate', 1, true)],
      maxUsers: 3
    })
    expect(group?.primaryStep.groupTargetIds).toEqual(['housemate'])
  })

  it('counts the relationship bonus in full for the primary and at half weight for extras', () => {
    const withBonus = (id: string, utility: number, relationshipBonus: number) => ({ ...entry(id, utility), relationshipBonus })
    const group = buildGroupChatCandidate({
      pool: [withBonus('b', 2, 1), withBonus('c', 1, 0.8)],
      maxUsers: null
    })
    // primary 2 + 1, plus one extra: the per-extra bonus and half of its 0.8 relationship bonus
    expect(group?.utility).toBeCloseTo(
      2 + 1 + GROUP_SOCIAL.groupChatBonusPerExtra + 0.8 * GROUP_SOCIAL.extraRelationshipWeight
    )
  })

  it('picks the primary partner by score including the relationship bonus', () => {
    const group = buildGroupChatCandidate({
      pool: [
        { ...entry('stranger', 2.2), relationshipBonus: 0 },
        { ...entry('family', 2), relationshipBonus: 1 },
        entry('third', 1)
      ],
      maxUsers: null
    })
    expect(group?.primaryStep.socialTargetId).toBe('family')
  })

  it('does not mutate the pair candidate it is built from', () => {
    const pool = [entry('b', 2), entry('c', 1)]
    buildGroupChatCandidate({ pool, maxUsers: null })
    expect(pool[0].candidate.primaryStep.groupTargetIds).toBeUndefined()
    expect(pool[0].candidate.strategy).toBe('chat_friend:with-participant')
  })
})

// ---------------------------------------------------------------------------------------------
// The planner with real characters
// ---------------------------------------------------------------------------------------------
describe('planner: group chats and household preference', () => {
  const worldWithCapacity = (capacity: number | null) => {
    const world = createMockWorldData()
    world.items['item-1'].maxSimultaneousUsers = capacity
    return world
  }

  const plan = (self: CharacterState, others: Record<string, CharacterState>, world = worldWithCapacity(4)) =>
    buildPlanCandidates({
      characterId: 'me',
      characterState: self,
      worldData: world,
      itemOccupancy: createMockItemOccupancy(),
      characterStates: { me: self, ...others }
    })

  const lonely = () => createMockNeeds({ friends: 0 })
  const people = (n: number, over: Partial<CharacterState> = {}) =>
    Object.fromEntries(
      Array.from({ length: n }, (_, i) => [`p${i + 1}`, createMockCharacterState({ name: `P${i + 1}`, ...over })])
    )

  it('offers a group chat of up to three others when there is room', () => {
    const candidates = plan(createMockCharacterState({ needs: lonely() }), people(4))
    const group = candidates.find((c) => c.strategy === 'chat_friend:group')
    expect(group).toBeDefined()
    expect(group?.primaryStep.groupTargetIds).toHaveLength(GROUP_SOCIAL.maxGroupExtras)
  })

  it('prefers the group over the same pair', () => {
    const candidates = plan(createMockCharacterState({ needs: lonely() }), people(3))
    const group = candidates.find((c) => c.strategy === 'chat_friend:group') as PlanCandidate
    const pair = candidates.find(
      (c) => c.strategy === 'chat_friend:with-participant' && c.primaryStep.socialTargetId === group.primaryStep.socialTargetId
    ) as PlanCandidate
    expect(group.utility).toBeGreaterThan(pair.utility)
  })

  it('control: with only one other person there is a pair but no group', () => {
    const candidates = plan(createMockCharacterState({ needs: lonely() }), people(1))
    expect(candidates.some((c) => c.strategy === 'chat_friend:with-participant')).toBe(true)
    expect(candidates.some((c) => c.strategy === 'chat_friend:group')).toBe(false)
  })

  it('control: an item with room for only two people never hosts a group', () => {
    const candidates = plan(createMockCharacterState({ needs: lonely() }), people(3), worldWithCapacity(2))
    expect(candidates.some((c) => c.strategy === 'chat_friend:group')).toBe(false)
  })

  it('respects the item capacity when sizing the group', () => {
    const candidates = plan(createMockCharacterState({ needs: lonely() }), people(3), worldWithCapacity(3))
    const group = candidates.find((c) => c.strategy === 'chat_friend:group')
    expect(group?.primaryStep.groupTargetIds).toHaveLength(1)
  })

  it('never makes a date a group', () => {
    const world = worldWithCapacity(4)
    world.items['item-1'].affordances.push({ action: 'date', weight: 1 })
    world.items['item-1'].allowedActivities.push('date')
    world.itemsByAffordance.date = ['item-1']
    const candidates = plan(createMockCharacterState({ needs: createMockNeeds({ romance: 0 }) }), people(3), world)
    const dates = candidates.filter((c) => c.goal === 'date')
    expect(dates.length).toBeGreaterThan(0)
    for (const date of dates) {
      expect(date.primaryStep.groupTargetIds).toBeUndefined()
      expect(date.strategy).not.toContain('group')
    }
  })

  it('leaves out someone the initiator is backing off from', () => {
    const self = createMockCharacterState({ needs: lonely() })
    backOffInvitation(self, 'chat_friend', 'p1')
    const group = plan(self, people(3)).find((c) => c.strategy === 'chat_friend:group') as PlanCandidate
    expect([group.primaryStep.socialTargetId, ...(group.primaryStep.groupTargetIds ?? [])]).not.toContain('p1')
  })

  it('prefers a housemate as chat partner (with a control)', () => {
    const mates = {
      stranger: createMockCharacterState({ name: 'Stranger', householdId: 'other' }),
      housemate: createMockCharacterState({ name: 'Housemate', householdId: 'home' })
    }
    const best = (self: CharacterState) =>
      plan(self, mates, worldWithCapacity(2))
        .filter((c) => c.strategy === 'chat_friend:with-participant')
        .sort((a, b) => b.utility - a.utility)[0]

    // Control: with no household on record there is no preference (tie, so no household bump).
    const noHome = createMockCharacterState({ needs: lonely() })
    const stranger = plan(noHome, mates, worldWithCapacity(2)).find((c) => c.primaryStep.socialTargetId === 'stranger') as PlanCandidate
    const housemate = plan(noHome, mates, worldWithCapacity(2)).find((c) => c.primaryStep.socialTargetId === 'housemate') as PlanCandidate
    expect(housemate.utility).toBeCloseTo(stranger.utility)

    const inHome = createMockCharacterState({ needs: lonely(), householdId: 'home' })
    expect(best(inHome).primaryStep.socialTargetId).toBe('housemate')
    const boosted = plan(inHome, mates, worldWithCapacity(2)).find((c) => c.primaryStep.socialTargetId === 'housemate') as PlanCandidate
    const plain = plan(inHome, mates, worldWithCapacity(2)).find((c) => c.primaryStep.socialTargetId === 'stranger') as PlanCandidate
    expect(boosted.utility - plain.utility).toBeCloseTo(GROUP_SOCIAL.householdChatBonus)
  })

  it('a group beats the relationship-ranked pair chat for people who love each other', () => {
    const closeTo = (id: string) => ({
      id: `rel-${id}`,
      fromCharacterId: 'me',
      toCharacterId: id,
      shortTermScore: 0.8,
      longTermScore: 0.9,
      labels: ['family'],
      isDeceasedTarget: false
    })
    const self = createMockCharacterState({ needs: lonely(), relationships: [closeTo('p1'), closeTo('p2'), closeTo('p3')] })
    const candidates = plan(self, people(3))
    const group = candidates.find((c) => c.strategy === 'chat_friend:group') as PlanCandidate
    const ranked = candidates.filter((c) => c.strategy === 'chat_friend:relationship-ranked')
    expect(ranked.length).toBeGreaterThan(0)
    for (const pair of ranked) expect(group.utility).toBeGreaterThan(pair.utility)
    // ...so a group is the resident's best social option when it is possible.
    const bestChat = candidates.filter((c) => c.goal === 'chat_friend').sort((a, b) => b.utility - a.utility)[0]
    expect(bestChat.strategy).toBe('chat_friend:group')
  })

  it('carries the group onto the intent the character will act on', () => {
    const group = plan(createMockCharacterState({ needs: lonely() }), people(3)).find(
      (c) => c.strategy === 'chat_friend:group'
    ) as PlanCandidate
    const intent = planCandidateToIntent(group)
    expect(intent.groupTargetIds).toEqual(group.primaryStep.groupTargetIds)
    expect(intent.groupTargetNames).toEqual(group.primaryStep.groupTargetNames)
  })
})

// ---------------------------------------------------------------------------------------------
// Coordination
// ---------------------------------------------------------------------------------------------
describe('coordinating a group chat in executeTick', () => {
  const content = () => createMockNeeds({ friends: 0.1 }) // happy to be asked to chat
  const asleep = () => createMockNeeds({ sleep: 0, friends: 0.9 }) // would rather sleep

  const chatIntent = (over: Partial<Intent> = {}): Intent => ({
    goal: 'chat_friend',
    strategy: 'chat_friend:group',
    action: 'chat_friend',
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

  // Having a task means their own turn is handed to progressTask (which consumes it below).
  const busyTask: NonNullable<CharacterState['currentTask']> = {
    planId: 'busy',
    goal: 'idle',
    action: 'idle',
    remainingTicks: 5,
    totalTicks: 5,
    currentStepIndex: 0,
    steps: [{ action: 'idle', totalTicks: 5, remainingTicks: 5 }]
  }

  function setup(needs: { b?: ReturnType<typeof createMockNeeds>; c?: ReturnType<typeof createMockNeeds> }, intent: Intent) {
    const a = createMockCharacterState({ name: 'Al', needs: createMockNeeds({ friends: 0 }) })
    a.queuedActions = [intent]
    const states: Record<string, CharacterState> = {
      a,
      b: createMockCharacterState({ name: 'Bo', needs: needs.b ?? content(), currentTask: busyTask }),
      c: createMockCharacterState({ name: 'Cy', needs: needs.c ?? content(), currentTask: busyTask })
    }
    const executeAction = vi.fn(async (_id: string, _intent: Intent) => {})
    const params: ExecuteTickParams = {
      currentTick: ref(0),
      characterStates: ref(states),
      worldData: ref(createMockWorldData()),
      itemOccupancy: ref(createMockItemOccupancy()),
      activityLog: ref<ActivityLogEntry[]>([]),
      executeAction,
      // Only the initiator decides; the others just respond to invitations (their own turns are
      // consumed), so they can't start chats of their own and muddy what is being tested.
      progressTask: vi.fn(async (id: string) => id !== 'a')
    }
    const intentFor = (id: string) => executeAction.mock.calls.find(([who]) => who === id)?.[1] as Intent
    const log = () => params.activityLog.value.map((e) => `${e.characterId}:${e.action}`)
    return { params, intentFor, log, states }
  }

  it('forms a group when everyone accepts, and tells each person who else is there', async () => {
    const { params, intentFor, log } = setup({}, chatIntent())
    await executeTick(params)

    const initiator = intentFor('a')
    expect(initiator.groupTargetIds).toEqual(['c'])
    expect(initiator.isSocialParticipant).toBeUndefined()

    expect(intentFor('b')).toMatchObject({ socialTargetId: 'a', isSocialParticipant: true, groupTargetIds: ['c'], groupTargetNames: ['Cy'] })
    expect(intentFor('c')).toMatchObject({ socialTargetId: 'a', isSocialParticipant: true, groupTargetIds: ['b'], groupTargetNames: ['Bo'] })
    expect(log().filter((l) => l.endsWith(':accept_invite'))).toHaveLength(2)
    expect(log().filter((l) => l === 'a:invite')).toHaveLength(2)
  })

  it('still forms a smaller group when an extra declines, without backing off the others', async () => {
    const { params, intentFor, states } = setup({ c: asleep() }, chatIntent())
    await executeTick(params)

    expect(intentFor('a').groupTargetIds).toBeUndefined()
    expect(intentFor('b')).toMatchObject({ isSocialParticipant: true, groupTargetIds: undefined })
    // The decliner is not in the group: they were given no chat to take part in.
    expect(intentFor('c')).toBeUndefined()
    expect(states.a.inviteBackoff).toHaveProperty('chat_friend:c')
    expect(states.a.inviteBackoff).not.toHaveProperty('chat_friend:b')
  })

  it('falls back as it does for a pair when the primary partner declines', async () => {
    const { params, intentFor, log } = setup({ b: asleep() }, chatIntent())
    await executeTick(params)
    expect(intentFor('a').groupTargetIds).toBeUndefined()
    expect(intentFor('a').action).toBe('idle')
    // The extra was never invited, so they have no part in it (and are not backed off).
    expect(intentFor('c')).toBeUndefined()
    expect(log().filter((l) => l === 'a:invite')).toHaveLength(1)
  })

  it('a date is always exactly one other person, even if extras are attached', async () => {
    const date = chatIntent({ action: 'date', goal: 'date', strategy: 'date:with-participant' })
    const { params, intentFor, log } = setup({}, date)
    await executeTick(params)
    expect(intentFor('a').groupTargetIds).toBeUndefined()
    expect(log().filter((l) => l === 'a:invite')).toHaveLength(1)
    expect(intentFor('c')?.isSocialParticipant).toBeUndefined()
  })
})
