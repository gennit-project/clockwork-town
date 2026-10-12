/**
 * Ticket candidate evaluators. They report conditions that currently warrant a ticket;
 * ticketLifecycle decides whether that opens, keeps or closes an actual ticket.
 */

import { SERVICE_DESK_THRESHOLDS } from '../../config/serviceDesk'
import type { CharacterState, NeedName, TicketCandidate } from '../types'
import { lowNeedKey, type ServiceDeskTrackers } from './serviceDeskTrackers'
import { activeValues, valueSatisfaction } from './valueEffects'

export interface TicketContext {
  tick: number
  states: Record<string, CharacterState>
  trackers: ServiceDeskTrackers
}

export type TicketEvaluator = (ctx: TicketContext) => TicketCandidate[]

/** Unmet want: a need that has stayed critically low for a sustained period. */
export const evaluateUnmetNeeds: TicketEvaluator = ({ tick, states, trackers }) => {
  const candidates: TicketCandidate[] = []
  for (const [characterId, state] of Object.entries(states)) {
    for (const need of Object.keys(state.needs) as NeedName[]) {
      const since = trackers.lowNeedSince[lowNeedKey(characterId, need)]
      if (since === undefined) continue
      if (tick - since < SERVICE_DESK_THRESHOLDS.ticketSustainedTicks) continue
      candidates.push({
        key: `unmet-need:${characterId}:${need}`,
        rule: 'unmet-need',
        severity: 'critical',
        characterId,
        characterName: state.name,
        title: `${state.name}'s ${need} need is going unmet`
      })
    }
  }
  return candidates
}

/** A value neglected for its whole window: the resident needs help meeting it. */
export const evaluateNeglectedValueTickets: TicketEvaluator = ({ states }) => {
  const candidates: TicketCandidate[] = []
  for (const [characterId, state] of Object.entries(states)) {
    for (const { value } of activeValues(state)) {
      if (valueSatisfaction(value) > 0) continue
      candidates.push({
        key: `value-neglect:${characterId}:${value.id}`,
        rule: 'value-neglect',
        severity: 'warning',
        characterId,
        characterName: state.name,
        title: `${state.name} hasn't been able to live their value: ${value.name}`
      })
    }
  }
  return candidates
}

export const TICKET_EVALUATORS: TicketEvaluator[] = [evaluateUnmetNeeds, evaluateNeglectedValueTickets]

export function evaluateTicketCandidates(
  ctx: TicketContext,
  evaluators: TicketEvaluator[] = TICKET_EVALUATORS
): TicketCandidate[] {
  return evaluators.flatMap((evaluate) => evaluate(ctx))
}
