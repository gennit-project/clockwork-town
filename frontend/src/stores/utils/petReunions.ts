/**
 * Pet reunions: the animal counterpart of the human reunion evaluator. Tracks when an
 * owner and their pet are on the same lot, and when they meet again after a long absence
 * an evaluator turns that into an event (memory, notification, a little affection).
 * Nothing here is specific to a species or a particular pet.
 */

import { PET_GREETING_MIN_AFFECTION, PET_QUIET_TRAITS, PET_REUNION_AFFECTION_BOOST } from '../config/animalConfig'
import type { AnimalState, CharacterState } from '../types'
import { formatElapsedHours, REUNION_ABSENCE_THRESHOLD_MINUTES } from './relationshipEvents'

export const PET_REUNION_EVENT_TYPE = 'pet_reunion'

export interface PetReunionContext {
  owner: CharacterState
  animal: AnimalState
  minutesApart: number
}

export interface PetEvent {
  type: string
  /** Memory for the owner (animals don't keep memories). */
  ownerMemory: string
  notable: boolean
  logMessage?: string
  /** Affection the pet regains from the meeting. */
  affectionBoost: number
}

export type PetEventEvaluator = (context: PetReunionContext) => PetEvent | null

/** A pet meeting its owner again after a long absence; a warm, un-aloof pet greets them. */
export const evaluatePetReunion: PetEventEvaluator = ({ owner, animal, minutesApart }) => {
  if (minutesApart < REUNION_ABSENCE_THRESHOLD_MINUTES) return null

  const elapsed = formatElapsedHours(minutesApart)
  const reserved = animal.traits.some((trait) => PET_QUIET_TRAITS.includes(trait))
  if (!reserved && animal.needs.affection >= PET_GREETING_MIN_AFFECTION) {
    return {
      type: PET_REUNION_EVENT_TYPE,
      ownerMemory: `Was greeted by ${animal.name} after ${elapsed} apart.`,
      notable: true,
      logMessage: `${animal.name} greeted ${owner.name} after ${elapsed} apart.`,
      affectionBoost: PET_REUNION_AFFECTION_BOOST
    }
  }

  return {
    type: PET_REUNION_EVENT_TYPE,
    ownerMemory: `Saw ${animal.name} again after ${elapsed} apart.`,
    notable: false,
    affectionBoost: 0
  }
}

/** Add new pet evaluators here; each one runs whenever an owner and pet meet again. */
export const PET_EVENT_EVALUATORS: PetEventEvaluator[] = [evaluatePetReunion]

export function evaluatePetEvents(
  context: PetReunionContext,
  evaluators: PetEventEvaluator[] = PET_EVENT_EVALUATORS
): PetEvent[] {
  return evaluators.map((evaluate) => evaluate(context)).filter((event): event is PetEvent => event !== null)
}

function minutesBetween(fromIso: string, toIso: string): number | null {
  const from = new Date(fromIso).getTime()
  const to = new Date(toIso).getTime()
  if (Number.isNaN(from) || Number.isNaN(to)) return null
  return Math.max(0, Math.round((to - from) / 60000))
}

/**
 * Update an animal's togetherness with its owner for this tick. Reports a reunion only
 * on the tick they come back together after a gap, never while they stay together and
 * never the first time (when there is nothing to have been apart from).
 */
export function updatePetTogetherness({
  animal,
  owner,
  nowIso
}: {
  animal: AnimalState
  owner: CharacterState
  nowIso: string
}): { reunited: boolean; minutesApart: number | null } {
  const ownerLotId = owner.location.lotId
  const together = !!ownerLotId && ownerLotId === animal.location.lotId
  const wasTogether = animal.withOwner ?? false
  let result: { reunited: boolean; minutesApart: number | null } = { reunited: false, minutesApart: null }

  if (together) {
    if (!wasTogether && animal.lastWithOwnerAt) {
      const minutesApart = minutesBetween(animal.lastWithOwnerAt, nowIso)
      result = { reunited: minutesApart !== null, minutesApart }
    }
    animal.lastWithOwnerAt = nowIso
  }
  animal.withOwner = together
  return result
}
