/**
 * Short per-target backoff after a rejected invitation, so an initiator tries
 * something else instead of re-issuing the same doomed invitation every tick.
 *
 * Backoff is keyed by action + target (turned down by Elena for chat_friend does not
 * stop them chatting with someone else, or inviting Elena to something different) and
 * counts down in ticks, like cooldowns.
 */

import type { ActionName, CharacterState } from '../types'

/** Ticks to leave a rejecting target alone for that action (6 ticks = 30 minutes). */
export const INVITE_REJECTION_BACKOFF_TICKS = 6

/** How many alternatives to try in one tick before giving up and idling. */
export const MAX_INVITE_ATTEMPTS_PER_TICK = 3

type BackoffHolder = Pick<CharacterState, 'inviteBackoff'>

export function inviteBackoffKey(action: ActionName, targetId: string): string {
  return `${action}:${targetId}`
}

export function backOffInvitation(
  state: BackoffHolder,
  action: ActionName,
  targetId: string,
  ticks: number = INVITE_REJECTION_BACKOFF_TICKS
): void {
  state.inviteBackoff = { ...state.inviteBackoff, [inviteBackoffKey(action, targetId)]: ticks }
}

export function isInvitationBackedOff(state: BackoffHolder, action: ActionName, targetId: string): boolean {
  return (state.inviteBackoff?.[inviteBackoffKey(action, targetId)] ?? 0) > 0
}

/** Count every backoff down by one tick, dropping the ones that have expired. */
export function tickInviteBackoff(state: BackoffHolder): void {
  if (!state.inviteBackoff) return
  const next: Record<string, number> = {}
  for (const [key, remaining] of Object.entries(state.inviteBackoff)) {
    if (remaining > 1) next[key] = remaining - 1
  }
  state.inviteBackoff = next
}
