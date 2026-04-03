import type { ItemOccupancy } from '../types'

export function assignItemOccupancy(
  occupancy: ItemOccupancy,
  characterId: string,
  itemId: string
): ItemOccupancy {
  clearCharacterOccupancy(occupancy, characterId)

  if (!occupancy[itemId]) {
    occupancy[itemId] = []
  }

  if (!occupancy[itemId].includes(characterId)) {
    occupancy[itemId].push(characterId)
  }

  return occupancy
}

export function clearCharacterOccupancy(
  occupancy: ItemOccupancy,
  characterId: string
): ItemOccupancy {
  for (const itemId in occupancy) {
    const index = occupancy[itemId]?.indexOf(characterId) ?? -1
    if (index !== -1) {
      occupancy[itemId].splice(index, 1)

      if (occupancy[itemId].length === 0) {
        delete occupancy[itemId]
      }
    }
  }

  return occupancy
}
