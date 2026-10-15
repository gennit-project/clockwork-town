import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  createMockCharacterState,
  createMockItemOccupancy,
  createMockNeeds,
  createMockWorldData,
  mockConsole
} from '../../__tests__/mockData'
import {
  backOffInvitation,
  INVITE_REJECTION_BACKOFF_TICKS,
  inviteBackoffKey,
  isInvitationBackedOff,
  MAX_INVITE_ATTEMPTS_PER_TICK,
  tickInviteBackoff
} from '../inviteBackoff'
import { buildPlanCandidates } from '../intentPlanner'
import { executeTick, type ExecuteTickParams } from '../tickExecution'
import type { ActivityLogEntry, CharacterState, Intent } from '../../types'

mockConsole()

describe('invite backoff helpers', () => {
  it('is keyed by action and target', () => {
    expect(inviteBackoffKey('chat_friend', 'b')).toBe('chat_friend:b')
    const state: Pick<CharacterState, 'inviteBackoff'> = {}
    backOffInvitation(state, 'chat_friend', 'b')
    expect(isInvitationBackedOff(state, 'chat_friend', 'b')).toBe(true)
    expect(isInvitationBackedOff(state, 'chat_friend', 'c')).toBe(false)
    expect(isInvitationBackedOff(state, 'invite_over', 'b')).toBe(false)
  })

  it('counts down each tick and expires after the configured number of ticks', () => {
    const state: Pick<CharacterState, 'inviteBackoff'> = {}
    backOffInvitation(state, 'date', 'b')
    for (let i = 1; i < INVITE_REJECTION_BACKOFF_TICKS; i++) {
      tickInviteBackoff(state)
      expect(isInvitationBackedOff(state, 'date', 'b')).toBe(true)
    }
    tickInviteBackoff(state)
    expect(isInvitationBackedOff(state, 'date', 'b')).toBe(false)
    expect(state.inviteBackoff).toEqual({})
  })

  it('tolerates a character with no backoff yet', () => {
    const state: Pick<CharacterState, 'inviteBackoff'> = {}
    expect(() => tickInviteBackoff(state)).not.toThrow()
    expect(isInvitationBackedOff(state, 'chat_friend', 'b')).toBe(false)
  })
})

describe('planner skips backed-off invitations', () => {
  const chatTargets = (self: CharacterState, others: Record<string, CharacterState>) =>
    new Set(
      buildPlanCandidates({
        characterId: 'a',
        characterState: self,
        worldData: createMockWorldData(),
        itemOccupancy: createMockItemOccupancy(),
        characterStates: { a: self, ...others }
      })
        .filter((c) => c.goal === 'chat_friend')
        .map((c) => c.primaryStep.socialTargetId)
    )

  it('drops only the backed-off target (with a control)', () => {
    const others = { b: createMockCharacterState({ name: 'B' }), c: createMockCharacterState({ name: 'C' }) }
    const self = createMockCharacterState({ needs: createMockNeeds({ friends: 0 }) })
    expect(chatTargets(self, others)).toEqual(new Set(['b', 'c']))

    backOffInvitation(self, 'chat_friend', 'b')
    expect(chatTargets(self, others)).toEqual(new Set(['c']))
  })
})

describe('rejected invitations in executeTick', () => {
  function setup(opts: { bAccepts: boolean; withC?: boolean }) {
    const lonely = createMockNeeds({ friends: 0, food: 0.5 })
    const states: Record<string, CharacterState> = {
      a: createMockCharacterState({ name: 'A', needs: lonely }),
      // B is the most attractive partner (lonely too) but turns the invitation down because
      // wanting sleep far outweighs chatting.
      b: createMockCharacterState({
        name: 'B',
        needs: createMockNeeds(opts.bAccepts ? { friends: 0 } : { sleep: 0, friends: 0 })
      })
    }
    if (opts.withC) {
      states.c = createMockCharacterState({ name: 'C', needs: createMockNeeds({ friends: 0.9 }) })
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
    const intentFor = (characterId: string, call = 0) =>
      executeAction.mock.calls.filter(([id]) => id === characterId)[call]?.[1] as Intent
    const count = (action: string, characterId?: string) =>
      params.activityLog.value.filter((e) => e.action === action && (!characterId || e.characterId === characterId)).length
    return { params, intentFor, count }
  }

  it('control: an accepted invitation puts both residents into the chat', async () => {
    const { params, intentFor, count } = setup({ bAccepts: true })
    await executeTick(params)
    expect(count('accept_invite')).toBe(1)
    expect(intentFor('a').action).toBe('chat_friend')
    expect(intentFor('b').action).toBe('chat_friend')
  })

  it('falls through to the next-best option in the same tick instead of idling', async () => {
    const { params, intentFor, count } = setup({ bAccepts: false })
    await executeTick(params)
    expect(count('reject_invite')).toBeGreaterThan(0)
    const intent = intentFor('a')
    expect(intent.action).not.toBe('idle')
    expect(intent.action).not.toBe('chat_friend')
    expect(params.characterStates.value.a.inviteBackoff).toHaveProperty('chat_friend:b')
  })

  it('does not re-issue the rejected invitation until the backoff expires', async () => {
    const { params, count } = setup({ bAccepts: false })
    await executeTick(params)
    const invitesAfterFirst = count('invite', 'a')
    expect(invitesAfterFirst).toBe(1)

    // Ticks 2..INVITE_REJECTION_BACKOFF_TICKS: still backed off.
    for (let tick = 2; tick <= INVITE_REJECTION_BACKOFF_TICKS; tick++) {
      await executeTick(params)
    }
    expect(count('invite', 'a')).toBe(invitesAfterFirst)

    // The next tick the backoff has expired, so the same invitation is tried again.
    await executeTick(params)
    expect(count('invite', 'a')).toBe(invitesAfterFirst + 1)
  })

  it('tries a different partner in the same tick after being turned down', async () => {
    const { params, count } = setup({ bAccepts: false, withC: true })
    await executeTick(params)
    const invitedByA = params.activityLog.value
      .filter((e) => e.action === 'invite' && e.characterId === 'a')
      .map((e) => e.details)
    expect(invitedByA).toEqual(['A invited B to chat_friend', 'A invited C to chat_friend'])
    expect(count('reject_invite')).toBeGreaterThanOrEqual(1)
    expect(params.characterStates.value.a.inviteBackoff).toHaveProperty('chat_friend:b')
  })

  it('stops after a bounded number of attempts rather than looping forever', async () => {
    const { params, count } = setup({ bAccepts: false })
    await executeTick(params)
    expect(count('invite', 'a')).toBeLessThanOrEqual(MAX_INVITE_ATTEMPTS_PER_TICK)
  })
})
