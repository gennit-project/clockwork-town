import { describe, expect, it } from 'vitest'
import { createMockCharacterState, createMockNeeds, mockConsole } from '../../__tests__/mockData'
import { RUNGS } from '../../config/antisocial'
import { DRAMA_INTENSITIES, type DramaIntensity } from '../../config/pressure'
import { SIDES } from '../../config/sides'
import { assessBystander, applySideEffects, decideSides, sideDispositions } from '../sides'
import { addPressure, pressureValue, thresholdFor } from '../pressure'
import type { AntisocialAct } from '../antisocial'
import type { CharacterState } from '../../types'

mockConsole()

const lot = { regionId: 'r', lotId: 'lot-1', lotName: 'L', spaceId: 's', spaceName: 'S' }
const rel = (toCharacterId: string, longTermScore: number, shortTermScore = 0, labels: string[] = []) => ({
  id: `r-${toCharacterId}`,
  fromCharacterId: 'by',
  toCharacterId,
  shortTermScore,
  longTermScore,
  labels,
  isDeceasedTarget: false
})
const person = (name: string, over: Partial<CharacterState> = {}): CharacterState =>
  createMockCharacterState({ name, age: 40, location: lot, needs: createMockNeeds({}), ...over })

const act = (_states: Record<string, CharacterState>): AntisocialAct => ({
  actorId: 'tom',
  targetId: 'sara',
  rung: RUNGS[0],
  cause: { kind: 'antisocial_act', summary: 'Tom snapped at Sara', factors: [{ label: 'x', value: 1 }] }
})

/** Tom snaps at Sara; Bea watches with the given regard for each. */
const scene = (bea: Partial<CharacterState> & { forSara?: number; forTom?: number; sara?: Partial<CharacterState> } = {}) => {
  const { forSara = 0.7, forTom = 0.1, sara, ...over } = bea
  const states = {
    tom: person('Tom'),
    sara: person('Sara', sara),
    bea: person('Bea', { relationships: [rel('sara', forSara), rel('tom', forTom)], ...over })
  }
  return states
}

describe('assessBystander', () => {
  it('a friend of the target, much closer to them than to the actor, steps in; with a reason', () => {
    const a = assessBystander('bea', scene(), 'tom', 'sara')!
    expect(a.side).toBe('target')
    expect(a.gap).toBeGreaterThanOrEqual(SIDES.margin)
    expect(a.targetRegard).toBeGreaterThan(a.actorRegard)
  })

  it('a friend of the actor backs the actor', () => {
    expect(assessBystander('bea', scene({ forSara: 0.1, forTom: 0.7 }), 'tom', 'sara')!.side).toBe('actor')
  })

  it('controls: a stranger, someone equally close to both, and a resident who dislikes both stay out', () => {
    expect(assessBystander('bea', scene({ forSara: 0, forTom: 0 }), 'tom', 'sara')!.side).toBe('neutral')
    expect(assessBystander('bea', scene({ forSara: 0.6, forTom: 0.6 }), 'tom', 'sara')!.side).toBe('neutral')
    expect(assessBystander('bea', scene({ forSara: 0.3, forTom: 0 }), 'tom', 'sara')!.side).toBe('neutral') // below minRegard
  })

  it('the margin tips exactly at the configured gap', () => {
    const base = 0.5
    expect(assessBystander('bea', scene({ forSara: base + SIDES.margin - 0.01, forTom: base }), 'tom', 'sara')!.side).toBe('neutral')
    expect(assessBystander('bea', scene({ forSara: base + SIDES.margin + 0.01, forTom: base }), 'tom', 'sara')!.side).toBe('target')
  })

  it('a conflict-averse resident stays out however close; a protective one steps in at lower regard', () => {
    expect(assessBystander('bea', scene({ traitIds: ['trait-conflict-averse'], traits: ['Conflict-averse'] }), 'tom', 'sara')!.side).toBe('neutral')
    const lowRegard = { forSara: SIDES.protectiveMinRegard + 0.01, forTom: 0 }
    expect(assessBystander('bea', scene(lowRegard), 'tom', 'sara')!.side).toBe('neutral')
    expect(assessBystander('bea', scene({ ...lowRegard, traitIds: ['trait-protective'], traits: ['Protective'] }), 'tom', 'sara')!.side).toBe('target')
  })

  it('family and values count: a "happy family" resident sides with their relative even at equal regard', () => {
    const states = scene({ forSara: 0.5, forTom: 0.5, householdId: 'h', values: [{ id: 'value-happy-family', name: 'Have a happy family', ticksSinceFulfilled: 0 }] })
    states.tom.householdId = 'h'
    expect(assessBystander('bea', states, 'tom', 'sara')!.side).toBe('actor')
    const ranked = scene({ forSara: 0.5, forTom: 0.5, householdId: 'h', values: [{ id: 'x1', name: 'a', ticksSinceFulfilled: 0 }, { id: 'x2', name: 'b', ticksSinceFulfilled: 0 }, { id: 'value-happy-family', name: 'Have a happy family', ticksSinceFulfilled: 0 }] })
    ranked.tom.householdId = 'h'
    // Family bond alone (0.2) is below the 0.25 margin, and the value is ranked too low to count.
    expect(assessBystander('bea', ranked, 'tom', 'sara')!.side).toBe('neutral')
  })

  it('children, sleepers, other lots and the parties themselves are never assessed', () => {
    expect(assessBystander('bea', scene({ age: 12 }), 'tom', 'sara')).toBeNull()
    expect(assessBystander('bea', scene({ age: undefined }), 'tom', 'sara')).toBeNull()
    expect(assessBystander('bea', scene({ currentAction: 'sleep' }), 'tom', 'sara')).toBeNull()
    expect(assessBystander('bea', scene({ location: { ...lot, lotId: 'lot-2' } }), 'tom', 'sara')).toBeNull()
    expect(assessBystander('tom', scene(), 'tom', 'sara')).toBeNull()
  })
})

describe('decideSides', () => {
  const decide = (states: Record<string, CharacterState>, intensity: DramaIntensity = 'normal') =>
    decideSides({ acts: [act(states)], states, intensity })

  it('the single most regarded defender steps in; a second defender does not pile on', () => {
    const states = { ...scene(), cy: person('Cy', { relationships: [rel('sara', 0.9), rel('tom', 0)] }) }
    const [outcome] = decide(states)
    expect(outcome.intervener?.bystanderId).toBe('cy')
  })

  it('backers are listed (at most two), and ties go to the lower id', () => {
    const states = {
      tom: person('Tom'),
      sara: person('Sara'),
      b3: person('B3', { relationships: [rel('tom', 0.7), rel('sara', 0)] }),
      b1: person('B1', { relationships: [rel('tom', 0.7), rel('sara', 0)] }),
      b2: person('B2', { relationships: [rel('tom', 0.7), rel('sara', 0)] })
    }
    const [outcome] = decide(states)
    expect(outcome.backers.map((b) => b.bystanderId)).toEqual(['b1', 'b2'])
    expect(outcome.intervener).toBeUndefined()
  })

  it('children and sensitive adults who watched are upset, and cannot intervene', () => {
    const states = { ...scene({ forSara: 0, forTom: 0 }), kid: person('Kid', { age: 9, relationships: [rel('sara', 0.9)] }), tender: person('Tender', { traitIds: ['trait-sensitive'], traits: ['Sensitive'] }) }
    const [outcome] = decide(states)
    expect(outcome.upset.map((u) => u.id).sort()).toEqual(['kid', 'tender'])
    expect(outcome.intervener).toBeUndefined()
  })

  it('a cooldown keeps the same person from stepping in again at once; Off does nothing at all', () => {
    const states = scene()
    states.bea.witnessCooldowns = { 'side:tom': 3 }
    expect(decide(states)[0].intervener).toBeUndefined()
    expect(decide(scene(), 'off')).toEqual([])
  })

  it('is deterministic', () => {
    expect(decide(scene())).toEqual(decide(scene()))
  })
})

describe('applySideEffects', () => {
  const outcomeFor = (states: Record<string, CharacterState>) => decideSides({ acts: [act(states)], states, intensity: 'normal' })[0]

  it('stepping in calms the actor, comforts the target, sets a cooldown and carries a cause', () => {
    const states = scene()
    addPressure(states.tom, 'irritation', 'grievances', 0.4)
    addPressure(states.sara, 'irritation', 'insulted', 0.2)
    const [tomBefore, saraBefore] = [pressureValue(states.tom, 'irritation'), pressureValue(states.sara, 'irritation')]
    const applied = applySideEffects(states, outcomeFor(states), 'normal')
    expect(pressureValue(states.tom, 'irritation')).toBeCloseTo(tomBefore - SIDES.intervene.actorRelief)
    expect(pressureValue(states.sara, 'irritation')).toBeCloseTo(saraBefore - SIDES.intervene.targetComfort)
    expect(applied.backfired).toBe(false)
    expect(states.bea.witnessCooldowns?.['side:tom']).toBe(SIDES.cooldownTicks)
    expect(applied.interveneCause?.kind).toBe('took_side')
    expect(applied.interveneCause?.factors.length).toBeGreaterThan(0)
  })

  it('it backfires when the actor is still well over their limit, and not when they are calm enough', () => {
    const hot = scene()
    hot.tom.traitIds = ['trait-loses-temper-easily']
    addPressure(hot.tom, 'irritation', 'grievances', 1)
    const backfired = applySideEffects(hot, outcomeFor(hot), 'normal')
    expect(backfired.backfired).toBe(true)
    expect(hot.tom.pressure?.irritation?.ledger).toHaveProperty('confronted')
    expect(backfired.interveneCause?.factors.some((f) => f.label === 'Outcome')).toBe(true)

    const calm = scene()
    addPressure(calm.tom, 'irritation', 'grievances', thresholdFor([], 'irritation', 'normal') - 0.05)
    expect(applySideEffects(calm, outcomeFor(calm), 'normal').backfired).toBe(false)
  })

  it('backers calm the actor a little; upset witnesses gain distress, each with a cause', () => {
    const states = { tom: person('Tom'), sara: person('Sara'), bo: person('Bo', { relationships: [rel('tom', 0.7), rel('sara', 0)] }), kid: person('Kid', { age: 8 }) }
    addPressure(states.tom, 'irritation', 'grievances', 0.5)
    const before = pressureValue(states.tom, 'irritation')
    const applied = applySideEffects(states, outcomeFor(states), 'normal')
    expect(pressureValue(states.tom, 'irritation')).toBeCloseTo(before - SIDES.backActor.actorRelief)
    expect(applied.backerCauses[0].cause.kind).toBe('took_side')
    expect(states.kid.pressure?.irritation?.ledger).toHaveProperty('distress')
    expect(applied.upsetCauses[0].cause.kind).toBe('witnessed_conflict')
  })
})

describe('invariants', () => {
  it('across bonds, traits, ages and intensities: every side taken has a cause, no child ever steps in, Off never does', () => {
    let taken = 0
    for (const intensity of DRAMA_INTENSITIES) {
      for (const age of [undefined, 9, 17, 18, 45]) {
        for (const traitIds of [[], ['trait-conflict-averse'], ['trait-protective'], ['trait-sensitive']]) {
          for (const forSara of [0, 0.3, 0.6, 0.9]) {
            for (const forTom of [0, 0.3, 0.6, 0.9]) {
              const states = scene({ forSara, forTom, age, traitIds, traits: traitIds })
              const outcomes = decideSides({ acts: [act(states)], states, intensity })
              const applied = outcomes.map((o) => applySideEffects(states, o, intensity))
              for (const [i, outcome] of outcomes.entries()) {
                for (const side of [outcome.intervener, ...outcome.backers]) {
                  if (!side) continue
                  taken++
                  expect(intensity).not.toBe('off')
                  expect(age === 18 || age === 45).toBe(true)
                  expect(side.notes).toBeDefined()
                }
                if (outcome.intervener) expect(applied[i].interveneCause?.factors.length).toBeGreaterThan(0)
                for (const b of applied[i].backerCauses) expect(b.cause.factors.length).toBeGreaterThan(0)
              }
            }
          }
        }
      }
    }
    expect(taken).toBeGreaterThan(0)
  })

  it('dispositions read from traits', () => {
    expect(sideDispositions(['trait-conflict-averse']).staysOut).toBe(true)
    expect(sideDispositions(['trait-protective']).quickToStepIn).toBe(true)
    expect(sideDispositions(['trait-sensitive']).upsetByConflict).toBe(true)
    expect(sideDispositions([])).toEqual({ staysOut: false, quickToStepIn: false, upsetByConflict: false })
  })
})
