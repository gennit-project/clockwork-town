import { describe, expect, it } from 'vitest'
import { createNeedSummaries } from '../useNeedSummary'
import { createMockNeeds } from '../../stores/__tests__/mockData'

describe('createNeedSummaries', () => {
  it('returns three grouped summaries', () => {
    expect(createNeedSummaries(createMockNeeds()).length).toBe(3)
  })

  it('averages the basic needs into the basics summary', () => {
    expect(createNeedSummaries(createMockNeeds({
      food: 1,
      sleep: 0.5,
      bladder: 0.5,
      hygiene: 0.5,
      health: 0.5
    }))[0].value).toBe(0.6)
  })

  it('averages the emotional needs into the emotions summary', () => {
    expect(createNeedSummaries(createMockNeeds({
      friends: 0.9,
      family: 0.6,
      romance: 0.3
    }))[1].value).toBeCloseTo(0.6, 5)
  })

  it('uses fulfillment directly for the fulfillment summary', () => {
    expect(createNeedSummaries(createMockNeeds({ fulfillment: 0.42 }))[2].value).toBe(0.42)
  })
})
