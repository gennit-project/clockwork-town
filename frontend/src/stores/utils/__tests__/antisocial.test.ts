import { describe, expect, it } from 'vitest'
import { createMockCharacterState, createMockNeeds, mockConsole } from '../../__tests__/mockData'
import { ACTION_EFFECTS } from '../../config/actionEffects'
import { ANTISOCIAL, RUNGS } from '../../config/antisocial'
import { DRAMA_INTENSITIES, type DramaIntensity } from '../../config/pressure'
import { applyAntisocialActEffects, chooseRung, chooseTarget, decideAntisocialActs, lifeStage, tickAntisocial } from '../antisocial'
import { addPressure, pressureValue, thresholdFor } from '../pressure'
import type { CharacterState, Grievance } from '../../types'

mockConsole()

const DAY = '2026-04-06'
const lot = { regionId: 'r', lotId: 'lot-1', lotName: 'L', spaceId: 's', spaceName: 'S' }

const person = (name: string, over: Partial<CharacterState> = {}): CharacterState =>
  createMockCharacterState({ name, age: 35, location: lot, needs: createMockNeeds({}), ...over })

/** Put irritation exactly `margin` over their personal limit. */
function pushOver(state: CharacterState, margin: number, intensity: DramaIntensity = 'normal'): CharacterState {
  const limit = thresholdFor(state.traitIds, 'irritation', intensity)
  addPressure(state, 'irritation', 'grievances', (limit + margin) / (state.traitIds.includes('trait-loses-temper-easily') ? 1.5 : state.traitIds.includes('trait-conflict-averse') ? 0.8 : 1))
  return state
}

const grievance = (aboutCharacterId: string, over: Partial<Grievance> = {}): Grievance => ({
  id: `${aboutCharacterId}:t`,
  aboutCharacterId,
  aboutName: aboutCharacterId.toUpperCase(),
  topicId: 't',
  summary: 'doing a thing',
  ticksRemaining: 100,
  times: 1,
  ...over
})

const decide = (states: Record<string, CharacterState>, intensity: DramaIntensity = 'normal') =>
  decideAntisocialActs({ states, intensity, dayKey: DAY })

describe('life stage', () => {
  it('adult at the configured age, child below, unknown without one', () => {
    expect(lifeStage(ANTISOCIAL.adultAge)).toBe('adult')
    expect(lifeStage(ANTISOCIAL.adultAge - 1)).toBe('child')
    expect(lifeStage(undefined)).toBe('unknown')
  })
})

describe('chooseRung', () => {
  it('climbs with the margin; below the line is none', () => {
    expect(chooseRung(-0.01, 'adult')).toBeNull()
    expect(chooseRung(0, 'adult')?.id).toBe('snap')
    expect(chooseRung(0.149, 'adult')?.id).toBe('snap')
    expect(chooseRung(0.15, 'adult')?.id).toBe('belittle')
    expect(chooseRung(0.3, 'adult')?.id).toBe('argue')
  })
  it('children only ever snap, and unknown ages never act', () => {
    expect(chooseRung(0.9, 'child')?.id).toBe('snap')
    expect(chooseRung(0.9, 'unknown')).toBeNull()
  })
})

describe('chooseTarget', () => {
  it('prefers who they hold the most against, then who they regard least, then id; adults only choose adults', () => {
    const me = person('Me', { grievances: [grievance('b', { times: 1 }), grievance('c', { times: 3 })] })
    const states = { me, b: person('B'), c: person('C'), d: person('D') }
    expect(chooseTarget('me', me, states)?.targetId).toBe('c')

    const noGrudge = person('Me2', {
      relationships: [
        { id: 'r1', fromCharacterId: 'me', toCharacterId: 'b', shortTermScore: 0.5, longTermScore: 0.5, labels: [], isDeceasedTarget: false },
        { id: 'r2', fromCharacterId: 'me', toCharacterId: 'c', shortTermScore: -0.4, longTermScore: 0, labels: [], isDeceasedTarget: false }
      ]
    })
    expect(chooseTarget('me', noGrudge, { me: noGrudge, b: person('B'), c: person('C'), d: person('D') })?.targetId).toBe('c')

    const tied = person('Tied')
    expect(chooseTarget('me', tied, { me: tied, z: person('Z'), a: person('A') })?.targetId).toBe('a')

    const withChild = { me: person('Me'), kid: person('Kid', { age: 9 }) }
    expect(chooseTarget('me', withChild.me, withChild)).toBeNull()
  })

  it('ignores other lots and sleepers', () => {
    const me = person('Me')
    const away = person('Away', { location: { ...lot, lotId: 'lot-2' } })
    const asleep = person('Asleep', { currentAction: 'sleep' })
    expect(chooseTarget('me', me, { me, away, asleep })).toBeNull()
  })
})

describe('deciding who acts', () => {
  const setup = (traitIds: string[], margin: number) => {
    const actor = pushOver(person('Tom', { traitIds, traits: traitIds }), margin)
    return { tom: actor, sara: person('Sara') }
  }

  it('a hot-tempered resident over the line lashes out at someone present, with a full cause', () => {
    const states = setup(['trait-loses-temper-easily'], 0.05)
    const [act] = decide(states)
    expect(act).toMatchObject({ actorId: 'tom', targetId: 'sara' })
    expect(act.rung.id).toBe('snap')
    expect(act.cause.kind).toBe('antisocial_act')
    expect(act.cause.summary).toContain('Tom snapped at Sara')
    const labels = act.cause.factors.map((f) => f.label)
    expect(labels).toEqual(expect.arrayContaining(['irritation', 'Rung: snap', 'Why this person', 'Who was there', 'Drama intensity', 'Dispositions']))
  })

  it('controls: below the line, a calm resident at the same pressure, no one there, and Off all produce no act', () => {
    expect(decide(setup(['trait-loses-temper-easily'], -0.02))).toHaveLength(0)

    const hot = setup(['trait-loses-temper-easily'], 0.05)
    const calm = { tom: person('Cal', { traitIds: ['trait-conflict-averse'] }), sara: person('Sara') }
    addPressure(calm.tom, 'irritation', 'grievances', pressureValue(hot.tom, 'irritation') / 1.5 * 0.8)
    expect(decide(calm)).toHaveLength(0)

    const alone = { tom: hot.tom }
    expect(decide(alone)).toHaveLength(0)

    expect(decide(setup(['trait-loses-temper-easily'], 0.05), 'off')).toHaveLength(0)
  })

  it('is deterministic: the same state gives the same act and the same cause', () => {
    const a = decide(setup(['trait-loses-temper-easily'], 0.2))
    const b = decide(setup(['trait-loses-temper-easily'], 0.2))
    expect(a).toEqual(b)
    expect(a[0].rung.id).toBe('belittle')
  })

  it('intensity moves the line: the same pressure acts at Relentless but not at Low', () => {
    const base = () => ({ tom: person('Tom', { traitIds: [] }), sara: person('Sara') })
    const make = () => {
      const s = base()
      addPressure(s.tom, 'irritation', 'grievances', 0.5)
      return s
    }
    expect(decide(make(), 'relentless')).toHaveLength(1)
    expect(decide(make(), 'low')).toHaveLength(0)
  })

  it('cooldown and daily cap hold at their boundaries', () => {
    const states = setup(['trait-loses-temper-easily'], 0.05)
    states.tom.antisocial = { cooldown: 1, day: DAY, count: 1 }
    expect(decide(states)).toHaveLength(0)
    tickAntisocial(states)
    expect(states.tom.antisocial?.cooldown).toBe(0)
    expect(decide(states)).toHaveLength(1)

    states.tom.antisocial = { cooldown: 0, day: DAY, count: ANTISOCIAL.dailyCap - 1 }
    expect(decide(states)).toHaveLength(1)
    states.tom.antisocial = { cooldown: 0, day: DAY, count: ANTISOCIAL.dailyCap }
    expect(decide(states)).toHaveLength(0)
    states.tom.antisocial = { cooldown: 0, day: '2026-04-05', count: ANTISOCIAL.dailyCap }
    expect(decide(states)).toHaveLength(1)
  })

  it('a sleeper does not act and is not acted on', () => {
    const states = setup(['trait-loses-temper-easily'], 0.05)
    states.tom.currentAction = 'sleep'
    expect(decide(states)).toHaveLength(0)
    states.tom.currentAction = 'idle'
    states.sara.currentAction = 'sleep'
    expect(decide(states)).toHaveLength(0)
  })

  it('each resident is in at most one act per tick', () => {
    const states = {
      a: pushOver(person('A', { traitIds: ['trait-loses-temper-easily'] }), 0.05),
      b: pushOver(person('B', { traitIds: ['trait-loses-temper-easily'] }), 0.05),
      c: person('C')
    }
    const acts = decide(states)
    const involved = acts.flatMap((a) => [a.actorId, a.targetId])
    expect(new Set(involved).size).toBe(involved.length)
  })
})

describe('effects', () => {
  it('the actor is relieved, the target is rattled, bookkeeping is set; an argument relieves both', () => {
    const states = { tom: pushOver(person('Tom', { traitIds: ['trait-loses-temper-easily'] }), 0.05), sara: person('Sara') }
    const before = pressureValue(states.tom, 'irritation')
    const [act] = decide(states)
    applyAntisocialActEffects(states, act, DAY)
    expect(pressureValue(states.tom, 'irritation')).toBeCloseTo(before - act.rung.relief)
    expect(states.sara.pressure?.irritation?.ledger).toHaveProperty('insulted')
    expect(states.tom.antisocial).toEqual({ cooldown: ANTISOCIAL.cooldownTicks, day: DAY, count: 1 })

    const fight = { tom: pushOver(person('Tom', { traitIds: ['trait-loses-temper-easily'] }), 0.4), sara: person('Sara') }
    addPressure(fight.sara, 'irritation', 'grievances', 0.4)
    const [argue] = decide(fight)
    expect(argue.rung.id).toBe('argue')
    const saraBefore = pressureValue(fight.sara, 'irritation')
    applyAntisocialActEffects(fight, argue, DAY)
    expect(pressureValue(fight.sara, 'irritation')).toBeLessThan(saraBefore + argue.rung.targetImpulse)
  })
})

describe('invariants', () => {
  it('every antisocial action in the effects map is a rung', () => {
    const flagged = Object.entries(ACTION_EFFECTS).filter(([, e]) => e.antisocial).map(([a]) => a).sort()
    expect(flagged).toEqual(RUNGS.map((r) => r.action).sort())
  })

  it('across ages, traits, margins and intensities: acts always have a cause, never involve a child unsafely, never happen at Off', () => {
    let acts = 0
    for (const intensity of DRAMA_INTENSITIES) {
      for (const actorAge of [undefined, 8, 17, 18, 40]) {
        for (const targetAge of [undefined, 9, 18, 40]) {
          for (const traitIds of [[], ['trait-loses-temper-easily'], ['trait-conflict-averse']]) {
            for (const margin of [0, 0.1, 0.2, 0.4]) {
              const tom = pushOver(person('Tom', { age: actorAge, traitIds, traits: traitIds }), margin, 'normal')
              addPressure(tom, 'irritation', 'unmet_needs', 0.3)
              const states = { tom, sara: person('Sara', { age: targetAge }) }
              for (const act of decide(states, intensity)) {
                acts++
                expect(intensity).not.toBe('off')
                expect(act.cause.factors.length).toBeGreaterThan(0)
                expect(act.cause.summary).toContain('Tom')
                const stages = [lifeStage(actorAge), lifeStage(targetAge)]
                expect(stages[0]).toBe(stages[1])
                expect(stages[0]).not.toBe('unknown')
                if (stages[0] === 'child') expect(act.rung.serious).toBe(false)
              }
            }
          }
        }
      }
    }
    expect(acts).toBeGreaterThan(0)
  })
})
