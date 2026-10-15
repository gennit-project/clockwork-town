/**
 * Relationship event evaluators. Each evaluator looks at a pair of residents who just
 * met and their temporal relationship data, and returns an event (or nothing). Memories,
 * relationship changes and notifications all come from these, so one piece of data (last
 * seen, scores) can power many behaviors. Nothing here is specific to a species or person.
 */

import type { CharacterRelationship, CharacterState } from '../types'

/** Minutes apart before meeting again counts as a reunion (6 hours). */
export const REUNION_ABSENCE_THRESHOLD_MINUTES = 6 * 60

/** Average long-term score at which a reunion is a hug rather than a quiet "saw them again". */
export const REUNION_HUG_MIN_SCORE = 0.5

export interface RelationshipEventContext {
  characterState: CharacterState
  targetState: CharacterState
  forward: CharacterRelationship
  reverse: CharacterRelationship
  /** Minutes since each side last saw the other; null when never seen. */
  minutesApart: { forward: number | null; reverse: number | null }
}

export interface RelationshipEvent {
  /** Memory event type and RELATIONSHIP_EVENT_SCORES key. */
  type: string
  forwardMemory: string
  reverseMemory: string
  /** Worth telling the player about (log stream + recent events feed). */
  notable: boolean
  logMessage?: string
}

export type RelationshipEventEvaluator = (context: RelationshipEventContext) => RelationshipEvent | null

export function formatElapsedHours(minutes: number): string {
  const hours = minutes / 60
  return hours === 1 ? '1 hour' : `${Math.round(hours)} hours`
}

/** Meeting again after a long absence; a warm relationship makes it a hug. */
export const evaluateReunion: RelationshipEventEvaluator = ({
  characterState,
  targetState,
  forward,
  reverse,
  minutesApart
}) => {
  const longestAbsence = Math.max(minutesApart.forward ?? 0, minutesApart.reverse ?? 0)
  if (longestAbsence < REUNION_ABSENCE_THRESHOLD_MINUTES) return null

  const elapsed = formatElapsedHours(longestAbsence)
  const warmth = (forward.longTermScore + reverse.longTermScore) / 2
  if (warmth >= REUNION_HUG_MIN_SCORE) {
    return {
      type: 'reunited_after_long_absence',
      forwardMemory: `Hugged ${targetState.name} after ${elapsed} apart.`,
      reverseMemory: `Hugged ${characterState.name} after ${elapsed} apart.`,
      notable: true,
      logMessage: `${characterState.name} and ${targetState.name} hugged after ${elapsed} apart.`
    }
  }

  return {
    type: 'reunited_after_long_absence',
    forwardMemory: `Saw ${targetState.name} again after ${elapsed} apart.`,
    reverseMemory: `Saw ${characterState.name} again after ${elapsed} apart.`,
    notable: false
  }
}

/** Add new evaluators here; each one runs for every pair that meets. */
export const RELATIONSHIP_EVENT_EVALUATORS: RelationshipEventEvaluator[] = [evaluateReunion]

export function evaluateRelationshipEvents(
  context: RelationshipEventContext,
  evaluators: RelationshipEventEvaluator[] = RELATIONSHIP_EVENT_EVALUATORS
): RelationshipEvent[] {
  return evaluators.map((evaluate) => evaluate(context)).filter((event): event is RelationshipEvent => event !== null)
}
