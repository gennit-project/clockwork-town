import type { SimulationDateTime } from '../types'

const TICK_DURATION_MINUTES = 5

function toSimulationDateTime(value: Date): SimulationDateTime {
  return {
    iso: value.toISOString(),
    year: value.getFullYear(),
    month: value.getMonth() + 1,
    day: value.getDate(),
    weekday: value.toLocaleDateString(undefined, { weekday: 'long' }),
    hour: value.getHours(),
    minute: value.getMinutes()
  }
}

export function createSimulationDateTime(seedDate = new Date()): SimulationDateTime {
  return toSimulationDateTime(seedDate)
}

export function advanceSimulationDateTime(
  current: SimulationDateTime,
  tickCount = 1
): SimulationDateTime {
  const nextDate = new Date(current.iso)
  nextDate.setMinutes(nextDate.getMinutes() + TICK_DURATION_MINUTES * tickCount)
  return toSimulationDateTime(nextDate)
}

export function formatSimulationDateTime(current: SimulationDateTime): string {
  const date = new Date(current.iso)
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export { TICK_DURATION_MINUTES }
