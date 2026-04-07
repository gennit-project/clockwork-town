import type { CharacterState, WorldData } from '../types'

export function isPublicLot(lotType: string): boolean {
  return lotType.toUpperCase() !== 'RESIDENTIAL'
}

export function deriveAccessibleLotIds(
  characterState: Pick<CharacterState, 'accessibleLotIds' | 'homeLotId' | 'location'>,
  worldData: WorldData
): string[] {
  const lotIds = new Set<string>()

  for (const lot of Object.values(worldData.lots)) {
    if (lot.isPublic) {
      lotIds.add(lot.id)
    }
  }

  if (characterState.homeLotId) {
    lotIds.add(characterState.homeLotId)
  }

  if (characterState.location?.lotId) {
    lotIds.add(characterState.location.lotId)
  }

  for (const lotId of characterState.accessibleLotIds || []) {
    lotIds.add(lotId)
  }

  return [...lotIds]
}

export function canAccessLot(
  {
    characterState,
    lotId,
    isPublic
  }: {
    characterState: Pick<CharacterState, 'accessibleLotIds' | 'homeLotId' | 'location'>
    lotId: string
    isPublic: boolean
  }
): boolean {
  if (isPublic) {
    return true
  }

  if (characterState.homeLotId === lotId) {
    return true
  }

  if (characterState.location?.lotId === lotId) {
    return true
  }

  return characterState.accessibleLotIds.includes(lotId)
}
