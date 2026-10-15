/**
 * Ticket candidate evaluators. They report conditions that currently warrant a ticket;
 * ticketLifecycle decides whether that opens, keeps or closes an actual ticket.
 */

import { SERVICE_DESK_THRESHOLDS } from '../../config/serviceDesk'
import type { CharacterState, NeedName, TicketCandidate } from '../types'
import { lowNeedKey, type ServiceDeskTrackers } from './serviceDeskTrackers'
import { activeValues, valueSatisfaction } from './valueEffects'
import { DEFAULT_DRAMA_INTENSITY, PRESSURE_METERS, type DramaIntensity } from '../config/pressure'
import { TRAIT_EFFECTS } from '../config/traitEffects'
import { buildPressureCause } from './causes'
import { meterEnabled, readPressure } from './pressure'

export interface TicketContext {
  tick: number
  states: Record<string, CharacterState>
  trackers: ServiceDeskTrackers
  /** Drama intensity; scales pressure thresholds (default: normal). */
  dramaIntensity?: DramaIntensity
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

/** Someone is holding something against someone else (see witnessReactions.ts). */
export const evaluateGrievanceTickets: TicketEvaluator = ({ states }) => {
  const candidates: TicketCandidate[] = []
  for (const [characterId, state] of Object.entries(states)) {
    for (const grievance of state.grievances ?? []) {
      candidates.push({
        key: `grievance:${characterId}:${grievance.aboutCharacterId}:${grievance.topicId}`,
        rule: 'grievance',
        severity: 'warning',
        characterId,
        characterName: state.name,
        title: `${state.name} disapproves of ${grievance.aboutName} ${grievance.summary}`,
        ...(grievance.cause ? { cause: grievance.cause } : {})
      })
    }
  }
  return candidates
}

/** Someone's irritation (or jealousy) is over their line. Never fires at drama intensity Off. */
export const evaluatePressureTickets: TicketEvaluator = ({ states, dramaIntensity = DEFAULT_DRAMA_INTENSITY }) => {
  const candidates: TicketCandidate[] = []
  for (const [characterId, state] of Object.entries(states)) {
    for (const meter of PRESSURE_METERS) {
      if (!meterEnabled(state.traitIds, meter)) continue
      const reading = readPressure(state, meter, dramaIntensity)
      if (!reading.over) continue
      const dispositionNames = (state.traitIds ?? [])
        .map((id, i) => (TRAIT_EFFECTS[id]?.pressure ? state.traits[i] ?? id : null))
        .filter((name): name is string => !!name)
      candidates.push({
        key: `pressure:${characterId}:${meter}`,
        rule: 'pressure',
        severity: 'warning',
        characterId,
        characterName: state.name,
        title: `${state.name}'s ${meter} is over the line`,
        cause: buildPressureCause({
          residentName: state.name,
          meter,
          value: reading.value,
          threshold: reading.threshold,
          intensityLabel: dramaIntensity,
          traitNames: dispositionNames,
          contributions: reading.contributions
        })
      })
    }
  }
  return candidates
}
export const TICKET_EVALUATORS: TicketEvaluator[] = [
  evaluateUnmetNeeds,
  evaluateNeglectedValueTickets,
  evaluateGrievanceTickets,
  evaluatePressureTickets
]

export function evaluateTicketCandidates(
  ctx: TicketContext,
  evaluators: TicketEvaluator[] = TICKET_EVALUATORS
): TicketCandidate[] {
  return evaluators.flatMap((evaluate) => evaluate(ctx))
}
