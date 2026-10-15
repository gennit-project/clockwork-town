/**
 * Splits a resident's happiness into its need tiers for the stacked chart.
 *
 * Happiness is the mean of the (active) needs, so each tier's layer is that tier's share of
 * the mean: the layers add up to the same number the Happiness tile shows. Needs a trait
 * switches off are left out, as in computeCharacterHappiness.
 */

import { NEED_TIERS, type NeedTier } from '../config/needGating'
import type { HappinessSample, NeedName, Needs } from '../types'
import { getDisabledNeeds } from './traitEffects'

export interface HappinessBreakdown {
  basic: number
  emotional: number
  higher: number
  /** basic + emotional + higher. */
  total: number
}

const TIERS: NeedTier[] = ['basic', 'emotional', 'higher']

/**
 * @param includeFulfillment pass false to leave the fulfillment need out entirely (the chart
 *   does this for a resident with no values), in which case the layers sum to the mean of
 *   the remaining needs.
 */
export function breakdownHappiness(
  needs: Needs,
  traitIds: readonly string[] = [],
  { includeFulfillment = true }: { includeFulfillment?: boolean } = {}
): HappinessBreakdown {
  const disabled = getDisabledNeeds(traitIds)
  const isActive = (need: NeedName) => !(need in disabled) && (includeFulfillment || need !== 'fulfillment')

  const active = TIERS.flatMap((tier) => NEED_TIERS[tier].filter(isActive))
  const result: HappinessBreakdown = { basic: 0, emotional: 0, higher: 0, total: 0 }
  if (active.length === 0) return result

  for (const tier of TIERS) {
    const sum = NEED_TIERS[tier].filter(isActive).reduce((acc, need) => acc + needs[need], 0)
    result[tier] = sum / active.length
  }
  result.total = result.basic + result.emotional + result.higher
  return result
}

export interface StackSeries {
  ticks: number[]
  /** Percentage points (0..100) per tick; null where the sample has no data for the resident. */
  basic: Array<number | null>
  emotional: Array<number | null>
  higher: Array<number | null>
  total: Array<number | null>
}

const toPoints = (value: number) => +(value * 100).toFixed(2)

/** The stacked-chart data for one resident from the happiness history. */
export function buildStackSeries({
  history,
  characterId,
  traitIds = [],
  hasValues
}: {
  history: HappinessSample[]
  characterId: string
  traitIds?: readonly string[]
  /** With no values the fulfillment layer is omitted (and left out of the total). */
  hasValues: boolean
}): StackSeries {
  const series: StackSeries = { ticks: [], basic: [], emotional: [], higher: [], total: [] }
  for (const sample of history) {
    series.ticks.push(sample.tick)
    const needs = sample.perCharacterNeeds?.[characterId]
    if (!needs) {
      series.basic.push(null)
      series.emotional.push(null)
      series.higher.push(null)
      series.total.push(null)
      continue
    }
    const breakdown = breakdownHappiness(needs, traitIds, { includeFulfillment: hasValues })
    series.basic.push(toPoints(breakdown.basic))
    series.emotional.push(toPoints(breakdown.emotional))
    series.higher.push(toPoints(breakdown.higher))
    series.total.push(toPoints(breakdown.total))
  }
  return series
}
