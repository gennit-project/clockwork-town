import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulationStore } from '../stores/simulation'
import {
  computeCharacterHappiness,
  computeTownHappiness,
  happinessStatus,
  type HealthStatus
} from '../stores/utils/happinessMetrics'
import type { NeedName } from '../stores/types'

export interface CharacterMetric {
  id: string
  name: string
  happiness: number
  status: HealthStatus
  lowestNeed: { name: NeedName; value: number }
  currentAction: string
}

const NEED_NAMES: NeedName[] = [
  'food',
  'sleep',
  'bladder',
  'hygiene',
  'health',
  'friends',
  'family',
  'romance',
  'fulfillment'
]

/**
 * Town-wide derived metrics for the dashboard, all reactive to the store.
 */
export function useTownMetrics() {
  const simulationStore = useSimulationStore()
  const { characterStates, happinessHistory } = storeToRefs(simulationStore)

  const characters = computed<CharacterMetric[]>(() =>
    Object.entries(characterStates.value).map(([id, state]) => {
      const happiness = computeCharacterHappiness(state.needs)
      let lowest: { name: NeedName; value: number } = { name: 'food', value: Infinity }
      for (const need of NEED_NAMES) {
        const value = state.needs[need]
        if (value < lowest.value) {
          lowest = { name: need, value }
        }
      }
      return {
        id,
        name: state.name,
        happiness,
        status: happinessStatus(happiness),
        lowestNeed: lowest,
        currentAction: state.currentAction
      }
    })
  )

  const population = computed(() => characters.value.length)

  const townHappiness = computed(() => computeTownHappiness(characterStates.value))

  const townStatus = computed(() => happinessStatus(townHappiness.value))

  // "Alerts firing" — characters whose happiness is in the critical band.
  const alerts = computed(() => characters.value.filter((c) => c.status === 'critical'))

  const warnings = computed(() => characters.value.filter((c) => c.status === 'warning'))

  // Town-average for each individual need (for the gauge row).
  const averageNeeds = computed<Record<NeedName, number>>(() => {
    const totals = Object.fromEntries(NEED_NAMES.map((n) => [n, 0])) as Record<NeedName, number>
    const states = Object.values(characterStates.value)
    if (states.length === 0) {
      return totals
    }
    for (const state of states) {
      for (const need of NEED_NAMES) {
        totals[need] += state.needs[need]
      }
    }
    for (const need of NEED_NAMES) {
      totals[need] /= states.length
    }
    return totals
  })

  return {
    NEED_NAMES,
    characters,
    population,
    townHappiness,
    townStatus,
    alerts,
    warnings,
    averageNeeds,
    happinessHistory
  }
}
