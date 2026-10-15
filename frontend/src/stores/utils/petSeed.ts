/** Where a pet's owner lives: used to give each pet the right home and owner on load. */

interface HouseholdLike {
  lotId?: string | null
  lotName?: string | null
  characters: Array<{ id: string }>
}

export interface PetOwnership {
  ownerId: string | null
  homeLotId: string | null
  homeLotName: string | null
}

/** A pet lives with its owner: home is the lot of the household the owner belongs to. */
export function resolvePetOwnership(ownerId: string | null | undefined, households: HouseholdLike[]): PetOwnership {
  if (!ownerId) {
    return { ownerId: null, homeLotId: null, homeLotName: null }
  }
  const household = households.find((entry) => entry.characters.some((member) => member.id === ownerId))
  return {
    ownerId,
    homeLotId: household?.lotId ?? null,
    homeLotName: household?.lotName ?? null
  }
}
