import type { CharacterValueState } from '../types'

/** Shape of a value as returned by the GraphQL API (already in rank order). */
export interface ValueSummary {
  id: string
  name: string
}

/** Turn API values into simulation state, with every value starting as freshly fulfilled. */
export function toValueSeed(values: ValueSummary[] | null | undefined): { values: CharacterValueState[] } {
  return { values: (values ?? []).map((v) => ({ id: v.id, name: v.name, ticksSinceFulfilled: 0 })) }
}

/**
 * Reconcile reloaded values with existing state: keep the clock for any value the
 * character already had, so reloading a region never makes everyone "fresh" again.
 */
export function mergeValueSeed(
  incoming: CharacterValueState[],
  existing: CharacterValueState[] | undefined
): CharacterValueState[] {
  const previous = new Map((existing ?? []).map((v) => [v.id, v.ticksSinceFulfilled]))
  return incoming.map((v) => ({ ...v, ticksSinceFulfilled: previous.get(v.id) ?? v.ticksSinceFulfilled }))
}
