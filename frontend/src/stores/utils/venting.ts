/**
 * Being upset and what to do about it. A resident holding grievances (see witnessReactions.ts)
 * wants to complain to a friend, who is not the person they're upset with, and may comfort-eat.
 * Both bring relief: the grievance fades sooner, never instantly.
 */

import { VENTING } from '../config/social'
import type { CharacterState, Grievance } from '../types'
import { isTierUnlocked } from './needGating'

type Upsettable = Pick<CharacterState, 'grievances'>

/** Grievances they haven't talked over yet. */
export const unventedGrievances = (state: Upsettable): Grievance[] => (state.grievances ?? []).filter((g) => !g.vented)

export const isUpset = (state: Upsettable): boolean => unventedGrievances(state).length > 0

/**
 * Could they complain to this person? They need a good relationship with them, and something to
 * complain about that isn't them.
 */
export function canVentTo(
  venter: Pick<CharacterState, 'grievances' | 'relationships'>,
  listenerId: string
): boolean {
  const relationship = venter.relationships?.find((rel) => rel.toCharacterId === listenerId)
  if (!relationship || relationship.isDeceasedTarget) return false
  if (relationship.longTermScore < VENTING.friendMinLongTerm) return false
  return unventedGrievances(venter).some((g) => g.aboutCharacterId !== listenerId)
}

/**
 * Planner nudge toward venting: a chat whose main partner is a friend they can complain to, while
 * upset. It shrinks if the resident's basics aren't met (an upset, starving person still eats first).
 */
export function ventingChatBonus(
  state: Pick<CharacterState, 'grievances' | 'relationships' | 'needs'>,
  partnerId: string | undefined
): number {
  if (!partnerId || !canVentTo(state, partnerId)) return 0
  return isTierUnlocked('emotional', state.needs) ? VENTING.chatBonus : VENTING.chatBonus * 0.1
}

/** Planner nudge toward comfort food while upset. */
export const comfortEatBonus = (state: Upsettable): number => (isUpset(state) ? VENTING.comfortEatBonus : 0)

/**
 * They complain to this listener about everything they hold that isn't against the listener:
 * those grievances are marked as talked over and fade sooner. Returns what was vented.
 */
export function ventGrievances(venter: Pick<CharacterState, 'grievances'>, listenerId: string): Grievance[] {
  const vented: Grievance[] = []
  venter.grievances = (venter.grievances ?? []).map((g) => {
    if (g.vented || g.aboutCharacterId === listenerId) return g
    const next = { ...g, vented: true, ticksRemaining: Math.max(1, Math.floor(g.ticksRemaining * VENTING.ventedRemainingFraction)) }
    vented.push(next)
    return next
  })
  return vented
}

/** A comfort meal takes a little of the edge off every grievance. */
export function comfortFromEating(state: Pick<CharacterState, 'grievances'>): void {
  if (!state.grievances?.length) return
  state.grievances = state.grievances.map((g) => ({
    ...g,
    ticksRemaining: Math.max(1, Math.floor(g.ticksRemaining * VENTING.comfortRemainingFraction))
  }))
}
