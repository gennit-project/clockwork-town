import { describe, expect, it } from 'vitest'
import { createMockCharacterState, createMockItemOccupancy, createMockWorldData } from '../../__tests__/mockData'
import { buildPlanCandidates, planCandidateToIntent } from '../intentPlanner'

describe('intentPlanner', () => {
  it('builds candidates for available actions', () => {
    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })

    expect(candidates.length > 0).toBe(true)
  })

  it('sorts candidates by descending utility', () => {
    const characterState = createMockCharacterState()
    characterState.needs.food = 0.1

    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState,
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })

    expect(candidates[0].goal).toBe('eat')
  })

  it('creates at least one structured strategy for the current planner implementation', () => {
    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })

    expect(candidates.some((candidate) => !candidate.strategy.endsWith(':direct'))).toBe(true)
  })

  it('keeps a step list on each candidate', () => {
    const candidates = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })

    expect(candidates[0].steps.length).toBe(1)
  })

  it('converts a candidate into an executable intent', () => {
    const candidate = buildPlanCandidates({
      characterId: 'char-1',
      characterState: createMockCharacterState(),
      worldData: createMockWorldData(),
      itemOccupancy: createMockItemOccupancy()
    })[0]

    expect(planCandidateToIntent(candidate).steps).toEqual(candidate.steps)
  })
})
