import { describe, expect, it } from 'vitest'
import { createMockNeeds } from '../../__tests__/mockData'
import { breakdownHappiness, buildStackSeries } from '../happinessBreakdown'
import { computeCharacterHappiness } from '../happinessMetrics'
import type { HappinessSample, Needs } from '../../types'

const needs = (over: Partial<Needs> = {}): Needs =>
  createMockNeeds({
    food: 0.9, sleep: 0.7, bladder: 0.5, hygiene: 0.8, health: 1,
    friends: 0.6, family: 0.4, romance: 0.2,
    fulfillment: 0.3,
    ...over
  })

describe('breakdownHappiness', () => {
  it('adds up to exactly the happiness the tile shows', () => {
    const n = needs()
    const breakdown = breakdownHappiness(n)
    expect(breakdown.total).toBeCloseTo(computeCharacterHappiness(n), 10)
    expect(breakdown.basic + breakdown.emotional + breakdown.higher).toBeCloseTo(breakdown.total, 10)
  })

  it('gives each tier its share of the mean (sum of its needs over the number of needs)', () => {
    const b = breakdownHappiness(needs())
    expect(b.basic).toBeCloseTo((0.9 + 0.7 + 0.5 + 0.8 + 1) / 9, 10)
    expect(b.emotional).toBeCloseTo((0.6 + 0.4 + 0.2) / 9, 10)
    expect(b.higher).toBeCloseTo(0.3 / 9, 10)
  })

  it('matches the happiness metric when a trait switches a need off', () => {
    const n = needs({ romance: 1 }) // pinned full by the trait
    const b = breakdownHappiness(n, ['trait-asexual'])
    expect(b.total).toBeCloseTo(computeCharacterHappiness(n, ['trait-asexual']), 10)
    expect(b.emotional).toBeCloseTo((0.6 + 0.4) / 8, 10)
  })

  it('leaves fulfillment out entirely when asked (a resident with no values)', () => {
    const n = needs()
    const b = breakdownHappiness(n, [], { includeFulfillment: false })
    expect(b.higher).toBe(0)
    expect(b.total).toBeCloseTo((0.9 + 0.7 + 0.5 + 0.8 + 1 + 0.6 + 0.4 + 0.2) / 8, 10)
  })
})

describe('buildStackSeries', () => {
  const sample = (tick: number, n?: Needs): HappinessSample => ({
    tick,
    iso: '',
    town: 0,
    perCharacter: {},
    perCharacterNeeds: n ? { me: n } : {}
  })

  it('produces one point per sample in percentage points, with layers that sum to the total', () => {
    const series = buildStackSeries({ history: [sample(1, needs()), sample(2, needs({ food: 0 }))], characterId: 'me', hasValues: true })
    expect(series.ticks).toEqual([1, 2])
    for (let i = 0; i < 2; i++) {
      const sum = (series.basic[i] as number) + (series.emotional[i] as number) + (series.higher[i] as number)
      expect(sum).toBeCloseTo(series.total[i] as number, 1)
    }
    expect(series.total[0]).toBeGreaterThan(series.total[1] as number)
  })

  it('shows the top layer only when the resident has values (with a control)', () => {
    const history = [sample(1, needs())]
    const withValues = buildStackSeries({ history, characterId: 'me', hasValues: true })
    const withoutValues = buildStackSeries({ history, characterId: 'me', hasValues: false })
    expect(withValues.higher[0]).toBeGreaterThan(0)
    expect(withoutValues.higher[0]).toBe(0)
  })

  it('has gaps where the history has no data for this resident', () => {
    const series = buildStackSeries({ history: [sample(1), sample(2, needs())], characterId: 'me', hasValues: true })
    expect([series.basic[0], series.total[0]]).toEqual([null, null])
    expect(series.total[1]).not.toBeNull()
  })

  it('returns empty series for an empty history', () => {
    expect(buildStackSeries({ history: [], characterId: 'me', hasValues: true }).ticks).toEqual([])
  })
})
