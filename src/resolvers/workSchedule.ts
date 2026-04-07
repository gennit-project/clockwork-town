interface StoredWorkShift {
  day: string
  start: string
  end: string
  locationLotId: string
}

export interface ResolvedWorkShift extends StoredWorkShift {
  location: {
    id: string
    name: string
  }
}

export interface WorkShiftInput {
  day: string
  start: string
  end: string
  locationLotId: string
}

export function serializeWorkSchedule(schedule: WorkShiftInput[] = []): string[] {
  return schedule.map((shift) => JSON.stringify({
    day: shift.day,
    start: shift.start,
    end: shift.end,
    locationLotId: shift.locationLotId
  }))
}

export function deserializeStoredWorkSchedule(entries: string[] = []): StoredWorkShift[] {
  return entries.flatMap((entry) => {
    try {
      const parsed = JSON.parse(entry) as Partial<StoredWorkShift>
      if (!parsed.day || !parsed.start || !parsed.end || !parsed.locationLotId) {
        return []
      }

      return [{
        day: parsed.day,
        start: parsed.start,
        end: parsed.end,
        locationLotId: parsed.locationLotId
      }]
    } catch {
      return []
    }
  })
}
