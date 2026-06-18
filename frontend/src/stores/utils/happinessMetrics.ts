/**
 * Happiness metrics
 *
 * The simulation has no single "happiness" field — it tracks nine needs (0..1).
 * We derive happiness as the mean of those needs so the dashboard and the
 * history recorder agree on one definition.
 */

import type { CharacterState, Needs } from '../types'

/** Maximum number of happiness samples retained in the ring buffer. */
export const HAPPINESS_HISTORY_LIMIT = 720

/**
 * Status thresholds (on a 0..1 happiness scale) used for Grafana-style
 * green / amber / red semantics across panels and alerts.
 */
export const HAPPINESS_THRESHOLDS = {
  critical: 0.3,
  warning: 0.5
} as const

export type HealthStatus = 'healthy' | 'warning' | 'critical'

/** Compute a single character's happiness as the mean of their needs (0..1). */
export function computeCharacterHappiness(needs: Needs): number {
  const values = Object.values(needs)
  if (values.length === 0) {
    return 0
  }

  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

/** Compute town happiness as the mean of every character's happiness (0..1). */
export function computeTownHappiness(states: Record<string, CharacterState>): number {
  const characters = Object.values(states)
  if (characters.length === 0) {
    return 0
  }

  const total = characters.reduce((sum, state) => sum + computeCharacterHappiness(state.needs), 0)
  return total / characters.length
}

/** Map a 0..1 happiness value to a green/amber/red status band. */
export function happinessStatus(happiness: number): HealthStatus {
  if (happiness < HAPPINESS_THRESHOLDS.critical) {
    return 'critical'
  }
  if (happiness < HAPPINESS_THRESHOLDS.warning) {
    return 'warning'
  }
  return 'healthy'
}
