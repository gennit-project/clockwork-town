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

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Build a SimulationDateTime for the next occurrence (including today) of a
 * given weekday at a given time. Used by the scene-jump controls to pose the
 * town at, e.g., a weekday morning or late evening for screenshots.
 */
export function simulationDateTimeAt(weekday: string, hour: number, minute = 0): SimulationDateTime {
  const target = WEEKDAY_NAMES.indexOf(weekday)
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  if (target >= 0) {
    while (date.getDay() !== target) {
      date.setDate(date.getDate() + 1)
    }
  }
  return toSimulationDateTime(date)
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
