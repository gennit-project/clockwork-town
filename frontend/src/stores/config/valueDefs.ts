/**
 * What each value means in the simulation, keyed by value id.
 *
 * The database only stores a value's identity (id/name/description); which actions
 * fulfill it and how long it can go neglected live here. A value id with no entry
 * here is shown but has no effect. Keep ids in sync with VALUE_CATALOG in `src/values.ts`.
 */

import { TICKS_PER_DAY } from '../../config/serviceDesk'
import type { ActionName, NeedName } from '../types'

export interface ValueDef {
  /** Completing any of these actions counts as fulfilling the value. */
  actions: ActionName[]
  /** Days the value can go unfulfilled before it is completely neglected. */
  windowDays: number
  /** If a trait disables this need, the value is switched off with it. */
  requiresNeed?: NeedName
}

export const VALUE_DEFS: Record<string, ValueDef> = {
  'value-take-care-of-animals': { actions: ['pet_animal'], windowDays: 1 },
  'value-read-books': { actions: ['read'], windowDays: 2 },
  'value-write-books': { actions: ['write'], windowDays: 3 },
  'value-be-a-good-friend': { actions: ['chat_friend', 'invite_over'], windowDays: 1 },
  'value-happy-family': { actions: ['call_mom'], windowDays: 2 },
  'value-romantic-relationship': {
    actions: ['date', 'text_romance', 'call_romance', 'propose_relationship'],
    windowDays: 2,
    requiresNeed: 'romance'
  },
  // Longest window: residents are off on weekends, which shouldn't count as neglect.
  'value-good-job-at-work': { actions: ['work'], windowDays: 3 }
}

export const VALUE_TUNING = {
  /** A value whose satisfaction falls below this counts as neglected. */
  neglectThreshold: 0.25,
  /** Extra fulfillment drained per tick by a neglected top-ranked value. */
  drainPerTick: 0.002,
  /** Each rank below the top weighs this much of the one above (1, 0.75, 0.56, ...). */
  rankWeightFalloff: 0.75,
  /**
   * Largest planner utility bonus for an action serving a fully neglected top-ranked value.
   * Utility is roughly 0-3 for needs minus a travel cost of ~2 per lot, so this is enough to
   * pull a resident to a nearby activity but not across town; a value that stays out of
   * reach is what the service-desk ticket is for.
   */
  plannerBonusMax: 1.5,
  /** Scales the bonus down while the tiers beneath values (basic, emotional) are unsatisfied. */
  lockedBonusMultiplier: 0.1
} as const

export const valueWindowTicks = (def: ValueDef): number => def.windowDays * TICKS_PER_DAY
