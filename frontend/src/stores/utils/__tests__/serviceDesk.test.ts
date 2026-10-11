import { describe, expect, it } from 'vitest'
import { SERVICE_DESK_THRESHOLDS, TICKS_PER_DAY } from '../../../config/serviceDesk'
import { INITIAL_NEEDS } from '../../config/needs'
import type { CharacterState, HappinessSample, Needs } from '../../types'
import {
  evaluateAlerts,
  evaluateCriticalNeeds,
  evaluateFriendCount,
  evaluateHappinessTrend,
  evaluateHomeStay,
  linearSlope
} from '../alertEvaluators'
import { createCharacterState } from '../characterState'
import { createTrackers, updateTrackers } from '../serviceDeskTrackers'
import { evaluateUnmetNeeds } from '../ticketEvaluators'
import { reconcileTickets, transitionTicket } from '../ticketLifecycle'

function makeState(id: string, over: Partial<CharacterState> = {}, needs: Partial<Needs> = {}): CharacterState {
  const s = createCharacterState({ id, name: id, traits: [] })
  return { ...s, ...over, needs: { ...INITIAL_NEEDS, ...needs } }
}

const ctx = (states: Record<string, CharacterState>, extra: Partial<Parameters<typeof evaluateAlerts>[0]> = {}) => ({
  tick: 0,
  states,
  history: [],
  trackers: createTrackers(),
  ...extra
})

describe('evaluateCriticalNeeds', () => {
  it('fires warning and critical, not at the boundary', () => {
    const states = {
      a: makeState('a', {}, { food: 0.1, sleep: 0.25, hygiene: SERVICE_DESK_THRESHOLDS.needWarning })
    }
    const alerts = evaluateCriticalNeeds(ctx(states))
    expect(alerts.map((x) => [x.id, x.severity])).toEqual([
      ['low-need:a:food', 'critical'],
      ['low-need:a:sleep', 'warning']
    ])
  })
})

describe('evaluateHomeStay', () => {
  const home = { homeLotId: 'h' }
  const at = (lotId: string) => ({ ...home, location: { regionId: 'r', lotId, lotName: null, spaceId: null, spaceName: null } })

  it('fires once the stay exceeds the limit at the home lot', () => {
    const states = { a: makeState('a', at('h')) }
    const trackers = updateTrackers(createTrackers(), states, 0)
    const limit = SERVICE_DESK_THRESHOLDS.homeStayDays * TICKS_PER_DAY
    expect(evaluateHomeStay(ctx(states, { tick: limit - 1, trackers }))).toHaveLength(0)
    expect(evaluateHomeStay(ctx(states, { tick: limit, trackers }))).toHaveLength(1)
  })

  it('resets when the resident moves and ignores non-home lots', () => {
    const home1 = { a: makeState('a', at('h')) }
    let trackers = updateTrackers(createTrackers(), home1, 0)
    trackers = updateTrackers(trackers, { a: makeState('a', at('work')) }, 10)
    trackers = updateTrackers(trackers, home1, 20)
    expect(trackers.lotStay.a.sinceTick).toBe(20)
    const away = { a: makeState('a', at('work')) }
    expect(evaluateHomeStay(ctx(away, { tick: 99999, trackers: updateTrackers(createTrackers(), away, 0) }))).toHaveLength(0)
  })
})

describe('evaluateFriendCount', () => {
  const rel = (score: number, dead = false) => ({
    id: 'r', fromCharacterId: 'a', toCharacterId: 'b', shortTermScore: 0, longTermScore: score, labels: [], isDeceasedTarget: dead
  })
  it('counts only living relationships at the friend score', () => {
    const lonely = makeState('a', { relationships: [rel(0.9), rel(0.9, true), rel(0.1)] })
    const social = makeState('b', { relationships: [rel(0.3), rel(0.5)] })
    const alerts = evaluateFriendCount(ctx({ a: lonely, b: social }))
    expect(alerts.map((x) => x.characterId)).toEqual(['a'])
    expect(alerts[0].message).toContain('1 friend ')
  })
})

describe('evaluateHappinessTrend', () => {
  const history = (fn: (t: number) => number): HappinessSample[] =>
    Array.from({ length: 48 }, (_, t) => ({ tick: t, iso: '', town: 0, perCharacter: { a: fn(t) }, perCharacterNeeds: {} }))

  it('linearSlope is exact on a line and null on degenerate input', () => {
    expect(linearSlope([{ x: 0, y: 1 }, { x: 2, y: 5 }])).toBeCloseTo(2)
    expect(linearSlope([{ x: 1, y: 1 }])).toBeNull()
    expect(linearSlope([{ x: 1, y: 1 }, { x: 1, y: 2 }])).toBeNull()
  })

  it('fires on a steep decline, not on flat or too little data', () => {
    const states = { a: makeState('a') }
    expect(evaluateHappinessTrend(ctx(states, { tick: 47, history: history((t) => 0.9 - t * 0.01) }))).toHaveLength(1)
    expect(evaluateHappinessTrend(ctx(states, { tick: 47, history: history(() => 0.6) }))).toHaveLength(0)
    expect(evaluateHappinessTrend(ctx(states, { tick: 47, history: history(() => 0.6).slice(0, 5) }))).toHaveLength(0)
  })
})

describe('evaluateAlerts', () => {
  it('sorts critical before warning before info', () => {
    const states = { a: makeState('a', {}, { food: 0.25 }), b: makeState('b', {}, { food: 0.05 }) }
    const severities = evaluateAlerts(ctx(states)).map((x) => x.severity)
    const sorted = [...severities].sort((x, y) => ['critical', 'warning', 'info'].indexOf(x) - ['critical', 'warning', 'info'].indexOf(y))
    expect(severities).toEqual(sorted)
    expect(severities[0]).toBe('critical')
  })
})

describe('tickets', () => {
  const lowFood = (value: number) => ({ a: makeState('a', {}, { food: value }) })
  const ids = () => {
    let n = 0
    return () => `t${++n}`
  }

  it('files a ticket only after the need stays low long enough', () => {
    let trackers = updateTrackers(createTrackers(), lowFood(0.1), 0)
    const n = SERVICE_DESK_THRESHOLDS.ticketSustainedTicks
    expect(evaluateUnmetNeeds({ tick: n - 1, states: lowFood(0.1), trackers })).toHaveLength(0)
    const c = evaluateUnmetNeeds({ tick: n, states: lowFood(0.1), trackers })
    expect(c).toHaveLength(1)
    trackers = updateTrackers(trackers, lowFood(0.9), n)
    expect(evaluateUnmetNeeds({ tick: n + 1, states: lowFood(0.9), trackers })).toHaveLength(0)
  })

  const candidate = () => ({
    key: 'k', rule: 'unmet-need', severity: 'critical' as const, characterId: 'a', characterName: 'a', title: 'x'
  })

  it('dedupes, auto-resolves when the condition clears, and reopens on recurrence', () => {
    const nextId = ids()
    let tickets = reconcileTickets([], [candidate()], 1, nextId)
    tickets = reconcileTickets(tickets, [candidate()], 2, nextId)
    expect(tickets).toHaveLength(1)
    expect(tickets[0].status).toBe('open')

    tickets = reconcileTickets(tickets, [], 3, nextId)
    expect(tickets[0]).toMatchObject({ status: 'resolved', autoResolved: true })

    tickets = reconcileTickets(tickets, [candidate()], 4, nextId)
    expect(tickets).toHaveLength(2)
    expect(tickets[1].status).toBe('open')
  })

  it('does not reopen a manually resolved ticket while the condition persists', () => {
    const nextId = ids()
    let tickets = reconcileTickets([], [candidate()], 1, nextId)
    tickets = transitionTicket(tickets, 't1', 'resolved', 2)
    tickets = reconcileTickets(tickets, [candidate()], 3, nextId)
    expect(tickets).toHaveLength(1)
    expect(tickets[0].status).toBe('resolved')
  })

  it('enforces lifecycle order', () => {
    let tickets = reconcileTickets([], [candidate()], 1, ids())
    tickets = transitionTicket(tickets, 't1', 'acknowledged', 2)
    expect(tickets[0].status).toBe('acknowledged')
    tickets = transitionTicket(tickets, 't1', 'resolved', 3)
    tickets = transitionTicket(tickets, 't1', 'open' as never, 4)
    expect(tickets[0].status).toBe('resolved')
  })
})
