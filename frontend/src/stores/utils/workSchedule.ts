import type { CharacterState, Intent, SimulationDateTime, WorldData, WorkShift } from '../types'

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours * 60) + minutes
}

/**
 * Is a shift active at the given sim time? Supports shifts that wrap past
 * midnight (start >= end), e.g. a 22:00–06:00 sleep block or a night work shift.
 * A wrapping shift labelled for a given weekday covers that evening through the
 * following dawn; because every character has a sleep block on every weekday,
 * coverage is continuous and the exact label at 02:00 doesn't matter.
 */
function isShiftActive(shift: WorkShift, simulationDateTime: SimulationDateTime): boolean {
  if (shift.day !== simulationDateTime.weekday) {
    return false
  }

  const now = (simulationDateTime.hour * 60) + simulationDateTime.minute
  const start = toMinutes(shift.start)
  const end = toMinutes(shift.end)

  if (start < end) {
    return now >= start && now < end
  }
  // Wraps midnight: active from start until 24:00, and 00:00 until end.
  return now >= start || now < end
}

/**
 * The shift a character should be following right now, if any. "Away"
 * activities (work/school) take priority over sleep so a genuine night shift
 * beats the evening sleep block if they ever overlap.
 */
export function getActiveShift({
  characterState,
  simulationDateTime
}: {
  characterState: CharacterState
  simulationDateTime?: SimulationDateTime
}): WorkShift | null {
  if (!simulationDateTime) {
    return null
  }

  const active = characterState.workSchedule.filter((shift) => isShiftActive(shift, simulationDateTime))
  if (active.length === 0) {
    return null
  }

  return active.find((shift) => (shift.activity ?? 'work') !== 'sleep') ?? active[0]
}

function buildWorkIntent(shift: WorkShift, characterState: CharacterState, worldData: WorldData): Intent | null {
  if (!shift.locationLotId) {
    return null
  }

  const targetLot = worldData.lots[shift.locationLotId]
  if (!targetLot || targetLot.spaceIds.length === 0) {
    return null
  }

  const targetSpace = worldData.spaces[targetLot.spaceIds[0]]
  if (!targetSpace) {
    return null
  }

  const travelCost = characterState.location.lotId === targetLot.id
    ? (characterState.location.spaceId === targetSpace.id ? 0 : 1)
    : 2

  return {
    action: 'work',
    utility: 10,
    source: 'auto',
    targetLotId: targetLot.id,
    targetLotName: targetLot.name,
    targetSpaceId: targetSpace.id,
    targetSpaceName: targetSpace.name,
    itemName: shift.locationLotName || targetLot.name,
    travelCost
  }
}

function buildSleepIntent(shift: WorkShift, characterState: CharacterState, worldData: WorldData): Intent | null {
  // Sleep shifts point at the home lot (falling back to the character's known
  // home if the shift omits a location).
  const homeLotId = shift.locationLotId || characterState.homeLotId
  if (!homeLotId) {
    return null
  }

  const homeLot = worldData.lots[homeLotId]
  if (!homeLot || homeLot.spaceIds.length === 0) {
    return null
  }

  // Prefer an actual bed in the home lot: sleep then restores the need,
  // occupies the bed like normal sleep, and clusters the character in a bedroom.
  const homeBed = (worldData.itemsByAffordance['sleep'] ?? [])
    .map((itemId) => worldData.items[itemId])
    .find((item) => item && item.lotId === homeLotId)

  const targetSpaceId = homeBed?.spaceId ?? homeLot.spaceIds[0]
  const targetSpace = worldData.spaces[targetSpaceId]
  if (!targetSpace) {
    return null
  }

  const atHome = characterState.location.lotId === homeLotId
  const travelCost = atHome
    ? (characterState.location.spaceId === targetSpaceId ? 0 : 1)
    : 2

  return {
    action: 'sleep',
    // Just below work's 10 so a night work shift still wins, but above ordinary
    // need-driven intents so scheduled nights resolve to "home and asleep".
    utility: 9,
    source: 'auto',
    itemId: homeBed?.id,
    itemName: homeBed?.name ?? homeLot.name,
    targetLotId: homeLot.id,
    targetLotName: homeLot.name,
    targetSpaceId,
    targetSpaceName: targetSpace.name,
    travelCost
  }
}

/**
 * Turn a character's active schedule shift into an intent: work/school sends
 * them to a community lot, sleep sends them home to bed. Returns null when no
 * shift is active (the character then decides via need-driven planning).
 */
export function buildScheduleIntent({
  characterState,
  simulationDateTime,
  worldData
}: {
  characterState: CharacterState
  simulationDateTime?: SimulationDateTime
  worldData: WorldData
}): Intent | null {
  const shift = getActiveShift({ characterState, simulationDateTime })
  if (!shift) {
    return null
  }

  if ((shift.activity ?? 'work') === 'sleep') {
    return buildSleepIntent(shift, characterState, worldData)
  }

  return buildWorkIntent(shift, characterState, worldData)
}
