import type { CharacterLocation, Intent, ItemOccupancy, WorldData } from '../types'

export interface ItemAvailabilityResult {
  available: boolean
  reason?: string
}

export interface MovementPlan {
  shouldMove: boolean
  targetLotId: string | null
  targetLotName: string
  targetSpaceId: string
  targetSpaceName: string
}

export interface StartedActionPlan {
  isMultiTick: boolean
  logDetails: string | null
}

export function validateIntentItemAvailability(
  intent: Intent,
  worldData: WorldData,
  itemOccupancy: ItemOccupancy
): ItemAvailabilityResult {
  if (!intent.itemId) {
    return { available: true }
  }

  const item = worldData.items[intent.itemId]
  if (!item || item.maxSimultaneousUsers === null || item.maxSimultaneousUsers === undefined) {
    return { available: true }
  }

  const currentOccupants = itemOccupancy[intent.itemId] || []
  if (currentOccupants.length >= item.maxSimultaneousUsers) {
    return {
      available: false,
      reason: `${intent.itemName} became unavailable`
    }
  }

  return { available: true }
}

export function buildMovementPlan(
  currentLocation: CharacterLocation,
  intent: Intent
): MovementPlan {
  const targetLotId = intent.targetLotId || null
  const targetSpaceId = intent.targetSpaceId || ''
  const changingLots = Boolean(targetLotId && currentLocation.lotId !== targetLotId)
  const changingSpaces = Boolean(targetSpaceId && currentLocation.spaceId !== targetSpaceId)

  return {
    shouldMove: Boolean(intent.travelCost && intent.travelCost > 0 && (changingLots || changingSpaces)),
    targetLotId,
    targetLotName: intent.targetLotName || '',
    targetSpaceId,
    targetSpaceName: intent.targetSpaceName || ''
  }
}

export function buildStartedActionPlan(intent: Intent, duration: number): StartedActionPlan {
  if (duration > 1) {
    return {
      isMultiTick: true,
      logDetails: `Started multi-tick action at ${intent.itemName || intent.socialTargetName || 'target'}`
    }
  }

  return {
    isMultiTick: false,
    logDetails: null
  }
}
