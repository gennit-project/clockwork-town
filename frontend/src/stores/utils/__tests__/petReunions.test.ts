import { afterEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_ANIMAL_NEEDS, PET_GREETING_MIN_AFFECTION, PET_HOMEBODY, PET_REUNION_AFFECTION_BOOST } from '../../config/animalConfig'
import { createMockCharacterState, createMockWorldData } from '../../__tests__/mockData'
import { tickAnimals } from '../animalRuntime'
import { resolvePetOwnership } from '../petSeed'
import {
  evaluatePetEvents,
  evaluatePetReunion,
  PET_REUNION_EVENT_TYPE,
  updatePetTogetherness,
  type PetEventEvaluator
} from '../petReunions'
import { REUNION_ABSENCE_THRESHOLD_MINUTES } from '../relationshipEvents'
import type { AnimalState, CharacterState } from '../../types'

const location = (lotId: string) => ({
  regionId: 'region-1',
  lotId,
  lotName: lotId,
  spaceId: `${lotId}-space`,
  spaceName: 'Room'
})

const makeAnimal = (over: Partial<AnimalState> = {}): AnimalState => ({
  name: 'Marmalade',
  traits: [],
  needs: { ...INITIAL_ANIMAL_NEEDS },
  currentAction: 'idle',
  homeLotId: 'lot-1',
  homeLotName: 'lot-1',
  accessibleLotIds: ['lot-1', 'lot-2'],
  location: location('lot-1'),
  ownerId: 'owner',
  lastWithOwnerAt: null,
  withOwner: false,
  ...over
})

const makeOwner = (lotId: string | null = 'lot-1'): CharacterState =>
  createMockCharacterState({
    name: 'Amina',
    location: lotId ? location(lotId) : { regionId: null, lotId: null, lotName: null, spaceId: null, spaceName: null }
  })

const at = (hours: number) => new Date(Date.UTC(2026, 3, 6, 8, 0) + hours * 3600000).toISOString()

describe('evaluatePetReunion', () => {
  const withAffection = (affection: number) =>
    makeAnimal({ needs: { ...INITIAL_ANIMAL_NEEDS, affection } })

  it('needs an absence of at least the shared reunion threshold', () => {
    const owner = makeOwner()
    expect(evaluatePetReunion({ owner, animal: makeAnimal(), minutesApart: REUNION_ABSENCE_THRESHOLD_MINUTES - 1 })).toBeNull()
    expect(evaluatePetReunion({ owner, animal: makeAnimal(), minutesApart: REUNION_ABSENCE_THRESHOLD_MINUTES })).not.toBeNull()
  })

  it('an affectionate pet greets its owner, which is notable and restores affection', () => {
    const event = evaluatePetReunion({ owner: makeOwner(), animal: withAffection(PET_GREETING_MIN_AFFECTION), minutesApart: 540 })
    expect(event).toEqual({
      type: PET_REUNION_EVENT_TYPE,
      ownerMemory: 'Was greeted by Marmalade after 9 hours apart.',
      notable: true,
      logMessage: 'Marmalade greeted Amina after 9 hours apart.',
      affectionBoost: PET_REUNION_AFFECTION_BOOST
    })
  })

  it('a withdrawn pet just gets a quiet memory (control for the greeting)', () => {
    const event = evaluatePetReunion({
      owner: makeOwner(),
      animal: withAffection(PET_GREETING_MIN_AFFECTION - 0.01),
      minutesApart: 540
    })
    expect(event).toEqual({
      type: PET_REUNION_EVENT_TYPE,
      ownerMemory: 'Saw Marmalade again after 9 hours apart.',
      notable: false,
      affectionBoost: 0
    })
  })

  it('an aloof pet keeps it low-key however affectionate its need is', () => {
    const cat = makeAnimal({ traits: ['aloof', 'curious'], needs: { ...INITIAL_ANIMAL_NEEDS, affection: 1 } })
    expect(evaluatePetReunion({ owner: makeOwner(), animal: cat, minutesApart: 540 })).toEqual({
      type: PET_REUNION_EVENT_TYPE,
      ownerMemory: 'Saw Marmalade again after 9 hours apart.',
      notable: false,
      affectionBoost: 0
    })
  })

  it('is species-agnostic: only the animal state matters, never its name or traits', () => {
    const dog = makeAnimal({ name: 'Biscuit', traits: ['loyal', 'energetic'] })
    expect(evaluatePetReunion({ owner: makeOwner(), animal: dog, minutesApart: 600 })?.ownerMemory).toBe(
      'Was greeted by Biscuit after 10 hours apart.'
    )
  })
})

describe('evaluatePetEvents', () => {
  it('runs every evaluator and drops empty results', () => {
    const always: PetEventEvaluator = () => ({ type: 'test', ownerMemory: 'm', notable: false, affectionBoost: 0 })
    const never: PetEventEvaluator = () => null
    const events = evaluatePetEvents({ owner: makeOwner(), animal: makeAnimal(), minutesApart: 0 }, [never, always])
    expect(events.map((e) => e.type)).toEqual(['test'])
  })
})

describe('updatePetTogetherness', () => {
  it('records the first time together without reporting a reunion', () => {
    const animal = makeAnimal()
    expect(updatePetTogetherness({ animal, owner: makeOwner(), nowIso: at(0) })).toEqual({ reunited: false, minutesApart: null })
    expect(animal.lastWithOwnerAt).toBe(at(0))
    expect(animal.withOwner).toBe(true)
  })

  it('does not report a reunion while they stay together', () => {
    const animal = makeAnimal()
    const owner = makeOwner()
    updatePetTogetherness({ animal, owner, nowIso: at(0) })
    for (let h = 1; h <= 20; h++) {
      expect(updatePetTogetherness({ animal, owner, nowIso: at(h) }).reunited).toBe(false)
    }
    expect(animal.lastWithOwnerAt).toBe(at(20))
  })

  it('reports exactly one reunion, with the gap, when they come back together', () => {
    const animal = makeAnimal()
    const owner = makeOwner('lot-1')
    updatePetTogetherness({ animal, owner, nowIso: at(0) })

    owner.location = location('lot-2')
    expect(updatePetTogetherness({ animal, owner, nowIso: at(4) })).toEqual({ reunited: false, minutesApart: null })
    expect(updatePetTogetherness({ animal, owner, nowIso: at(8) }).reunited).toBe(false)
    expect(animal.lastWithOwnerAt).toBe(at(0)) // frozen while apart

    owner.location = location('lot-1')
    expect(updatePetTogetherness({ animal, owner, nowIso: at(9) })).toEqual({ reunited: true, minutesApart: 9 * 60 })
    expect(updatePetTogetherness({ animal, owner, nowIso: at(10) }).reunited).toBe(false)
  })

  it('treats an owner with no location as apart', () => {
    const animal = makeAnimal()
    expect(updatePetTogetherness({ animal, owner: makeOwner(null), nowIso: at(0) }).reunited).toBe(false)
    expect(animal.withOwner).toBe(false)
    expect(animal.lastWithOwnerAt).toBeNull()
  })

  it('ignores an unparseable timestamp rather than inventing a reunion', () => {
    const animal = makeAnimal({ lastWithOwnerAt: 'not a date', withOwner: false })
    expect(updatePetTogetherness({ animal, owner: makeOwner(), nowIso: at(1) }).reunited).toBe(false)
  })
})

describe('resolvePetOwnership', () => {
  const households = [
    { lotId: 'lot-a', lotName: 'House A', characters: [{ id: 'amina' }] },
    { lotId: 'lot-b', lotName: 'House B', characters: [{ id: 'manny' }, { id: 'elena' }] }
  ]

  it('gives a pet the home of its owner\'s household', () => {
    expect(resolvePetOwnership('elena', households)).toEqual({ ownerId: 'elena', homeLotId: 'lot-b', homeLotName: 'House B' })
  })

  it('handles a missing owner and an owner with no household', () => {
    expect(resolvePetOwnership(null, households)).toEqual({ ownerId: null, homeLotId: null, homeLotName: null })
    expect(resolvePetOwnership('stranger', households)).toEqual({ ownerId: 'stranger', homeLotId: null, homeLotName: null })
  })
})

describe('homebody movement', () => {
  afterEach(() => vi.restoreAllMocks())

  const content = (over: Partial<AnimalState> = {}) =>
    makeAnimal({ needs: { food: 1, energy: 1, bladder: 1, affection: 1, hygiene: 1 }, ...over })

  const step = (animal: AnimalState, randoms: number[]) => {
    const spy = vi.spyOn(Math, 'random')
    randoms.forEach((r) => spy.mockReturnValueOnce(r))
    spy.mockReturnValue(0.999)
    tickAnimals({ animalStates: { a: animal }, worldData: createMockWorldData() })
    spy.mockRestore()
  }

  it('a content pet at home usually stays put', () => {
    const animal = content()
    step(animal, [0.5])
    expect(animal.location.lotId).toBe('lot-1')
  })

  it('a content pet at home occasionally wanders to a different lot', () => {
    const animal = content()
    step(animal, [PET_HOMEBODY.wanderChanceAtHome / 2, 0])
    expect(animal.location.lotId).toBe('lot-2')
  })

  it('a pet away from home heads back, or stays away if it does not feel like it', () => {
    const goingHome = content({ location: location('lot-2') })
    step(goingHome, [PET_HOMEBODY.returnHomeChanceAway / 2])
    expect(goingHome.location.lotId).toBe('lot-1')

    const lingering = content({ location: location('lot-2') })
    step(lingering, [0.9])
    expect(lingering.location.lotId).toBe('lot-2')
  })

  it('a pressing need always takes the pet home, wherever it is', () => {
    const hungry = content({ location: location('lot-2'), needs: { food: 0.1, energy: 1, bladder: 1, affection: 1, hygiene: 1 } })
    step(hungry, [0.9])
    expect(hungry.location.lotId).toBe('lot-1')
  })

  it('over a long run a pet spends most of its time at home', () => {
    let seed = 42
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    vi.spyOn(Math, 'random').mockImplementation(rand)
    const animal = content()
    const worldData = createMockWorldData()
    let atHome = 0
    const ticks = 1000
    for (let i = 0; i < ticks; i++) {
      animal.needs = { food: 1, energy: 1, bladder: 1, affection: 1, hygiene: 1 }
      tickAnimals({ animalStates: { a: animal }, worldData })
      if (animal.location.lotId === animal.homeLotId) atHome++
    }
    expect(atHome / ticks).toBeGreaterThan(0.85)
  })
})
