import type { CharacterState, Intent, SimulationDateTime, WorldData, WorkShift } from '../types'

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours * 60) + minutes
}

export function getActiveWorkShift({
  characterState,
  simulationDateTime
}: {
  characterState: CharacterState
  simulationDateTime?: SimulationDateTime
}): WorkShift | null {
  if (!simulationDateTime) {
    return null
  }

  const currentMinutes = (simulationDateTime.hour * 60) + simulationDateTime.minute

  for (const shift of characterState.workSchedule) {
    if (shift.day !== simulationDateTime.weekday) {
      continue
    }

    if (currentMinutes >= toMinutes(shift.start) && currentMinutes < toMinutes(shift.end)) {
      return shift
    }
  }

  return null
}

export function buildWorkIntent({
  characterState,
  simulationDateTime,
  worldData
}: {
  characterState: CharacterState
  simulationDateTime?: SimulationDateTime
  worldData: WorldData
}): Intent | null {
  const activeShift = getActiveWorkShift({ characterState, simulationDateTime })
  if (!activeShift?.locationLotId) {
    return null
  }

  const targetLot = worldData.lots[activeShift.locationLotId]
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
    itemName: activeShift.locationLotName || targetLot.name,
    travelCost
  }
}
