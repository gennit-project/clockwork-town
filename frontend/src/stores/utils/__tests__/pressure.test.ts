import { describe, expect, it } from 'vitest'
import { createMockCharacterState, createMockNeeds, mockConsole } from '../../__tests__/mockData'
import { DRAMA_INTENSITIES, PRESSURE } from '../../config/pressure'
import { TRAIT_EFFECTS } from '../../config/traitEffects'
import { evaluatePressureTickets } from '../ticketEvaluators'
import {
  addPressure,
  dispositionOf,
  meterEnabled,
  pressureValue,
  readPressure,
  relievePressure,
  thresholdFor,
  tickPressure
} from '../pressure'
import type { CharacterState, Grievance } from '../../types'

mockConsole()

const grievance = (over: Partial<Grievance> = {}): Grievance => ({
  id: 'x:t',
  aboutCharacterId: 'x',
  aboutName: 'X',
  topicId: 't',
  summary: 'doing a thing',
  ticksRemaining: 100,
  times: 1,
  ...over
})

const resident = (over: Partial<CharacterState> = {}): CharacterState =>
  createMockCharacterState({ name: 'R', needs: createMockNeeds({}), ...over })

const ledgerSum = (state: Pick<CharacterState, 'pressure'>, meter: 'irritation' | 'jealousy' = 'irritation') =>
  Object.values(state.pressure?.[meter]?.ledger ?? {}).reduce((a, b) => a + b, 0)

const run = (state: CharacterState, ticks: number, others: Record<string, CharacterState> = {}) => {
  const states = { me: state, ...others }
  for (let i = 0; i < ticks; i++) tickPressure(states)
}

describe('dispositions', () => {
  it('combine multipliers, and an untraited resident is neutral', () => {
    expect(dispositionOf([]).gain.irritation).toBe(1)
    expect(dispositionOf(['trait-loses-temper-easily']).gain.irritation).toBe(1.5)
    expect(dispositionOf(['trait-loses-temper-easily', 'trait-conflict-averse']).gain.irritation).toBeCloseTo(1.2)
  })

  it('jealousy exists only for jealous residents', () => {
    expect(meterEnabled([], 'jealousy')).toBe(false)
    expect(meterEnabled(['trait-jealous'], 'jealousy')).toBe(true)
    const calm = resident()
    expect(addPressure(calm, 'jealousy', 'rival_presence', 0.5)).toBe(0)
    expect(pressureValue(calm, 'jealousy')).toBe(0)
  })

  it('thresholds: temper lowers, conflict-averse raises, intensity scales, Off is never', () => {
    const base = thresholdFor([], 'irritation', 'normal')
    expect(base).toBe(PRESSURE.baseThreshold)
    expect(thresholdFor(['trait-loses-temper-easily'], 'irritation', 'normal')).toBeLessThan(base)
    expect(thresholdFor(['trait-conflict-averse'], 'irritation', 'normal')).toBeGreaterThan(base)
    expect(thresholdFor([], 'irritation', 'relentless')).toBeLessThan(base)
    expect(thresholdFor([], 'irritation', 'low')).toBeGreaterThan(base)
    expect(thresholdFor([], 'irritation', 'off')).toBe(Infinity)
  })

  it('every pressure trait in the effects map is in the backend catalog', async () => {
    const { readFileSync } = await import('node:fs')
    const catalog = readFileSync(`${process.cwd()}/../src/traits.ts`, 'utf8')
    for (const id of Object.keys(TRAIT_EFFECTS)) expect(catalog, id).toContain(`"${id}"`)
  })
})

describe('triggers (each alone, with a no-trigger control)', () => {
  it('control: a fed, ungrieved resident alone builds nothing', () => {
    const me = resident()
    run(me, 50)
    expect(pressureValue(me, 'irritation')).toBe(0)
  })

  it('unmet basic needs build irritation, and it is attributed to them', () => {
    const me = resident({ needs: createMockNeeds({ food: 0.05, sleep: 0.1 }) })
    run(me, 10)
    expect(pressureValue(me, 'irritation')).toBeGreaterThan(0.02)
    expect(Object.keys(me.pressure!.irritation!.ledger)).toEqual(['unmet_needs'])
  })

  it('a higher need being low does not (only basic needs count)', () => {
    const me = resident({ needs: createMockNeeds({ friends: 0, fulfillment: 0 }) })
    run(me, 10)
    expect(pressureValue(me, 'irritation')).toBe(0)
  })

  it('grievances build it; talked-over ones do not', () => {
    const upset = resident({ grievances: [grievance()] })
    const vented = resident({ grievances: [grievance({ vented: true })] })
    run(upset, 10)
    run(vented, 10)
    expect(pressureValue(upset, 'irritation')).toBeGreaterThan(0.02)
    expect(pressureValue(vented, 'irritation')).toBe(0)
  })

  it('petty counts grievances for more, forgiving for less', () => {
    const make = (traitIds: string[]) => resident({ traitIds, grievances: [grievance()] })
    const [petty, plain, forgiving] = [make(['trait-petty']), make([]), make(['trait-forgiving'])]
    ;[petty, plain, forgiving].forEach((s) => run(s, 10))
    expect(pressureValue(petty, 'irritation')).toBeGreaterThan(pressureValue(plain, 'irritation'))
    expect(pressureValue(plain, 'irritation')).toBeGreaterThan(pressureValue(forgiving, 'irritation'))
  })

  it('crowding builds it only above the crowd size', () => {
    const lot = { lotId: 'lot-1', lotName: 'L', spaceId: null, spaceName: null } as never
    const crowd = Object.fromEntries(
      Array.from({ length: PRESSURE.crowdAbove + 2 }, (_, i) => [`o${i}`, resident({ location: lot })])
    )
    const me = resident({ location: lot })
    run(me, 10, crowd)
    expect(me.pressure!.irritation!.ledger).toHaveProperty('crowding')

    const quiet = resident({ location: lot })
    run(quiet, 10, { o0: resident({ location: lot }) })
    expect(pressureValue(quiet, 'irritation')).toBe(0)
  })

  it('jealousy: a close tie busy with someone else on the same lot; not when busy with me', () => {
    const lot = { lotId: 'lot-1', lotName: 'L', spaceId: null, spaceName: null } as never
    const withTie = (traitIds: string[]) =>
      resident({
        traitIds,
        location: lot,
        relationships: [{ id: 'r', fromCharacterId: 'me', toCharacterId: 'love', shortTermScore: 0.8, longTermScore: 0.8, labels: [], isDeceasedTarget: false }]
      })
    const busyElsewhere = resident({ location: lot, currentTask: { socialTargetId: 'rival' } as never })
    const busyWithMe = resident({ location: lot, currentTask: { socialTargetId: 'me' } as never })

    const jealous = withTie(['trait-jealous'])
    run(jealous, 10, { love: busyElsewhere })
    expect(pressureValue(jealous, 'jealousy')).toBeGreaterThan(0.05)

    const content = withTie(['trait-jealous'])
    run(content, 10, { love: busyWithMe })
    expect(pressureValue(content, 'jealousy')).toBe(0)

    const notJealous = withTie([])
    run(notJealous, 10, { love: busyElsewhere })
    expect(pressureValue(notJealous, 'jealousy')).toBe(0)
  })
})

describe('the headline scenario', () => {
  it('a hot-tempered, hungry resident with a grievance has more irritation than a calm one, and the ledger says why', () => {
    const scenario = { needs: createMockNeeds({ food: 0.05 }), grievances: [grievance({ times: 2 })] }
    const hothead = resident({ ...scenario, traitIds: ['trait-loses-temper-easily'] })
    const calm = resident({ ...scenario, traitIds: ['trait-conflict-averse'] })
    run(hothead, 20)
    run(calm, 20)
    expect(pressureValue(hothead, 'irritation')).toBeGreaterThan(pressureValue(calm, 'irritation') * 1.5)
    const reading = readPressure(hothead, 'irritation', 'normal')
    expect(reading.contributions.map((c) => c.trigger).sort()).toEqual(['grievances', 'unmet_needs'])
    expect(reading.threshold).toBeLessThan(readPressure(calm, 'irritation', 'normal').threshold)
  })
})

describe('draining', () => {
  const loaded = () => {
    const me = resident()
    addPressure(me, 'irritation', 'unmet_needs', 0.4)
    addPressure(me, 'irritation', 'grievances', 0.2)
    return me
  }

  it('time drains a little each tick; sleep drains much more', () => {
    const awake = loaded()
    const asleep = { ...loaded(), currentAction: 'sleep' as const }
    run(awake, 5)
    run(asleep as CharacterState, 5)
    expect(pressureValue(awake, 'irritation')).toBeLessThan(0.6)
    expect(pressureValue(asleep, 'irritation')).toBeLessThan(pressureValue(awake, 'irritation') - 0.05)
  })

  it('relief takes proportionally from every trigger, so the ledger still sums to the meter', () => {
    const me = loaded()
    relievePressure(me, 'irritation', PRESSURE.ventRelief)
    expect(pressureValue(me, 'irritation')).toBeCloseTo(0.45)
    expect(ledgerSum(me)).toBeCloseTo(0.45)
    expect(me.pressure!.irritation!.ledger.unmet_needs).toBeCloseTo(0.3)
  })

  it('draining to nothing clears the ledger; a meter never goes below zero or above one', () => {
    const me = loaded()
    relievePressure(me, 'irritation', 5)
    expect(me.pressure!.irritation).toEqual({ value: 0, ledger: {} })
    addPressure(me, 'irritation', 'unmet_needs', 5)
    expect(pressureValue(me, 'irritation')).toBe(1)
  })
})

describe('invariant sweep', () => {
  it('across needs, grievances and traits, the ledger always sums to the meter and stays within 0..1', () => {
    for (const traitIds of [[], ['trait-loses-temper-easily'], ['trait-conflict-averse', 'trait-forgiving'], ['trait-petty', 'trait-jealous']]) {
      for (const food of [0, 0.15, 0.6]) {
        for (const times of [0, 1, 3]) {
          const me = resident({ traitIds, needs: createMockNeeds({ food, sleep: food }), grievances: times ? [grievance({ times })] : [] })
          for (let i = 0; i < 60; i++) {
            tickPressure({ me })
            for (const meter of ['irritation', 'jealousy'] as const) {
              const value = pressureValue(me, meter)
              expect(value).toBeGreaterThanOrEqual(0)
              expect(value).toBeLessThanOrEqual(1)
              expect(ledgerSum(me, meter)).toBeCloseTo(value, 6)
            }
          }
        }
      }
    }
  })
})

describe('pressure tickets and drama intensity', () => {
  const overTheLine = () => {
    const me = resident({ name: 'Tom', traitIds: ['trait-loses-temper-easily'], traits: ['Loses temper easily'] })
    addPressure(me, 'irritation', 'grievances', 0.6)
    return me
  }
  const ctx = (state: CharacterState, dramaIntensity?: (typeof DRAMA_INTENSITIES)[number]) =>
    ({ tick: 1, states: { tom: state }, trackers: {} as never, dramaIntensity }) as never

  it('files a ticket with a cause listing contributions and dispositions', () => {
    const [ticket] = evaluatePressureTickets(ctx(overTheLine()))
    expect(ticket.title).toBe("Tom's irritation is over the line")
    expect(ticket.cause?.kind).toBe('pressure')
    expect(ticket.cause?.factors.some((f) => f.label === 'Grievances they hold')).toBe(true)
    expect(ticket.cause?.factors.some((f) => f.label === 'Dispositions' && f.value === 'Loses temper easily')).toBe(true)
  })

  it('control: a calm resident at the same pressure is under their line; Off never files', () => {
    const calm = resident({ name: 'Cal', traitIds: ['trait-conflict-averse'] })
    addPressure(calm, 'irritation', 'grievances', 0.6)
    expect(evaluatePressureTickets(ctx(calm))).toHaveLength(0)
    expect(evaluatePressureTickets(ctx(overTheLine(), 'off'))).toHaveLength(0)
    expect(evaluatePressureTickets(ctx(overTheLine(), 'relentless'))).toHaveLength(1)
    expect(evaluatePressureTickets(ctx(overTheLine(), 'low'))).toHaveLength(1)
  })
})
