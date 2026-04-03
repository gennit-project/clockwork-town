export interface ItemAffordance {
  action: string
  weight: number
}

export interface AffordanceCarrier {
  allowedActivities?: string[]
  satisfiesNeeds?: string[]
}

export function decodeAffordances(item: AffordanceCarrier): ItemAffordance[] {
  const encodedAffordances = item.satisfiesNeeds || []
  const parsed = encodedAffordances
    .map((entry) => {
      const [action, rawWeight] = entry.split(":")
      const weight = Number(rawWeight)
      if (!action || Number.isNaN(weight)) {
        return null
      }
      return { action, weight }
    })
    .filter((entry): entry is ItemAffordance => entry !== null)

  if (parsed.length > 0) {
    return parsed
  }

  return (item.allowedActivities || []).map((action) => ({ action, weight: 1 }))
}

export function encodeAffordances(affordances?: ItemAffordance[]) {
  if (!affordances || affordances.length === 0) {
    return {
      allowedActivities: [],
      satisfiesNeeds: []
    }
  }

  return {
    allowedActivities: affordances.map((entry) => entry.action),
    satisfiesNeeds: affordances.map((entry) => `${entry.action}:${entry.weight}`)
  }
}
