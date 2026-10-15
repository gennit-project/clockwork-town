/**
 * Need decay rates and configuration
 */

import type { NeedDecayRates, Needs, Cooldowns } from '../types'
import { debugLog } from '../utils/simulationDebug'

/**
 * Need decay rates per tick (one tick = 5 simulated minutes, 288 per day).
 * Sized so a resident needs roughly: 3 meals, ~3-4 toilet visits, 1-2 showers,
 * a few chats and a few fulfilling activities per day. See ACTION_EFFECTS for
 * how much each action restores.
 */
/**
 * A scheduled shift (work, school) normally outranks the planner, but a basic need this low
 * pre-empts it: the resident steps out to eat or use the toilet and goes back afterwards. Without
 * this a resident on a long shift, in a place with no toilet or kitchen, simply runs a need to zero.
 * Sleep is not on the list (a sleep shift is how that need is met).
 */
export const SCHEDULE_BREAK = {
  criticalBelow: 0.08,
  needs: ['food', 'bladder', 'hygiene', 'health']
} as const

export const NEED_DECAY_RATES: NeedDecayRates = {
  food: 0.004,
  sleep: 0.003,
  bladder: 0.006,
  hygiene: 0.0025,
  health: 0.001,
  friends: 0.0035,
  family: 0.001,
  romance: 0.0015,
  fulfillment: 0.0025
}

/**
 * Initial need values for new characters
 */
export const INITIAL_NEEDS: Needs = {
  food: 0.8,
  sleep: 0.8,
  bladder: 0.75,
  hygiene: 0.8,
  health: 0.9,
  friends: 0.7,
  family: 0.7,
  romance: 0.6,
  fulfillment: 0.6
}

/**
 * Initial cooldown values for new characters
 */
export const INITIAL_COOLDOWNS: Cooldowns = {
  eat: 0,
  sleep: 0,
  use_toilet: 0,
  shower: 0,
  medicate: 0,
  chat_friend: 0,
  call_mom: 0,
  date: 0,
  text_romance: 0,
  call_romance: 0,
  invite_over: 0,
  propose_relationship: 0,
  read: 0,
  write: 0,
  view_art: 0,
  view_movie: 0,
  volunteer: 0,
  pet_animal: 0,
  work: 0
}

debugLog('📉 NEED_DECAY_RATES loaded:', NEED_DECAY_RATES)
