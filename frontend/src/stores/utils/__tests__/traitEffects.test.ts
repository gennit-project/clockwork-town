import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { ACTION_EFFECTS } from '../../config/actionEffects'
import { NEED_DECAY_RATES } from '../../config/needs'
import { TRAIT_EFFECTS } from '../../config/traitEffects'
import {
  createMockCharacterState,
  createMockItemOccupancy,
  createMockNeeds,
  createMockWorldData,
  mockConsole
} from '../../__tests__/mockData'
import { computeCharacterHappiness } from '../happinessMetrics'
import { buildPlanCandidates } from '../intentPlanner'
import { executeTick, type ExecuteTickParams } from '../tickExecution'
import { effectiveDecayRate, getDisabledNeeds, isActionDisabled, isNeedDisabled, pinDisabledNeeds } from '../traitEffects'
import type { ActivityLogEntry, CharacterState } from '../../types'

mockConsole()

const LITTLE_SLEEP = 'trait-needs-little-sleep'
const LOTS_SLEEP = 'trait-needs-lots-of-sleep'
const ASEXUAL = 'trait-asexual'
const AROMANTIC = 'trait-aromantic'

describe('trait effect helpers', () => {
  it('uses the base rate with no traits and for unknown or display-only trait ids', () => {
    expect(effectiveDecayRate('sleep')).toBe(NEED_DECAY_RATES.sleep)
    expect(effectiveDecayRate('sleep', ['trait-curious', 'whatever'])).toBe(NEED_DECAY_RATES.sleep)
  })

  it('scales only the affected need', () => {
    expect(effectiveDecayRate('sleep', [LITTLE_SLEEP])).toBeCloseTo(NEED_DECAY_RATES.sleep * 0.5)
    expect(effectiveDecayRate('food', [LITTLE_SLEEP])).toBe(NEED_DECAY_RATES.food)
  })

  it('stacks multipliers from several traits', () => {
    const both = effectiveDecayRate('sleep', [LITTLE_SLEEP, LOTS_SLEEP])
    expect(both).toBeCloseTo(NEED_DECAY_RATES.sleep * 0.5 * 1.5)
  })

  it('reports disabled needs and the trait responsible', () => {
    expect(getDisabledNeeds([ASEXUAL, AROMANTIC])).toEqual({ romance: ASEXUAL })
    expect(isNeedDisabled('romance', [AROMANTIC])).toBe(true)
    expect(isNeedDisabled('food', [AROMANTIC])).toBe(false)
    expect(getDisabledNeeds()).toEqual({})
  })

  it('disables exactly the actions that serve a disabled need', () => {
    const romanceActions = Object.entries(ACTION_EFFECTS)
      .filter(([, effect]) => effect.primaryNeed === 'romance')
      .map(([name]) => name)
    expect(romanceActions.length).toBeGreaterThan(0)
    for (const name of romanceActions) {
      expect(isActionDisabled(name as keyof typeof ACTION_EFFECTS, [ASEXUAL])).toBe(true)
    }
    expect(isActionDisabled('eat', [ASEXUAL])).toBe(false)
    expect(isActionDisabled('chat_friend', [ASEXUAL])).toBe(false)
    expect(isActionDisabled('idle', [ASEXUAL])).toBe(false)
  })

  it('pins disabled needs to full and leaves the rest', () => {
    const needs = createMockNeeds({ romance: 0.1, food: 0.4 })
    pinDisabledNeeds(needs, [ASEXUAL])
    expect(needs.romance).toBe(1)
    expect(needs.food).toBe(0.4)
  })

  it('only references need names that exist', () => {
    const needs = Object.keys(createMockNeeds())
    for (const effect of Object.values(TRAIT_EFFECTS)) {
      for (const need of [...Object.keys(effect.decayMultipliers ?? {}), ...(effect.disablesNeeds ?? [])]) {
        expect(needs).toContain(need)
      }
    }
  })
})

describe('happiness with disabled needs', () => {
  it('excludes disabled needs from the mean', () => {
    const needs = createMockNeeds({ romance: 1 })
    Object.assign(needs, { food: 0.2, sleep: 0.2, bladder: 0.2, hygiene: 0.2, health: 0.2, friends: 0.2, family: 0.2, fulfillment: 0.2 })
    expect(computeCharacterHappiness(needs)).toBeGreaterThan(0.2)
    expect(computeCharacterHappiness(needs, [ASEXUAL])).toBeCloseTo(0.2)
  })
})

describe('per-character decay in executeTick', () => {
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

  it('drains sleep slower with "needs little sleep" than for a baseline resident', async () => {
    const params = makeParams({
      base: createMockCharacterState({ needs: createMockNeeds({ sleep: 0.9 }) }),
      rested: createMockCharacterState({ needs: createMockNeeds({ sleep: 0.9 }), traitIds: [LITTLE_SLEEP] }),
      tired: createMockCharacterState({ needs: createMockNeeds({ sleep: 0.9 }), traitIds: [LOTS_SLEEP] })
    })
    for (let i = 0; i < 5; i++) await executeTick(params)

    const s = params.characterStates.value
    const lost = (id: string) => 0.9 - s[id].needs.sleep
    expect(lost('base')).toBeCloseTo(NEED_DECAY_RATES.sleep * 5, 4)
    expect(lost('rested')).toBeCloseTo(lost('base') * 0.5, 4)
    expect(lost('tired')).toBeCloseTo(lost('base') * 1.5, 4)
  })

  it('keeps a disabled need pinned at full across ticks', async () => {
    const params = makeParams({
      ace: createMockCharacterState({ needs: createMockNeeds({ romance: 0.2 }), traitIds: [ASEXUAL] })
    })
    for (let i = 0; i < 3; i++) await executeTick(params)
    expect(params.characterStates.value.ace.needs.romance).toBe(1)
  })
})

describe('planner and invitations', () => {
  // The default mock couch affords read/chat; let it host dates too.
  const dateWorld = () => {
    const world = createMockWorldData()
    world.items['item-1'].affordances.push({ action: 'date', weight: 1 })
    world.items['item-1'].allowedActivities.push('date')
    world.itemsByAffordance.date = ['item-1']
    return world
  }

  const buildGoals = (self: CharacterState, others: Record<string, CharacterState> = {}) =>
    new Set(
      buildPlanCandidates({
        characterId: 'me',
        characterState: self,
        worldData: dateWorld(),
        itemOccupancy: createMockItemOccupancy(),
        characterStates: { me: self, ...others }
      }).map((c) => c.goal)
    )

  const lonelyNeeds = () => createMockNeeds({ romance: 0 })

  it('control: a resident with no traits plans a date with an available partner', () => {
    const goals = buildGoals(createMockCharacterState({ needs: lonelyNeeds() }), {
      partner: createMockCharacterState({ name: 'Partner' })
    })
    expect(goals.has('date')).toBe(true)
  })

  it('offers no romance-need actions to a resident whose romance need is disabled', () => {
    const goals = buildGoals(
      createMockCharacterState({ needs: lonelyNeeds(), traitIds: [AROMANTIC] }),
      { partner: createMockCharacterState({ name: 'Partner' }) }
    )
    expect(goals.has('date')).toBe(false)
    for (const goal of goals) {
      expect(ACTION_EFFECTS[goal].primaryNeed).not.toBe('romance')
    }
    expect(goals.size).toBeGreaterThan(0)
  })

  it('does not target a social partner whose romance need is disabled', () => {
    const goals = buildGoals(createMockCharacterState({ needs: lonelyNeeds() }), {
      partner: createMockCharacterState({ name: 'Partner', traitIds: [ASEXUAL] })
    })
    expect(goals.has('date')).toBe(false)
  })

  describe('invitations', () => {
    async function runInvite(inviteeTraits: string[]) {
      const inviter = createMockCharacterState({ name: 'Inviter' })
      const invitee = createMockCharacterState({ name: 'Invitee', traitIds: inviteeTraits })
      inviter.queuedActions = [{
        goal: 'invite_over',
        strategy: 'invite_over:test',
        action: 'invite_over',
        utility: 5,
        socialTargetId: 'invitee',
        socialTargetName: 'Invitee',
        targetLotId: 'lot-1',
        targetLotName: 'Test House',
        targetSpaceId: 'space-1',
        targetSpaceName: 'Living Room',
        itemName: 'Couch',
        travelCost: 0
      }]
      const params: ExecuteTickParams = {
        currentTick: ref(0),
        characterStates: ref<Record<string, CharacterState>>({ inviter, invitee }),
        worldData: ref(createMockWorldData()),
        itemOccupancy: ref(createMockItemOccupancy()),
        activityLog: ref<ActivityLogEntry[]>([]),
        executeAction: vi.fn(async () => {}),
        progressTask: vi.fn(async () => false)
      }
      await executeTick(params)
      return params.activityLog.value.map((entry) => entry.action)
    }

    it('control: an invitee with no traits accepts', async () => {
      expect(await runInvite([])).toContain('accept_invite')
    })

    it('rejects a romance invitation for an invitee with a disabled romance need', async () => {
      const log = await runInvite([ASEXUAL])
      expect(log).toContain('reject_invite')
      expect(log).not.toContain('accept_invite')
    })
  })
})
