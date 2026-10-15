import type { ActionName, Cause, CauseFactor, Needs } from '../types'
import { ACTION_EFFECTS } from '../config/actionEffects'

/**
 * Pure builders for auditable causes. Each takes the numbers the decision actually used, so a
 * cause is a record of the decision, not a story reconstructed later.
 */

const pct = (value: number): string => `${Math.round(value * 100)}%`
const fixed = (value: number): string => value.toFixed(1)

export type DeclineReason =
  | 'trait_disabled'
  | 'unreachable'
  | 'unavailable'
  | 'prefers_other'
  | 'cannot_coordinate'

export interface DeclineCauseInput {
  reason: DeclineReason
  declinerName: string
  action: ActionName
  /** Free text for 'unavailable' (asleep, working, ...). */
  availabilitySummary?: string
  /** For 'prefers_other': what they would rather do and the utilities compared. */
  competingAction?: ActionName
  competingUtility?: number
  invitationUtility?: number
  declinerNeeds?: Needs
}

export function buildDeclineCause(input: DeclineCauseInput): Cause {
  const { declinerName, action } = input
  switch (input.reason) {
    case 'trait_disabled':
      return {
        kind: 'declined_invitation',
        summary: `${declinerName}'s personality rules out ${action}`,
        factors: [{ label: `Trait disables ${action}`, value: 'yes' }]
      }
    case 'unreachable':
      return {
        kind: 'declined_invitation',
        summary: `${declinerName} had no way to reach the meeting place`,
        factors: [{ label: 'Route to meeting place', value: 'none' }]
      }
    case 'unavailable':
      return {
        kind: 'declined_invitation',
        summary: `${declinerName} was unavailable: ${input.availabilitySummary ?? 'busy'}`,
        factors: [{ label: 'Availability', value: input.availabilitySummary ?? 'busy' }]
      }
    case 'cannot_coordinate':
      return {
        kind: 'declined_invitation',
        summary: `${declinerName} agreed in principle, but the two could not line up their arrival`,
        factors: [{ label: 'Coordinated arrival', value: 'failed' }]
      }
    case 'prefers_other': {
      const factors: CauseFactor[] = []
      const competing = input.competingAction
      const need = competing ? ACTION_EFFECTS[competing]?.primaryNeed : undefined
      if (need && input.declinerNeeds) {
        factors.push({ label: `${need} need`, value: pct(input.declinerNeeds[need] ?? 0) })
      }
      if (input.competingUtility !== undefined) {
        factors.push({ label: `Utility of ${competing}`, value: fixed(input.competingUtility) })
      }
      if (input.invitationUtility !== undefined) {
        factors.push({
          label: `Utility of ${action}`,
          value: fixed(input.invitationUtility)
        })
      }
      const driver = need && input.declinerNeeds ? `wanted to ${competing}: ${need} need ${pct(input.declinerNeeds[need] ?? 0)}` : `wanted to ${competing}`
      const compare =
        input.competingUtility !== undefined && input.invitationUtility !== undefined
          ? ` gave utility ${fixed(input.competingUtility)} vs ${fixed(input.invitationUtility)} for the ${action}`
          : ''
      return {
        kind: 'declined_invitation',
        summary: `${declinerName} ${driver}${compare}`,
        factors
      }
    }
  }
}

export interface IdleCauseInput {
  characterName: string
  /** Candidates the planner produced before filtering. */
  candidateCount?: number
  /** Who turned down invitations this tick, with why (empty when nobody was asked). */
  declines?: { name: string; action: string; reason: string }[]
  /** Free-text planner notes (cooldowns, no accessible lots, ...). */
  notes?: string[]
}

export function buildIdleCause(input: IdleCauseInput): Cause {
  const declines = input.declines ?? []
  const factors: CauseFactor[] =
    input.candidateCount === undefined ? [] : [{ label: 'Candidate actions', value: input.candidateCount }]
  for (const decline of declines) {
    factors.push({ label: `${decline.name} declined ${decline.action}`, value: decline.reason })
  }
  for (const note of input.notes ?? []) {
    factors.push({ label: 'Note', value: note })
  }
  const summary =
    declines.length > 0
      ? `${input.characterName} had plans but ${[...new Set(declines.map((d) => d.name))].join(' and ')} turned them down`
      : (input.candidateCount ?? 0) === 0
        ? `${input.characterName} had nothing available to do`
        : `${input.characterName} found nothing worth doing`
  return { kind: 'idle', summary, factors }
}

export interface DisapprovalCauseInput {
  witnessName: string
  actorName: string
  actSummary: string
  topicId: string
  stance: string
  tick: number
}

export function buildDisapprovalCause(input: DisapprovalCauseInput): Cause {
  return {
    kind: 'disapproval',
    summary: `${input.witnessName} saw ${input.actorName} ${input.actSummary} and disapproves`,
    factors: [
      { label: 'Witnessed act', value: input.actSummary },
      { label: `${input.witnessName}'s stance on ${input.topicId}`, value: input.stance },
      { label: 'Witnessed at tick', value: input.tick }
    ]
  }
}

/** Plain-language lines for display: the summary, then one line per factor. */
export function formatCause(cause: Cause): string[] {
  return [
    cause.summary,
    ...cause.factors.map((f) =>
      f.threshold !== undefined ? `${f.label}: ${f.value} (threshold ${f.threshold})` : `${f.label}: ${f.value}`
    )
  ]
}

export interface PressureCauseInput {
  residentName: string
  meter: string
  value: number
  threshold: number
  /** Infinite when drama intensity is Off. */
  intensityLabel: string
  traitNames: string[]
  contributions: Array<{ label: string; amount: number }>
}

export function buildPressureCause(input: PressureCauseInput): Cause {
  const factors: CauseFactor[] = [
    { label: input.meter, value: fixed(input.value), ...(Number.isFinite(input.threshold) ? { threshold: Number(fixed(input.threshold)) } : {}) },
    ...input.contributions.map((c) => ({ label: c.label, value: fixed(c.amount * 100 / Math.max(input.value, 0.0001)) + '% of the total' })),
    { label: 'Drama intensity', value: input.intensityLabel }
  ]
  if (input.traitNames.length > 0) factors.push({ label: 'Dispositions', value: input.traitNames.join(', ') })
  return {
    kind: 'pressure',
    summary: `${input.residentName}'s ${input.meter} is ${fixed(input.value)} against a threshold of ${fixed(input.threshold)}`,
    factors
  }
}
