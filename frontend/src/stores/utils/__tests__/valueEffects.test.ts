import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { ACTION_EFFECTS } from '../../config/actionEffects'
import { VALUE_DEFS, VALUE_TUNING, valueWindowTicks } from '../../config/valueDefs'
import {
  createMockCharacterState,
  createMockItemOccupancy,
  createMockNeeds,
  createMockWorldData,
  mockConsole
} from '../../__tests__/mockData'
import { useSimulationStore } from '../../simulation'
import { buildPlanCandidates } from '../intentPlanner'
import { executeTick, type ExecuteTickParams } from '../tickExecution'
import {
  activeValues,
  describeAction,
  describeTicksAgo,
  isValueNeglected,
  markValuesFulfilled,
  rankWeight,
  tickValues,
  valueNeglectDrain,
  valueSatisfaction,
  valueUtilityBonus
} from '../valueEffects'
import { mergeValueSeed, toValueSeed } from '../valueSeed'
import type { ActivityLogEntry, CharacterState, CharacterValueState } from '../../types'

mockConsole()

const READ = 'value-read-books'
const ANIMALS = 'value-take-care-of-animals'
const FRIEND = 'value-be-a-good-friend'
const ROMANCE = 'value-romantic-relationship'

const val = (id: string, ticksSinceFulfilled = 0): CharacterValueState => ({ id, name: id, ticksSinceFulfilled })
const windowOf = (id: string) => valueWindowTicks(VALUE_DEFS[id])
/** Ticks past the point where the value counts as neglected. */
const neglectedTicks = (id: string) => windowOf(id) * (1 - VALUE_TUNING.neglectThreshold) + 1

describe('value config', () => {
  it('only references real actions and needs', () => {
    const needs = Object.keys(createMockNeeds())
    for (const def of Object.values(VALUE_DEFS)) {
      expect(def.actions.length).toBeGreaterThan(0)
      for (const action of def.actions) expect(ACTION_EFFECTS).toHaveProperty(action)
      if (def.requiresNeed) expect(needs).toContain(def.requiresNeed)
      expect(def.windowDays).toBeGreaterThan(0)
    }
  })
})

describe('satisfaction and neglect', () => {
  it('is 1 when fresh, 0.5 at half the window, and 0 at or past the window', () => {
    expect(valueSatisfaction(val(READ, 0))).toBe(1)
    expect(valueSatisfaction(val(READ, windowOf(READ) / 2))).toBeCloseTo(0.5)
    expect(valueSatisfaction(val(READ, windowOf(READ)))).toBe(0)
    expect(valueSatisfaction(val(READ, windowOf(READ) * 5))).toBe(0)
  })

  it('treats a value with no definition as fully satisfied', () => {
    expect(valueSatisfaction(val('value-unknown', 99999))).toBe(1)
  })

  it('flips to neglected just past the threshold', () => {
    const edge = windowOf(READ) * (1 - VALUE_TUNING.neglectThreshold)
    expect(isValueNeglected(val(READ, edge - 1))).toBe(false)
    expect(isValueNeglected(val(READ, edge + 1))).toBe(true)
  })

  it('weights rank geometrically', () => {
    expect(rankWeight(1)).toBe(1)
    expect(rankWeight(2)).toBeCloseTo(VALUE_TUNING.rankWeightFalloff)
    expect(rankWeight(3)).toBeCloseTo(VALUE_TUNING.rankWeightFalloff ** 2)
  })
})

describe('active values', () => {
  it('drops unknown values and values switched off by a trait, keeping original rank', () => {
    const state = { values: [val('value-unknown'), val(ROMANCE), val(READ)], traitIds: ['trait-aromantic'] }
    expect(activeValues(state).map((a) => [a.value.id, a.rank])).toEqual([[READ, 3]])
  })

  it('keeps the romantic value for a resident without the trait', () => {
    expect(activeValues({ values: [val(ROMANCE)], traitIds: [] })).toHaveLength(1)
  })
})

describe('ticking, drain and fulfillment', () => {
  it('ages every value by one tick', () => {
    const state = { values: [val(READ, 3), val(ANIMALS, 0)] }
    tickValues(state)
    expect(state.values.map((v) => v.ticksSinceFulfilled)).toEqual([4, 1])
  })

  it('drains nothing while values are satisfied', () => {
    expect(valueNeglectDrain({ values: [val(READ), val(ANIMALS)], traitIds: [] })).toBe(0)
  })

  it('drains the full rate for a neglected top value and a rank-weighted share for the next', () => {
    const top = { values: [val(READ, neglectedTicks(READ))], traitIds: [] }
    expect(valueNeglectDrain(top)).toBeCloseTo(VALUE_TUNING.drainPerTick)

    const second = { values: [val(ANIMALS), val(READ, neglectedTicks(READ))], traitIds: [] }
    expect(valueNeglectDrain(second)).toBeCloseTo(VALUE_TUNING.drainPerTick * VALUE_TUNING.rankWeightFalloff)
  })

  it('does not drain for a neglected value that a trait switched off', () => {
    const state = { values: [val(ROMANCE, neglectedTicks(ROMANCE))], traitIds: ['trait-asexual'] }
    expect(valueNeglectDrain(state)).toBe(0)
  })

  it('resets only the values the action fulfills', () => {
    const state = { values: [val(READ, 50), val(FRIEND, 50), val(ANIMALS, 50)] }
    expect(markValuesFulfilled(state, 'read')).toEqual([READ])
    expect(state.values.map((v) => v.ticksSinceFulfilled)).toEqual([0, 50, 50])
    expect(markValuesFulfilled(state, 'invite_over')).toEqual([FRIEND])
    expect(markValuesFulfilled(state, 'eat')).toEqual([])
  })
})

describe('planner nudge', () => {
  const holder = (values: CharacterValueState[], needs = createMockNeeds()) => ({ values, traitIds: [], needs })

  it('is zero for satisfied values, non-matching actions, and unknown values', () => {
    expect(valueUtilityBonus(holder([val(READ, 1)]), 'read')).toBe(0)
    expect(valueUtilityBonus(holder([val(READ, neglectedTicks(READ))]), 'eat')).toBe(0)
    expect(valueUtilityBonus(holder([val('value-unknown', 99999)]), 'read')).toBe(0)
  })

  it('grows with neglect and is larger for a higher-ranked value', () => {
    const wholeWindow = windowOf(READ)
    const some = valueUtilityBonus(holder([val(READ, neglectedTicks(READ))]), 'read')
    const full = valueUtilityBonus(holder([val(READ, wholeWindow)]), 'read')
    expect(some).toBeGreaterThan(0)
    expect(full).toBeGreaterThan(some)
    expect(full).toBeCloseTo(VALUE_TUNING.plannerBonusMax)

    const rank2 = valueUtilityBonus(holder([val(ANIMALS), val(READ, wholeWindow)]), 'read')
    expect(rank2).toBeLessThan(full)
  })

  it('shrinks while basic or emotional needs are unsatisfied, and recovers when they are met', () => {
    const neglected = [val(READ, windowOf(READ))]
    const content = valueUtilityBonus(holder(neglected), 'read')
    const starving = valueUtilityBonus(
      holder(neglected, createMockNeeds({ food: 0, sleep: 0, bladder: 0, hygiene: 0, health: 0 })),
      'read'
    )
    const lonely = valueUtilityBonus(holder(neglected, createMockNeeds({ friends: 0, family: 0, romance: 0 })), 'read')
    expect(starving).toBeCloseTo(content * VALUE_TUNING.lockedBonusMultiplier)
    expect(lonely).toBeCloseTo(content * VALUE_TUNING.lockedBonusMultiplier)
    expect(valueUtilityBonus(holder(neglected, createMockNeeds()), 'read')).toBeCloseTo(content)
  })

  it('raises the utility of a candidate that serves a neglected value (with a control)', () => {
    const readUtility = (values: CharacterValueState[]) => {
      const state = createMockCharacterState({ values })
      const candidates = buildPlanCandidates({
        characterId: 'me',
        characterState: state,
        worldData: createMockWorldData(),
        itemOccupancy: createMockItemOccupancy(),
        characterStates: { me: state }
      })
      return Math.max(...candidates.filter((c) => c.goal === 'read').map((c) => c.utility))
    }
    const control = readUtility([val(READ, 0)])
    const neglected = readUtility([val(READ, windowOf(READ))])
    expect(Number.isFinite(control)).toBe(true)
    expect(neglected).toBeCloseTo(control + VALUE_TUNING.plannerBonusMax)
  })
})

describe('executeTick', () => {
  function makeParams(states: Record<string, CharacterState>): ExecuteTickParams {
    return {
      currentTick: ref(0),
      characterStates: ref(states),
      worldData: ref(createMockWorldData()),
      itemOccupancy: ref(createMockItemOccupancy()),
      activityLog: ref<ActivityLogEntry[]>([]),
      executeAction: vi.fn(async () => {}),
      progressTask: vi.fn(async () => false)
    }
  }

  it('drains fulfillment faster for a resident with a neglected value, and ages values', async () => {
    const needs = () => createMockNeeds({ fulfillment: 0.8 })
    const params = makeParams({
      plain: createMockCharacterState({ needs: needs() }),
      content: createMockCharacterState({ needs: needs(), values: [val(READ, 0)] }),
      neglected: createMockCharacterState({ needs: needs(), values: [val(READ, windowOf(READ))] })
    })
    await executeTick(params)

    const s = params.characterStates.value
    expect(s.content.needs.fulfillment).toBeCloseTo(s.plain.needs.fulfillment)
    expect(s.plain.needs.fulfillment - s.neglected.needs.fulfillment).toBeCloseTo(VALUE_TUNING.drainPerTick, 5)
    expect(s.content.values[0].ticksSinceFulfilled).toBe(1)
  })
})

describe('applyActionEffects via the store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('resets the matching value when a mapped action completes', () => {
    const store = useSimulationStore()
    store.initializeCharacter({
      id: 'c1',
      name: 'Reader',
      values: [val(READ, 40), val(ANIMALS, 40)]
    })
    store.applyActionEffects({
      characterId: 'c1',
      intent: { goal: 'read', strategy: 'test', action: 'read', utility: 1, travelCost: 0 } as never
    })
    const values = store.characterStates.c1.values
    expect(values.find((v) => v.id === READ)?.ticksSinceFulfilled).toBe(0)
    expect(values.find((v) => v.id === ANIMALS)?.ticksSinceFulfilled).toBe(40)
  })
})

describe('current target name via the store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const complete = (store: ReturnType<typeof useSimulationStore>, intent: Record<string, unknown>) =>
    store.applyActionEffects({
      characterId: 'c1',
      intent: { goal: 'read', strategy: 'test', utility: 1, travelCost: 0, ...intent } as never
    })

  it('records what the completed action was aimed at, and replaces it with the next action\'s', () => {
    const store = useSimulationStore()
    store.initializeCharacter({ id: 'c1', name: 'Viewer' })

    complete(store, { action: 'view_art', itemName: 'Sunflower painting' })
    expect(store.characterStates.c1.currentTargetName).toBe('Sunflower painting')

    complete(store, { action: 'chat_friend', socialTargetName: 'Bob' })
    expect(store.characterStates.c1.currentTargetName).toBe('Bob')

    complete(store, { action: 'pet_animal', animalTargetName: 'Diego' })
    expect(store.characterStates.c1.currentTargetName).toBe('Diego')

    complete(store, { action: 'eat' })
    expect(store.characterStates.c1.currentTargetName).toBeNull()
  })
})

describe('value seed helpers', () => {
  it('starts every value freshly fulfilled and keeps rank order', () => {
    const { values } = toValueSeed([{ id: READ, name: 'Read' }, { id: ANIMALS, name: 'Animals' }])
    expect(values.map((v) => [v.id, v.ticksSinceFulfilled])).toEqual([[READ, 0], [ANIMALS, 0]])
    expect(toValueSeed(undefined).values).toEqual([])
  })

  it('keeps existing clocks on reload, takes the new order, and starts new values fresh', () => {
    const merged = mergeValueSeed(
      [val(ANIMALS), val(FRIEND), val(READ)],
      [val(READ, 77), val(ANIMALS, 12)]
    )
    expect(merged.map((v) => [v.id, v.ticksSinceFulfilled])).toEqual([[ANIMALS, 12], [FRIEND, 0], [READ, 77]])
  })
})

describe('labels', () => {
  it('describes elapsed time in hours and days (12 ticks = 1 hour)', () => {
    expect(describeTicksAgo(0)).toBe('just now')
    expect(describeTicksAgo(11)).toBe('just now')
    expect(describeTicksAgo(12)).toBe('1h ago')
    expect(describeTicksAgo(12 * 23)).toBe('23h ago')
    expect(describeTicksAgo(288)).toBe('1d ago')
    expect(describeTicksAgo(288 + 12 * 4)).toBe('1d 4h ago')
  })

  it('turns an action name into words', () => {
    expect(describeAction('call_mom')).toBe('call mom')
  })
})
