/**
 * Pathfinding utilities for finding accessible items in the world
 */

/**
 * Find items with a specific affordance (action) accessible to a character
 * Step 8: Same space (cost 0) + Same lot (cost 1) + Same region (cost 2)
 *
 * @param {string} characterId - Character ID (for logging)
 * @param {string} action - Action name (e.g., 'eat', 'sleep')
 * @param {object} characterLocation - Character's location { spaceId, lotId, regionId }
 * @param {object} worldData - World data with lots, spaces, items, itemsByAffordance
 * @returns {Array} Array of item options: [{ itemId, itemName, spaceId, spaceName, lotId, lotName, travelCost }]
 */
export function findItemsWithAffordance(characterId, action, characterLocation, worldData) {
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

    // If accessible, add to results
    if (travelCost !== null) {
      results.push({
        itemId: item.id,
        itemName: item.name,
        spaceId: item.spaceId,
        spaceName: space.name,
        lotId: item.lotId,
        lotName: lot.name,
        travelCost
      })
    }
  }

  // Sort by travel cost (lower is better)
  results.sort((a, b) => a.travelCost - b.travelCost)

  console.log(`🔍 findItemsWithAffordance('${characterId}', '${action}'):`)
  console.log(`  Found ${results.length} items (cost 0: ${results.filter(r => r.travelCost === 0).length}, cost 1: ${results.filter(r => r.travelCost === 1).length}, cost 2: ${results.filter(r => r.travelCost === 2).length})`)
  console.log('  Results:', results)
  return results
}

/**
 * Load world data (lots, spaces, items) for pathfinding
 * @param {Array} lots - Array of lot objects with indoorRooms and outdoorAreas
 * @param {string} regionId - Region ID that these lots belong to
 * @returns {object} World data structure { lots, spaces, items, itemsByAffordance }
 */
export function buildWorldData(lots, regionId) {
  console.log('🗺️  Loading world data for pathfinding...')

  const worldData = {
    lots: {},
    spaces: {},
    items: {},
    itemsByAffordance: {}
  }

  // Process each lot
  for (const lot of lots) {
    const spaceIds = []

    // Combine indoor rooms and outdoor areas
    const allSpaces = [
      ...(lot.indoorRooms || []),
      ...(lot.outdoorAreas || [])
    ]

    // Process each space
    for (const space of allSpaces) {
      spaceIds.push(space.id)

      const itemIds = []

      // Process each item in the space
      for (const item of (space.items || [])) {
        itemIds.push(item.id)

        // Store item data
        worldData.items[item.id] = {
          id: item.id,
          name: item.name,
          spaceId: space.id,
          lotId: lot.id,
          regionId: regionId,
          allowedActivities: item.allowedActivities || []
        }

        // Index by affordance
        for (const action of (item.allowedActivities || [])) {
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
      spaceIds
    }
  }

  console.log(`✅ World data loaded:`)
  console.log(`  - ${Object.keys(worldData.lots).length} lots`)
  console.log(`  - ${Object.keys(worldData.spaces).length} spaces`)
  console.log(`  - ${Object.keys(worldData.items).length} items`)
  console.log(`  - ${Object.keys(worldData.itemsByAffordance).length} action types with items`)
  console.log('World data:', worldData)

  return worldData
}
