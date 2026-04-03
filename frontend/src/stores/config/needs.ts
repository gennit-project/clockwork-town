/**
 * Need decay rates and configuration
 */

import type { NeedDecayRates, Needs, Cooldowns } from '../types'

/**
 * Need decay rates per tick
 * Higher value = faster decay
 */
export const NEED_DECAY_RATES: NeedDecayRates = {
  food: 0.04,
  sleep: 0.02,
  bladder: 0.03,
  hygiene: 0.015,
  health: 0.01,
  friends: 0.015,
  family: 0.01,
  romance: 0.01,
  fulfillment: 0.008
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
  read: 0,
  write: 0,
  view_art: 0,
  volunteer: 0,
  work: 0
}

console.log('📉 NEED_DECAY_RATES loaded:', NEED_DECAY_RATES)
