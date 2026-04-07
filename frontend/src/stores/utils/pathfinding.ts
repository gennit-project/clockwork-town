/**
 * Pathfinding utilities for finding accessible items in the world
 */

import type {
  WorldData,
  CharacterLocation,
  CharacterState,
  ItemOption,
  ItemOccupancy
} from '../types'
import { debugLog } from './simulationDebug'
import { canAccessLot, isPublicLot } from './accessControl'
import { classifyItem } from './itemClassification'

/**
 * Find items with a specific affordance (action) accessible to a character
 * Step 8: Same space (cost 0) + Same lot (cost 1) + Same region (cost 2)
 *
 * @param characterId - Character ID (for logging)
 * @param action - Action name (e.g., 'eat', 'sleep')
 * @param characterLocation - Character's location { spaceId, lotId, regionId }
 * @param worldData - World data with lots, spaces, items, itemsByAffordance
 * @param itemOccupancy - Current item occupancy { [itemId]: [characterId1, characterId2, ...] }
 * @returns Array of item options: [{ itemId, itemName, spaceId, spaceName, lotId, lotName, travelCost }]
 */
export interface FindItemsWithAffordanceParams {
  characterId: string
  action: string
  characterContext: CharacterLocation | CharacterState
  worldData: WorldData
  itemOccupancy?: ItemOccupancy
}

export function findItemsWithAffordance({
  characterId,
  action,
  characterContext,
  worldData,
  itemOccupancy = {}
}: FindItemsWithAffordanceParams): ItemOption[] {
  const characterLocation = 'needs' in characterContext ? characterContext.location : characterContext
  const { spaceId: currentSpaceId, lotId: currentLotId, regionId: currentRegionId } = characterLocation

  if (!currentSpaceId || !currentLotId || !currentRegionId) {
    console.warn(`Character ${characterId} has incomplete location data`)
    return []
  }

  const results = []

  // Get all items with this affordance
  const itemIdsWithAction = worldData.itemsByAffordance[action] || []

  // Check each item for accessibility
  for (const itemId of itemIdsWithAction) {
    const item = worldData.items[itemId]
    const space = worldData.spaces[item.spaceId]
    const lot = worldData.lots[item.lotId]

    if ('needs' in characterContext && !canAccessLot(characterContext, lot.id)) {
      continue
    }

    let travelCost = null

    // Same space (cost 0)
    if (item.spaceId === currentSpaceId) {
      travelCost = 0
    }
    // Same lot, different space (cost 1)
    else if (item.lotId === currentLotId) {
      travelCost = 1
    }
    // Same region, different lot (cost 2)
    else if (item.regionId === currentRegionId) {
      travelCost = 2
    }

    // If accessible, check capacity before adding
    if (travelCost !== null) {
      // Check if item is at capacity
      const currentOccupants = itemOccupancy[item.id] || []
      const maxUsers = item.maxSimultaneousUsers

      // If item has a capacity limit, check if it's full
      if (maxUsers !== null && maxUsers !== undefined) {
        if (currentOccupants.length >= maxUsers) {
          debugLog(`  ⚠️  Item ${item.name} is at capacity (${currentOccupants.length}/${maxUsers})`)
          continue // Skip this item, it's full
        }
      }

      results.push({
        itemId: item.id,
        itemName: item.name,
        spaceId: item.spaceId,
        spaceName: space.name,
        lotId: item.lotId,
        lotName: lot.name,
        travelCost,
        affordanceWeight: item.affordances.find((entry) => entry.action === action)?.weight ?? 1
      })
    }
  }

  // Sort by travel cost (lower is better)
  results.sort((a, b) => a.travelCost - b.travelCost)

  debugLog(`🔍 findItemsWithAffordance('${characterId}', '${action}'):`)
  debugLog(`  Found ${results.length} items (cost 0: ${results.filter(r => r.travelCost === 0).length}, cost 1: ${results.filter(r => r.travelCost === 1).length}, cost 2: ${results.filter(r => r.travelCost === 2).length})`)
  debugLog('  Results:', results)
  return results
}

import type { InputLot } from '../types'

/**
 * Load world data (lots, spaces, items) for pathfinding
 * @param lots - Array of lot objects with indoorRooms and outdoorAreas
 * @param regionId - Region ID that these lots belong to
 * @returns World data structure { lots, spaces, items, itemsByAffordance }
 */
export function buildWorldData(lots: InputLot[], regionId: string): WorldData {
  debugLog('🗺️  Loading world data for pathfinding...')

  const worldData: WorldData = {
    lots: {},
    spaces: {},
    items: {},
    itemsByAffordance: {}
  }

  // Process each lot
  for (const lot of lots) {
    const spaceIds: string[] = []

    // Combine indoor rooms and outdoor areas
    const allSpaces = [
      ...(lot.indoorRooms || []),
      ...(lot.outdoorAreas || [])
    ]

    // Process each space
    for (const space of allSpaces) {
      spaceIds.push(space.id)

      const itemIds: string[] = []

      // Process each item in the space
      for (const item of (space.items || [])) {
        itemIds.push(item.id)

        const affordances = item.affordances?.length
          ? item.affordances
          : (item.allowedActivities || []).map((action) => ({ action, weight: 1 }))
        const allowedActivities = item.allowedActivities?.length
          ? item.allowedActivities
          : affordances.map((entry) => entry.action)

        // Store item data
        worldData.items[item.id] = {
          id: item.id,
          name: item.name,
          spaceId: space.id,
          lotId: lot.id,
          regionId: regionId,
          allowedActivities,
          affordances,
          maxSimultaneousUsers: item.maxSimultaneousUsers || null,
          classification: classifyItem(item.name, item.itemRoles || [])
        }

        // Index by affordance
        for (const action of allowedActivities) {
          if (!worldData.itemsByAffordance[action]) {
            worldData.itemsByAffordance[action] = []
          }
          worldData.itemsByAffordance[action].push(item.id)
        }
      }

      // Store space data
      worldData.spaces[space.id] = {
        id: space.id,
        name: space.name,
        lotId: lot.id,
        itemIds
      }
    }

    // Store lot data
      worldData.lots[lot.id] = {
        id: lot.id,
        name: lot.name,
        regionId: regionId,
        lotType: lot.lotType,
        isPublic: isPublicLot(lot.lotType),
        spaceIds
      }
  }

  debugLog(`✅ World data loaded:`)
  debugLog(`  - ${Object.keys(worldData.lots).length} lots`)
  debugLog(`  - ${Object.keys(worldData.spaces).length} spaces`)
  debugLog(`  - ${Object.keys(worldData.items).length} items`)
  debugLog(`  - ${Object.keys(worldData.itemsByAffordance).length} action types with items`)
  debugLog('World data:', worldData)

  return worldData
}
