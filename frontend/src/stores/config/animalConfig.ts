/**
 * Animal runtime configuration (lean parallel to the human needs system).
 * Needs are 0..1 (1 = fully satisfied) and decay toward 0 each tick; actions
 * raise the matching need.
 */

import type { AnimalActionName, AnimalNeedName, AnimalNeeds } from '../types'

export const INITIAL_ANIMAL_NEEDS: AnimalNeeds = {
  food: 0.8,
  energy: 0.8,
  bladder: 0.8,
  affection: 0.7,
  hygiene: 0.8
}

export const ANIMAL_NEED_DECAY: Record<AnimalNeedName, number> = {
  food: 0.05,
  energy: 0.03,
  bladder: 0.045,
  affection: 0.025,
  hygiene: 0.02
}

/** Which action a deficient need drives the animal to perform. */
export const ANIMAL_ACTION_FOR_NEED: Record<AnimalNeedName, AnimalActionName> = {
  food: 'eat',
  energy: 'sleep',
  bladder: 'relieve',
  affection: 'play',
  hygiene: 'groom'
}

/** How much each action restores (added to the need, clamped to 1). */
export const ANIMAL_ACTION_EFFECT: Partial<Record<AnimalActionName, { need: AnimalNeedName; amount: number }>> = {
  eat: { need: 'food', amount: 0.45 },
  sleep: { need: 'energy', amount: 0.35 },
  relieve: { need: 'bladder', amount: 0.55 },
  play: { need: 'affection', amount: 0.3 },
  groom: { need: 'hygiene', amount: 0.3 }
}

/** Below this, a need is "pressing" and the animal acts on it. */
export const ANIMAL_NEED_THRESHOLD = 0.55

/** How much affection a human's pet/play interaction restores for the animal. */
export const PET_AFFECTION_BOOST = 0.4

export const ANIMAL_NEED_NAMES: AnimalNeedName[] = ['food', 'energy', 'bladder', 'affection', 'hygiene']
