/**
 * Lean animal runtime: per-tick need decay, need-driven action choice, and
 * abstract movement between accessible lots. Mirrors the human sim at a smaller
 * scale and runs entirely client-side (no DB persistence of animal needs).
 */
import type { AnimalActionName, AnimalNeedName, AnimalState, WorldData } from '../types'
import {
  ANIMAL_ACTION_EFFECT,
  ANIMAL_ACTION_FOR_NEED,
  ANIMAL_NEED_DECAY,
  ANIMAL_NEED_NAMES,
  ANIMAL_NEED_THRESHOLD,
  PET_AFFECTION_BOOST
} from '../config/animalConfig'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Mean of an animal's needs (0..1) — a simple wellbeing/contentment score. */
export function computeAnimalWellbeing(animal: Pick<AnimalState, 'needs'>): number {
  const values = ANIMAL_NEED_NAMES.map((n) => animal.needs[n])
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function lowestAnimalNeed(animal: Pick<AnimalState, 'needs'>): { name: AnimalNeedName; value: number } {
  let lowest: { name: AnimalNeedName; value: number } = { name: 'food', value: Infinity }
  for (const name of ANIMAL_NEED_NAMES) {
    if (animal.needs[name] < lowest.value) {
      lowest = { name, value: animal.needs[name] }
    }
  }
  return lowest
}

function decayAnimalNeeds(animal: AnimalState): void {
  for (const name of ANIMAL_NEED_NAMES) {
    animal.needs[name] = clamp01(animal.needs[name] - ANIMAL_NEED_DECAY[name])
  }
}

function chooseAnimalAction(animal: AnimalState): AnimalActionName {
  const lowest = lowestAnimalNeed(animal)
  if (lowest.value < ANIMAL_NEED_THRESHOLD) {
    return ANIMAL_ACTION_FOR_NEED[lowest.name]
  }
  // Content: roam now and then, otherwise rest.
  return Math.random() < 0.5 ? 'wander' : 'idle'
}

function moveAnimalToLot(animal: AnimalState, lotId: string | null | undefined, worldData: WorldData): void {
  if (!lotId) {
    return
  }
  const lot = worldData.lots[lotId]
  if (!lot || lot.spaceIds.length === 0) {
    return
  }
  const space = worldData.spaces[lot.spaceIds[0]]
  if (!space) {
    return
  }
  animal.location = {
    regionId: animal.location.regionId,
    lotId: lot.id,
    lotName: lot.name,
    spaceId: space.id,
    spaceName: space.name
  }
}

function applyAnimalAction(animal: AnimalState, action: AnimalActionName, worldData: WorldData): void {
  // Where does this action happen?
  if (action === 'eat' || action === 'sleep' || action === 'groom') {
    moveAnimalToLot(animal, animal.homeLotId ?? animal.location.lotId, worldData)
  } else if (action === 'wander') {
    const lots = animal.accessibleLotIds
    if (lots.length > 0) {
      moveAnimalToLot(animal, lots[Math.floor(Math.random() * lots.length)], worldData)
    }
  }
  // 'relieve', 'play', 'idle' happen wherever the animal currently is.

  const effect = ANIMAL_ACTION_EFFECT[action]
  if (effect) {
    animal.needs[effect.need] = clamp01(animal.needs[effect.need] + effect.amount)
  }

  animal.currentAction = action
}

/**
 * Apply a human's pet/play interaction to an animal: a burst of affection and a
 * visible "playing" state. Called when a character completes a `pet_animal`
 * action targeting this animal.
 */
export function applyPetInteraction(animal: AnimalState): void {
  animal.needs.affection = clamp01(animal.needs.affection + PET_AFFECTION_BOOST)
  animal.currentAction = 'play'
}

export function tickAnimals({
  animalStates,
  worldData
}: {
  animalStates: Record<string, AnimalState>
  worldData: WorldData
}): void {
  for (const animal of Object.values(animalStates)) {
    decayAnimalNeeds(animal)
    const action = chooseAnimalAction(animal)
    applyAnimalAction(animal, action, worldData)
  }
}
