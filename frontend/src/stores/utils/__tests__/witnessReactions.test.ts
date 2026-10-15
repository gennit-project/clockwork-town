import { describe, expect, it } from 'vitest'
import { APPROVAL_TOPICS, WITNESS_TUNING, getApprovalTopic } from '../../config/approvalTopics'
import { createMockCharacterState } from '../../__tests__/mockData'
import { reconcileTickets } from '../ticketLifecycle'
import { evaluateGrievanceTickets } from '../ticketEvaluators'
import { createTrackers } from '../serviceDeskTrackers'
import { fromStanceRecord, toStanceSeed } from '../stanceSeed'
import { describeTicksRemaining } from '../valueEffects'
import {
  addGrievance,
  cooldownKey,
  detectWitnessReactions,
  startReactionCooldown,
  tickWitnessState
} from '../witnessReactions'
import type { ActionName, CharacterState, SimulationDateTime, WorkShift } from '../../types'

const at = (weekday: string, hour: number, minute = 0): SimulationDateTime => ({
  iso: '2026-04-06T00:00:00.000Z',
  year: 2026,
  month: 4,
  day: 6,
  weekday,
  hour,
  minute
})

const sleepBlock = (day: string): WorkShift => ({ day, start: '22:00', end: '06:00', activity: 'sleep', locationLotId: 'lot-1' })
const workShift = (day: string): WorkShift => ({ day, start: '09:00', end: '17:00', activity: 'work', locationLotId: 'lot-2' })

const topic = (id: string) => getApprovalTopic(id) as NonNullable<ReturnType<typeof getApprovalTopic>>

describe('approval topics', () => {
  it('has unique ids and a phrase and label for each', () => {
    const ids = APPROVAL_TOPICS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of APPROVAL_TOPICS) {
      expect(t.label.length).toBeGreaterThan(0)
      expect(t.phrase.length).toBeGreaterThan(0)
    }
  })

  const matches = (id: string, action: ActionName, actor: CharacterState, when: SimulationDateTime) =>
    topic(id).matches({ action, actor, simulationDateTime: when })

  it('simple topics match their action and nothing else', () => {
    const actor = createMockCharacterState()
    const when = at('Monday', 12)
    expect(matches('public-romance', 'date', actor, when)).toBe(true)
    expect(matches('public-romance', 'chat_friend', actor, when)).toBe(false)
    expect(matches('screen-time', 'view_movie', actor, when)).toBe(true)
    expect(matches('reading', 'read', actor, when)).toBe(true)
    expect(matches('volunteering', 'volunteer', actor, when)).toBe(true)
    expect(matches('animal-care', 'pet_animal', actor, when)).toBe(true)
    expect(matches('reading', 'write', actor, when)).toBe(false)
  })

  describe('daytime napping', () => {
    it('is sleeping in the daytime with no sleep scheduled', () => {
      expect(matches('daytime-napping', 'sleep', createMockCharacterState(), at('Monday', 14))).toBe(true)
    })

    it('is not sleeping through the scheduled sleep block, even if it runs into the morning', () => {
      const sleeper = createMockCharacterState({ workSchedule: [sleepBlock('Monday')] })
      expect(matches('daytime-napping', 'sleep', sleeper, at('Monday', 23))).toBe(false)
      // Early morning is before daytime in any case
      expect(matches('daytime-napping', 'sleep', sleeper, at('Monday', 3))).toBe(false)
    })

    it('still counts as a nap if their schedule at that hour is work, not sleep', () => {
      const worker = createMockCharacterState({ workSchedule: [workShift('Monday'), sleepBlock('Monday')] })
      expect(matches('daytime-napping', 'sleep', worker, at('Monday', 14))).toBe(true)
    })

    it('only applies in waking hours', () => {
      const actor = createMockCharacterState()
      expect(matches('daytime-napping', 'sleep', actor, at('Monday', 7, 59))).toBe(false)
      expect(matches('daytime-napping', 'sleep', actor, at('Monday', 8))).toBe(true)
      expect(matches('daytime-napping', 'sleep', actor, at('Monday', 19, 59))).toBe(true)
      expect(matches('daytime-napping', 'sleep', actor, at('Monday', 20))).toBe(false)
    })

    it('is only about sleeping', () => {
      expect(matches('daytime-napping', 'eat', createMockCharacterState(), at('Monday', 14))).toBe(false)
    })
  })
})

describe('detectWitnessReactions', () => {
  const lot = (id: string | null) => ({ regionId: 'r', lotId: id, lotName: id, spaceId: 's', spaceName: 's' })
  const person = (over: Partial<CharacterState>) => createMockCharacterState({ location: lot('lot-1'), ...over })

  const run = (states: Record<string, CharacterState>, when = at('Monday', 14)) =>
    detectWitnessReactions({ states, simulationDateTime: when })

  it('a disapproving housemate reacts to someone napping in the daytime', () => {
    const reactions = run({
      napper: person({ name: 'Napper', currentAction: 'sleep' }),
      critic: person({ name: 'Critic', stances: { 'daytime-napping': 'disapproves' } })
    })
    expect(reactions).toHaveLength(1)
    expect(reactions[0]).toMatchObject({ witnessId: 'critic', actorId: 'napper', stance: 'disapproves' })
    expect(reactions[0].topic.id).toBe('daytime-napping')
  })

  it('an approving witness reacts too', () => {
    const [reaction] = run({
      reader: person({ currentAction: 'read' }),
      fan: person({ stances: { reading: 'approves' } })
    })
    expect(reaction).toMatchObject({ witnessId: 'fan', actorId: 'reader', stance: 'approves' })
  })

  it('does nothing without an opinion, with a different lot, for an asleep witness, or for idle', () => {
    const napper = person({ currentAction: 'sleep' })
    const base = { stances: { 'daytime-napping': 'disapproves' as const } }
    expect(run({ napper, neutral: person({}) })).toHaveLength(0)
    expect(run({ napper, elsewhere: person({ ...base, location: lot('lot-2') }) })).toHaveLength(0)
    expect(run({ napper, asleep: person({ ...base, currentAction: 'sleep' }) })).toHaveLength(0)
    expect(run({ idler: person({ currentAction: 'idle' }), critic: person(base) })).toHaveLength(0)
    expect(run({ napper: person({ currentAction: 'sleep', location: lot(null) }), critic: person(base) })).toHaveLength(0)
  })

  it('never reacts to themselves', () => {
    expect(run({ me: person({ currentAction: 'read', stances: { reading: 'approves' } }) })).toHaveLength(0)
  })

  it('stays quiet during the cooldown for that person and topic only', () => {
    const critic = person({ stances: { 'daytime-napping': 'disapproves', 'screen-time': 'disapproves' } })
    startReactionCooldown(critic, 'napper', 'daytime-napping')
    const napper = person({ currentAction: 'sleep' })
    expect(run({ napper, critic })).toHaveLength(0)

    // A different person napping is a fresh reaction.
    const other = person({ currentAction: 'sleep' })
    expect(run({ napper, other, critic }).map((r) => r.actorId)).toEqual(['other'])
    // And so is the same person doing something else the critic dislikes.
    const watcher = person({ currentAction: 'view_movie' })
    expect(run({ napper, watcher, critic }).map((r) => r.topic.id)).toEqual(['screen-time'])
  })

  it('reacts once per topic, with several witnesses each reacting', () => {
    const reactions = run({
      a: person({ currentAction: 'date' }),
      w1: person({ stances: { 'public-romance': 'disapproves' } }),
      w2: person({ stances: { 'public-romance': 'approves' } })
    })
    expect(reactions.map((r) => [r.witnessId, r.stance]).sort()).toEqual([['w1', 'disapproves'], ['w2', 'approves']])
  })
})

describe('grievances and cooldowns', () => {
  const about = { id: 'napper', name: 'Napper' }

  it('adds a grievance that lasts the configured time', () => {
    const witness: Pick<CharacterState, 'grievances'> = {}
    const g = addGrievance(witness, about, topic('daytime-napping'))
    expect(g).toMatchObject({
      aboutCharacterId: 'napper',
      aboutName: 'Napper',
      topicId: 'daytime-napping',
      summary: 'napping in the daytime',
      ticksRemaining: WITNESS_TUNING.grievanceDurationTicks,
      times: 1
    })
    expect(witness.grievances).toHaveLength(1)
  })

  it('refreshes and counts a repeat offense instead of adding another', () => {
    const witness: Pick<CharacterState, 'grievances'> = {}
    addGrievance(witness, about, topic('daytime-napping'))
    witness.grievances![0].ticksRemaining = 10
    addGrievance(witness, about, topic('daytime-napping'))
    expect(witness.grievances).toHaveLength(1)
    expect(witness.grievances![0]).toMatchObject({ ticksRemaining: WITNESS_TUNING.grievanceDurationTicks, times: 2 })
  })

  it('keeps a different topic or person as a separate grievance, and caps how many it holds', () => {
    const witness: Pick<CharacterState, 'grievances'> = {}
    addGrievance(witness, about, topic('daytime-napping'))
    addGrievance(witness, about, topic('screen-time'))
    expect(witness.grievances).toHaveLength(2)

    for (let i = 0; i < 10; i++) addGrievance(witness, { id: `p${i}`, name: `P${i}` }, topic('reading'))
    expect(witness.grievances).toHaveLength(WITNESS_TUNING.maxGrievances)
  })

  it('the oldest grievance is the one that is dropped when there are too many', () => {
    const witness: Pick<CharacterState, 'grievances'> = {}
    addGrievance(witness, { id: 'first', name: 'First' }, topic('reading'))
    witness.grievances![0].ticksRemaining = 5 // oldest, nearly faded
    for (let i = 0; i < WITNESS_TUNING.maxGrievances; i++) addGrievance(witness, { id: `p${i}`, name: `P${i}` }, topic('reading'))
    expect(witness.grievances!.some((g) => g.aboutCharacterId === 'first')).toBe(false)
  })

  it('counts down and expires cooldowns and grievances', () => {
    const state: Pick<CharacterState, 'grievances' | 'witnessCooldowns'> = {}
    startReactionCooldown(state, 'napper', 'daytime-napping')
    addGrievance(state, about, topic('daytime-napping'))
    expect(state.witnessCooldowns?.[cooldownKey('napper', 'daytime-napping')]).toBe(WITNESS_TUNING.reactionCooldownTicks)

    for (let i = 0; i < WITNESS_TUNING.reactionCooldownTicks; i++) tickWitnessState(state)
    expect(state.witnessCooldowns).toEqual({})
    expect(state.grievances).toHaveLength(1)

    for (let i = 0; i < WITNESS_TUNING.grievanceDurationTicks - WITNESS_TUNING.reactionCooldownTicks; i++) tickWitnessState(state)
    expect(state.grievances).toEqual([])
  })

  it('tolerates a state with nothing to age', () => {
    const state: Pick<CharacterState, 'grievances' | 'witnessCooldowns'> = {}
    expect(() => tickWitnessState(state)).not.toThrow()
  })
})

describe('grievance tickets', () => {
  const holder = () => {
    const critic = createMockCharacterState({ name: 'Critic' })
    addGrievance(critic, { id: 'napper', name: 'Napper' }, topic('daytime-napping'))
    return critic
  }
  const ctx = (states: Record<string, CharacterState>) => ({ tick: 0, states, trackers: createTrackers() })

  it('files a ticket per grievance, naming who disapproves of what', () => {
    const [candidate] = evaluateGrievanceTickets(ctx({ critic: holder() }))
    expect(candidate).toMatchObject({
      key: 'grievance:critic:napper:daytime-napping',
      rule: 'grievance',
      severity: 'warning',
      characterId: 'critic',
      title: 'Critic disapproves of Napper napping in the daytime'
    })
  })

  it('files nothing for someone with no grievances', () => {
    expect(evaluateGrievanceTickets(ctx({ calm: createMockCharacterState() }))).toEqual([])
  })

  it('the ticket opens with the grievance and resolves itself when it fades', () => {
    const critic = holder()
    let n = 0
    const nextId = () => `t${++n}`
    let tickets = reconcileTickets([], evaluateGrievanceTickets(ctx({ critic })), 1, nextId)
    expect(tickets.map((t) => t.status)).toEqual(['open'])

    critic.grievances = []
    tickets = reconcileTickets(tickets, evaluateGrievanceTickets(ctx({ critic })), 2, nextId)
    expect(tickets[0]).toMatchObject({ status: 'resolved', autoResolved: true })
  })
})

describe('stance seed helpers', () => {
  it('turns API stances into a record and ignores bad values', () => {
    expect(
      toStanceSeed([
        { topicId: 'reading', stance: 'approves' },
        { topicId: 'screen-time', stance: 'disapproves' },
        { topicId: 'junk', stance: 'loves' }
      ])
    ).toEqual({ stances: { reading: 'approves', 'screen-time': 'disapproves' } })
    expect(toStanceSeed(undefined)).toEqual({ stances: {} })
  })

  it('round trips through the list form', () => {
    const record = { reading: 'approves', 'screen-time': 'disapproves' } as const
    expect(toStanceSeed(fromStanceRecord({ ...record })).stances).toEqual(record)
  })
})

describe('describeTicksRemaining', () => {
  it('says how long is left in hours and days (12 ticks = 1 hour)', () => {
    expect(describeTicksRemaining(5)).toBe('under an hour')
    expect(describeTicksRemaining(12 * 5)).toBe('5h')
    expect(describeTicksRemaining(288)).toBe('1d')
    expect(describeTicksRemaining(288 + 12 * 4)).toBe('1d 4h')
    expect(describeTicksRemaining(864)).toBe('3d')
  })
})
