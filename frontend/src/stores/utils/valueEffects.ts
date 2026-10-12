/**
 * Pure helpers for ranked values: satisfaction, neglect, drain, fulfillment.
 *
 * A character's `values` array is in rank order (index 0 = most important). Each
 * value counts ticks since it was last fulfilled; satisfaction runs from 1 (just
 * fulfilled) to 0 (neglected for its whole window).
 */

import { VALUE_DEFS, VALUE_TUNING, valueWindowTicks, type ValueDef } from '../config/valueDefs'
import type { ActionName, CharacterState, CharacterValueState } from '../types'
import { isTierUnlocked } from './needGating'
import { isNeedDisabled } from './traitEffects'
import { TICK_DURATION_MINUTES } from './simulationCalendar'

type ValueHolder = Pick<CharacterState, 'values' | 'traitIds'>
type ValueHolderWithNeeds = ValueHolder & Pick<CharacterState, 'needs'>

export function getValueDef(valueId: string): ValueDef | undefined {
  return VALUE_DEFS[valueId]
}

/** 1 = just fulfilled, 0 = neglected for the full window. Unknown values read as fully satisfied. */
export function valueSatisfaction(value: CharacterValueState): number {
  const def = VALUE_DEFS[value.id]
  if (!def) return 1
  return Math.min(1, Math.max(0, 1 - value.ticksSinceFulfilled / valueWindowTicks(def)))
}

export function isValueNeglected(value: CharacterValueState): boolean {
  return valueSatisfaction(value) < VALUE_TUNING.neglectThreshold
}

/** True when a trait switches off the need this value depends on. */
export function isValueDisabled(value: CharacterValueState, traitIds: readonly string[] = []): boolean {
  const need = VALUE_DEFS[value.id]?.requiresNeed
  return need ? isNeedDisabled(need, traitIds) : false
}

/** 1 for the top-ranked value, falling off geometrically. `rank` is 1-based. */
export function rankWeight(rank: number): number {
  return VALUE_TUNING.rankWeightFalloff ** (rank - 1)
}

/** Values that currently matter: known, and not switched off by a trait. Keeps rank (1-based). */
export function activeValues(state: ValueHolder): Array<{ value: CharacterValueState; rank: number }> {
  return (state.values ?? [])
    .map((value, index) => ({ value, rank: index + 1 }))
    .filter(({ value }) => value.id in VALUE_DEFS && !isValueDisabled(value, state.traitIds))
}

/** Age every value by one tick. */
export function tickValues(state: Pick<CharacterState, 'values'>): void {
  for (const value of state.values ?? []) {
    value.ticksSinceFulfilled += 1
  }
}

/** Extra fulfillment drained this tick because of neglected values, weighted by rank. */
export function valueNeglectDrain(state: ValueHolder): number {
  return activeValues(state)
    .filter(({ value }) => isValueNeglected(value))
    .reduce((sum, { rank }) => sum + VALUE_TUNING.drainPerTick * rankWeight(rank), 0)
}

/** Reset the clock on every value the completed action fulfills; returns the ids reset. */
export function markValuesFulfilled(state: Pick<CharacterState, 'values'>, action: ActionName): string[] {
  const fulfilled: string[] = []
  for (const value of state.values ?? []) {
    if (VALUE_DEFS[value.id]?.actions.includes(action)) {
      value.ticksSinceFulfilled = 0
      fulfilled.push(value.id)
    }
  }
  return fulfilled
}

/**
 * Planner nudge toward actions that would relieve a neglected value; 0 for everything else.
 * Values sit at the top of the need hierarchy, so the nudge shrinks while the basic or
 * emotional tier is unsatisfied (a starving resident doesn't drop everything for a hobby).
 */
export function valueUtilityBonus(state: ValueHolderWithNeeds, action: ActionName): number {
  let bonus = 0
  for (const { value, rank } of activeValues(state)) {
    if (!isValueNeglected(value) || !VALUE_DEFS[value.id].actions.includes(action)) continue
    bonus = Math.max(bonus, VALUE_TUNING.plannerBonusMax * rankWeight(rank) * (1 - valueSatisfaction(value)))
  }
  const unlocked = isTierUnlocked('emotional', state.needs) && isTierUnlocked('higher', state.needs)
  return unlocked ? bonus : bonus * VALUE_TUNING.lockedBonusMultiplier
}

const TICKS_PER_HOUR = 60 / TICK_DURATION_MINUTES

/** Human "time since" label for a tick count: "just now", "3h ago", "2d 4h ago". */
export function describeTicksAgo(ticks: number): string {
  const hours = Math.floor(ticks / TICKS_PER_HOUR)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return rest ? `${days}d ${rest}h ago` : `${days}d ago`
}

/** "call_mom" -> "call mom" */
export function describeAction(action: ActionName): string {
  return action.replace(/_/g, ' ')
}
