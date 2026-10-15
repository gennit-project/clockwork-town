/**
 * Things a resident can approve or disapprove of seeing someone else do.
 *
 * A topic matches a witnessed act (what someone is doing right now). Only behaviors the
 * simulation already has can be topics; when a new behavior exists (a fictional recreational
 * herb, say) it becomes one more entry here and nothing else needs to change.
 */

import { getActiveShift } from '../utils/workSchedule'
import type { ActionName, CharacterState, SimulationDateTime } from '../types'

export interface WitnessedAct {
  action: ActionName
  actor: CharacterState
  simulationDateTime: SimulationDateTime
}

export interface ApprovalTopic {
  id: string
  /** Short name for the editor: "Daytime napping". */
  label: string
  /** What the actor is doing, finishing "<witness> disapproved of <actor> ...": "napping in the daytime". */
  phrase: string
  matches: (act: WitnessedAct) => boolean
}

/** Waking hours, in which sleeping outside the scheduled sleep block counts as a daytime nap. */
export const DAYTIME_START_HOUR = 8
export const DAYTIME_END_HOUR = 20

export const APPROVAL_TOPICS: ApprovalTopic[] = [
  {
    id: 'public-romance',
    label: 'Public romance',
    phrase: 'being romantic in public',
    matches: ({ action }) => action === 'date'
  },
  {
    id: 'daytime-napping',
    label: 'Daytime napping',
    phrase: 'napping in the daytime',
    matches: ({ action, actor, simulationDateTime }) => {
      if (action !== 'sleep') return false
      const hour = simulationDateTime.hour
      if (hour < DAYTIME_START_HOUR || hour >= DAYTIME_END_HOUR) return false
      // Sleeping through their scheduled sleep block is just sleeping.
      const shift = getActiveShift({ characterState: actor, simulationDateTime })
      return shift?.activity !== 'sleep'
    }
  },
  {
    id: 'screen-time',
    label: 'Watching movies',
    phrase: 'watching a movie',
    matches: ({ action }) => action === 'view_movie'
  },
  {
    id: 'reading',
    label: 'Reading',
    phrase: 'reading',
    matches: ({ action }) => action === 'read'
  },
  {
    id: 'volunteering',
    label: 'Volunteering',
    phrase: 'volunteering',
    matches: ({ action }) => action === 'volunteer'
  },
  {
    id: 'animal-care',
    label: 'Caring for animals',
    phrase: 'spending time with an animal',
    matches: ({ action }) => action === 'pet_animal'
  }
]

export const getApprovalTopic = (id: string): ApprovalTopic | undefined =>
  APPROVAL_TOPICS.find((topic) => topic.id === id)

export const WITNESS_TUNING = {
  /** Ticks before a witness reacts again to the same person doing the same thing (24 = 2 hours). */
  reactionCooldownTicks: 24,
  /** Ticks a grievance lasts without being refreshed (864 = 3 days). */
  grievanceDurationTicks: 864,
  /** Most grievances a witness holds at once; the oldest fade first. */
  maxGrievances: 6
} as const
