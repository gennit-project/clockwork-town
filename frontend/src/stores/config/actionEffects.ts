// ============================================
// ACTION EFFECTS DATA (from TICKS.md)
// ============================================

import type { ActionEffects, NeedWeights } from '../types'

/**
 * Defines the effects and cooldowns for each action type
 * Effects are applied immediately when action executes
 */
export const ACTION_EFFECTS: ActionEffects = {
  eat: {
    primaryNeed: 'food',
    primaryEffect: 0.35,
    secondaryEffects: {},
    cooldownTicks: 6  // 30 minutes
  },
  sleep: {
    primaryNeed: 'sleep',
    primaryEffect: 0.50,
    secondaryEffects: {},
    cooldownTicks: 12  // 60 minutes
  },
  use_toilet: {
    primaryNeed: 'bladder',
    primaryEffect: 0.65,
    secondaryEffects: {},
    cooldownTicks: 4
  },
  shower: {
    primaryNeed: 'hygiene',
    primaryEffect: 0.55,
    secondaryEffects: {},
    cooldownTicks: 8
  },
  medicate: {
    primaryNeed: 'health',
    primaryEffect: 0.40,
    secondaryEffects: {},
    cooldownTicks: 12  // 60 minutes
  },
  chat_friend: {
    primaryNeed: 'friends',
    primaryEffect: 0.25,
    secondaryEffects: {},
    cooldownTicks: 9  // 45 minutes
  },
  call_mom: {
    primaryNeed: 'family',
    primaryEffect: 0.30,
    secondaryEffects: {},
    cooldownTicks: 12  // 60 minutes
  },
  date: {
    primaryNeed: 'romance',
    primaryEffect: 0.35,
    secondaryEffects: { friends: 0.10 },
    cooldownTicks: 18  // 90 minutes
  },
  text_romance: {
    primaryNeed: 'romance',
    primaryEffect: 0.15,
    secondaryEffects: { friends: 0.05 },
    cooldownTicks: 6
  },
  call_romance: {
    primaryNeed: 'romance',
    primaryEffect: 0.22,
    secondaryEffects: { friends: 0.05 },
    cooldownTicks: 10
  },
  invite_over: {
    primaryNeed: 'romance',
    primaryEffect: 0.28,
    secondaryEffects: { friends: 0.08 },
    cooldownTicks: 16
  },
  read: {
    primaryNeed: 'fulfillment',
    primaryEffect: 0.20,
    secondaryEffects: { friends: -0.05 },
    cooldownTicks: 9  // 45 minutes
  },
  write: {
    primaryNeed: 'fulfillment',
    primaryEffect: 0.25,
    secondaryEffects: { friends: -0.05 },
    cooldownTicks: 12  // 60 minutes
  },
  view_art: {
    primaryNeed: 'fulfillment',
    primaryEffect: 0.20,
    secondaryEffects: { friends: 0.05 },
    cooldownTicks: 6  // 30 minutes
  },
  volunteer: {
    primaryNeed: 'fulfillment',
    primaryEffect: 0.30,
    secondaryEffects: { family: 0.10 },
    cooldownTicks: 18  // 90 minutes
  },
  work: {
    primaryNeed: 'money',  // Note: money not tracked in v0
    primaryEffect: 0,
    secondaryEffects: { sleep: -0.15 },
    cooldownTicks: 48  // 240 minutes
  },
  idle: {
    primaryNeed: null,
    primaryEffect: 0,
    secondaryEffects: {},
    cooldownTicks: 1  // 5 minutes
  }
}

export const ACTION_DURATIONS = {
  sleep: 3,
  shower: 2,
  invite_over: 2
} as const

/**
 * Need weights for utility calculation
 * Higher weight = more important/urgent
 */
export const NEED_WEIGHTS: NeedWeights = {
  // Basic needs (physical survival)
  food: 3.0,
  sleep: 3.0,
  bladder: 3.0,
  hygiene: 2.25,
  health: 2.5,

  // Emotional needs (social connection)
  friends: 2.0,
  family: 2.0,
  romance: 1.5,

  // Self-actualization
  fulfillment: 1.0
}

// Log on module load for debugging
console.log('📊 ACTION_EFFECTS loaded:', ACTION_EFFECTS)
console.log('⚖️  NEED_WEIGHTS loaded:', NEED_WEIGHTS)
