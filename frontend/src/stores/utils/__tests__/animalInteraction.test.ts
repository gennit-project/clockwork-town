import { describe, expect, it } from 'vitest'
import { createMockCharacterState, createMockWorldData } from '../../__tests__/mockData'
import { buildPlanCandidates } from '../intentPlanner'
import { applyPetInteraction } from '../animalRuntime'
import { INITIAL_ANIMAL_NEEDS, PET_AFFECTION_BOOST } from '../../config/animalConfig'
import type { AnimalState } from '../../types'

function createMockAnimalState(overrides: Partial<AnimalState> = {}): AnimalState {
  return {
    name: 'Sprocket',
    traits: [],
    needs: { ...INITIAL_ANIMAL_NEEDS },
    currentAction: 'idle',
    homeLotId: 'lot-1',
    homeLotName: 'Test House',
    accessibleLotIds: ['lot-1', 'lot-2'],
    location: {
      regionId: 'region-1',
      lotId: 'lot-1',
      lotName: 'Test House',
      spaceId: 'space-1',
      spaceName: 'Living Room'
    },
    ...overrides
  }
}

describe('human-animal interaction', () => {
  it('offers a pet_animal candidate targeting a co-located animal', () => {
    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData: createMockWorldData(),
      animalStates: { 'animal-1': createMockAnimalState() }
    })

    const petCandidate = candidates.find((candidate) => candidate.goal === 'pet_animal')
    expect(petCandidate).toBeDefined()
    expect(petCandidate?.primaryStep.action).toBe('pet_animal')
    expect(petCandidate?.primaryStep.animalTargetId).toBe('animal-1')
    expect(petCandidate?.primaryStep.animalTargetName).toBe('Sprocket')
    expect(petCandidate?.travelCost).toBe(0)
  })

  it('does not offer a pet candidate for an already-reserved animal', () => {
    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData: createMockWorldData(),
      animalStates: { 'animal-1': createMockAnimalState() },
      reservedAnimalIds: ['animal-1']
    })

    expect(candidates.some((candidate) => candidate.goal === 'pet_animal')).toBe(false)
  })

  it('does not offer a pet candidate while pet_animal is on cooldown', () => {
    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState({
        cooldowns: createMockCharacterState().cooldowns,
      }),
      worldData: createMockWorldData(),
      animalStates: { 'animal-1': createMockAnimalState() }
    })
    expect(candidates.some((candidate) => candidate.goal === 'pet_animal')).toBe(true)

    const onCooldown = createMockCharacterState()
    onCooldown.cooldowns.pet_animal = 5
    const cooldownCandidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: onCooldown,
      worldData: createMockWorldData(),
      animalStates: { 'animal-1': createMockAnimalState() }
    })
    expect(cooldownCandidates.some((candidate) => candidate.goal === 'pet_animal')).toBe(false)
  })

  it('skips animals on an inaccessible private lot', () => {
    const animalAway = createMockAnimalState({
      location: {
        regionId: 'region-1',
        lotId: 'lot-3',
        lotName: 'Stranger House',
        spaceId: 'space-9',
        spaceName: 'Den'
      }
    })
    const worldData = createMockWorldData()
    worldData.lots['lot-3'] = {
      id: 'lot-3',
      name: 'Stranger House',
      regionId: 'region-1',
      lotType: 'RESIDENTIAL',
      isPublic: false,
      spaceIds: ['space-9']
    }
    worldData.spaces['space-9'] = { id: 'space-9', name: 'Den', lotId: 'lot-3', itemIds: [] }

    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData,
      animalStates: { 'animal-1': animalAway }
    })

    expect(candidates.some((candidate) => candidate.goal === 'pet_animal')).toBe(false)
  })

  it('applyPetInteraction raises the animal affection and shows play', () => {
    const animal = createMockAnimalState({
      needs: { ...INITIAL_ANIMAL_NEEDS, affection: 0.2 },
      currentAction: 'idle'
    })

    applyPetInteraction(animal)

    expect(animal.needs.affection).toBeCloseTo(0.2 + PET_AFFECTION_BOOST)
    expect(animal.currentAction).toBe('play')
  })

  it('clamps affection to 1 when already high', () => {
    const animal = createMockAnimalState({
      needs: { ...INITIAL_ANIMAL_NEEDS, affection: 0.9 }
    })

    applyPetInteraction(animal)

    expect(animal.needs.affection).toBe(1)
  })
})
