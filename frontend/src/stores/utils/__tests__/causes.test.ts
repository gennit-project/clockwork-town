import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  createMockCharacterState,
  createMockItemOccupancy,
  createMockNeeds,
  createMockWorldData,
  mockConsole
} from '../../__tests__/mockData'
import { buildDeclineCause, buildDisapprovalCause, buildIdleCause, formatCause } from '../causes'
import { selectBestIntent } from '../decisionMaking'
import { executeTick, type ExecuteTickParams } from '../tickExecution'
import { addGrievance } from '../witnessReactions'
import { evaluateGrievanceTickets } from '../ticketEvaluators'
import { getApprovalTopic } from '../../config/approvalTopics'
import type { ActivityLogEntry, CharacterState, Intent } from '../../types'

mockConsole()

describe('cause builders', () => {
  it('prefers_other names the need, its value and both utilities', () => {
    const cause = buildDeclineCause({
      reason: 'prefers_other',
      declinerName: 'B',
      action: 'chat_friend',
      competingAction: 'sleep',
      competingUtility: 2.9,
      invitationUtility: 1.1,
      declinerNeeds: createMockNeeds({ sleep: 0.04 })
    })
    expect(cause.kind).toBe('declined_invitation')
    expect(cause.summary).toBe('B wanted to sleep: sleep need 4% gave utility 2.9 vs 1.1 for the chat_friend')
    expect(cause.factors.map((f) => f.label)).toEqual(['sleep need', 'Utility of sleep', 'Utility of chat_friend'])
  })

  it('every decline reason yields a summary and at least one factor', () => {
    for (const reason of ['trait_disabled', 'unreachable', 'unavailable', 'prefers_other', 'cannot_coordinate'] as const) {
      const cause = buildDeclineCause({ reason, declinerName: 'B', action: 'date', competingAction: 'sleep', competingUtility: 1, invitationUtility: 0 })
      expect(cause.summary).toContain('B')
      expect(cause.factors.length).toBeGreaterThan(0)
    }
  })

  it('idle cause lists who declined and why', () => {
    const cause = buildIdleCause({ characterName: 'A', candidateCount: 1, declines: [{ name: 'B', action: 'chat_friend', reason: 'busy' }] })
    expect(cause.summary).toBe('A had plans but B turned them down')
    expect(cause.factors).toContainEqual({ label: 'B declined chat_friend', value: 'busy' })
    expect(buildIdleCause({ characterName: 'A', candidateCount: 0 }).summary).toBe('A had nothing available to do')
  })

  it('formatCause renders summary then one line per factor, with thresholds', () => {
    expect(formatCause({ kind: 'idle', summary: 's', factors: [{ label: 'x', value: 1 }, { label: 'y', value: 2, threshold: 3 }] })).toEqual([
      's',
      'x: 1',
      'y: 2 (threshold 3)'
    ])
  })
})

const emptyWorld = () => {
  const world = createMockWorldData()
  return Object.fromEntries(Object.entries(world).map(([key, value]) => [key, Array.isArray(value) ? [] : typeof value === 'object' && value ? {} : value])) as typeof world
}

describe('empty candidates', () => {
  it('idle with no candidates carries a cause; control: a real choice does not', () => {
    const state = createMockCharacterState({ name: 'A' })
    const empty = selectBestIntent({
      characterId: 'a',
      characterState: state,
      worldData: emptyWorld(),
      itemOccupancy: createMockItemOccupancy(),
      characterStates: { a: state }
    })
    expect(empty.action).toBe('idle')
    expect(empty.cause?.kind).toBe('idle')
    expect(empty.cause?.factors[0]).toEqual({ label: 'Candidate actions', value: 0 })
    const normal = selectBestIntent({
      characterId: 'a',
      characterState: createMockCharacterState({ name: 'A', needs: createMockNeeds({ food: 0 }) }),
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy(),
      characterStates: { a: state }
    })
    expect(normal.action).not.toBe('idle')
    expect(normal.cause).toBeUndefined()
  })
})

function setup(bNeeds: Record<string, number>, extra: Record<string, CharacterState> = {}) {
  const states: Record<string, CharacterState> = {
    a: createMockCharacterState({ name: 'A', needs: createMockNeeds({ friends: 0, food: 0.5 }) }),
    b: createMockCharacterState({ name: 'B', needs: createMockNeeds({ friends: 0, ...bNeeds }) }),
    ...extra
  }
  const executeAction = vi.fn(async (_id: string, _intent: Intent) => {})
  const params: ExecuteTickParams = {
    currentTick: ref(0),
    characterStates: ref(states),
    worldData: ref(createMockWorldData()),
    itemOccupancy: ref(createMockItemOccupancy()),
    activityLog: ref<ActivityLogEntry[]>([]),
    executeAction,
    progressTask: vi.fn(async () => false)
  }
  return { params, executeAction }
}

describe('declined invitations carry a cause', () => {
  it('control: an accepted invitation has no cause', async () => {
    const { params } = setup({})
    await executeTick(params)
    const accept = params.activityLog.value.find((e) => e.action === 'accept_invite')
    expect(accept).toBeDefined()
    expect(accept?.cause).toBeUndefined()
    expect(params.activityLog.value.some((e) => e.action === 'reject_invite')).toBe(false)
  })

  it('a declined invitation records the real needs and utilities, on the log and the invitation', async () => {
    const { params } = setup({ sleep: 0.04 })
    await executeTick(params)
    const reject = params.activityLog.value.find((e) => e.action === 'reject_invite')
    expect(reject?.details).toBe('B preferred sleep')
    expect(reject?.cause?.kind).toBe('declined_invitation')
    expect(reject?.cause?.summary).toMatch(/^B wanted to sleep: sleep need 4% gave utility [\d.]+ vs [\d.]+ for the chat_friend$/)
    const invitation = params.characterStates.value.a.outgoingSocialInvitations.find((i) => i.status === 'rejected')
    expect(invitation?.cause).toEqual(reject?.cause)
  })

  it('invariant: across a grid of invitee needs, every decline and every decided idle has a cause', async () => {
    const levels = [0, 0.04, 0.3, 0.7, 1]
    let declines = 0
    for (const sleep of levels) {
      for (const food of levels) {
        for (const friends of levels) {
          const { params, executeAction } = setup({ sleep, food, friends })
          await executeTick(params)
          for (const entry of params.activityLog.value.filter((e) => e.action === 'reject_invite')) {
            declines++
            expect(entry.cause?.factors.length, `${sleep}/${food}/${friends}`).toBeGreaterThan(0)
          }
          for (const [, intent] of executeAction.mock.calls) {
            if (intent.action === 'idle' && !intent.source) {
              expect(intent.cause?.factors.length, `idle ${sleep}/${food}/${friends}`).toBeGreaterThan(0)
            }
          }
        }
      }
    }
    expect(declines).toBeGreaterThan(0)
  })
})

describe('disapproval carries a cause', () => {
  it('the grievance and its ticket keep the witnessed act; control: no cause means none on the ticket', () => {
    const topic = getApprovalTopic('daytime-napping')
    expect(topic).toBeDefined()
    const witness = createMockCharacterState({ name: 'W' })
    const cause = buildDisapprovalCause({ witnessName: 'W', actorName: 'X', actSummary: topic!.phrase, topicId: topic!.id, stance: 'disapproves', tick: 7 })
    addGrievance(witness, { id: 'x', name: 'X' }, topic!, cause)
    expect(witness.grievances?.[0].cause).toEqual(cause)
    const tickets = evaluateGrievanceTickets({ states: { w: witness } } as never)
    expect(tickets[0].cause).toEqual(cause)

    const plain = createMockCharacterState({ name: 'W2' })
    addGrievance(plain, { id: 'x', name: 'X' }, topic!)
    expect(evaluateGrievanceTickets({ states: { w2: plain } } as never)[0].cause).toBeUndefined()
  })
})
