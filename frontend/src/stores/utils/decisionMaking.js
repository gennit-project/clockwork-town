/**
 * Decision making utilities for calculating action utilities and selecting best intents
 */

import { ACTION_EFFECTS, NEED_WEIGHTS } from '../config/actionEffects.js'
import { findItemsWithAffordance } from './pathfinding.js'

/**
 * Calculate utility score for a character performing an action at a specific item
 * Step 9: Utility = (need weight × need deficit) - travel cost + context bonus
 *
 * @param {string} characterId - Character ID (for logging)
 * @param {string} action - Action name (e.g., 'eat', 'sleep')
 * @param {object} characterNeeds - Character's current needs { food, sleep, health, ... }
 * @param {object} itemOption - Item option from findItemsWithAffordance
 * @returns {number} Utility score (higher is better)
 */
export function calculateUtility(characterId, action, characterNeeds, itemOption) {
  const actionData = ACTION_EFFECTS[action]
  if (!actionData) {
    console.warn(`Unknown action: ${action}`)
    return -Infinity
  }

  // Get the primary need this action satisfies
  const primaryNeed = actionData.primaryNeed
  if (!primaryNeed) {
    // Idle or actions without primary needs have no utility
    return 0
  }

  // Calculate need deficit (1.0 - current need value)
  const currentNeedValue = characterNeeds[primaryNeed] || 0
  const needDeficit = 1.0 - currentNeedValue

  // Get need weight
  const needWeight = NEED_WEIGHTS[primaryNeed] || 1.0

  // Calculate base utility: needWeight × needDeficit
  const baseUtility = needWeight * needDeficit

  // Travel penalty (from pathfinding cost)
  const travelPenalty = itemOption.travelCost

  // Context bonus (will be implemented in Step 14 for trait-based bonuses)
  const contextBonus = 0

  // Final utility
  const utility = baseUtility - travelPenalty + contextBonus

  return utility
}

/**
 * Select the best action intent for a character
 * Step 10: Evaluate all actions, find items, calculate utilities, return best intent
 *
 * @param {string} characterId - Character ID
 * @param {object} characterState - Character state with needs, cooldowns, location
 * @param {object} worldData - World data structure
 * @param {object} itemOccupancy - Current item occupancy { [itemId]: [characterId1, ...] }
 * @returns {object} Intent: { action, itemId, itemName, targetSpaceId, targetLotId, utility } or { action: 'idle', utility: 0 }
 */
export function selectBestIntent(characterId, characterState, worldData, itemOccupancy = {}) {
  console.log(`\n🎯 selectBestIntent for character ${characterId}`)

  // All possible actions (excluding idle and work for now)
  const possibleActions = ['eat', 'sleep', 'medicate', 'chat_friend', 'call_mom', 'date', 'read', 'write', 'view_art', 'volunteer']

  const intents = []

  // Evaluate each action
  for (const action of possibleActions) {
    // Check if action is on cooldown
    if (characterState.cooldowns[action] > 0) {
      console.log(`  ❌ ${action}: on cooldown (${characterState.cooldowns[action]} ticks remaining)`)
      continue
    }

    // Find items that support this action (excluding full items)
    const items = findItemsWithAffordance(characterId, action, characterState.location, worldData, itemOccupancy)

    if (items.length === 0) {
      console.log(`  ❌ ${action}: no accessible items`)
      continue
    }

    // Get the best (closest) item
    const bestItem = items[0]

    // Calculate utility
    const utility = calculateUtility(characterId, action, characterState.needs, bestItem)

    console.log(`  ✓ ${action}: utility ${utility.toFixed(2)} (${bestItem.itemName} in ${bestItem.spaceName}, cost ${bestItem.travelCost})`)

    intents.push({
      action,
      itemId: bestItem.itemId,
      itemName: bestItem.itemName,
      targetSpaceId: bestItem.spaceId,
      targetSpaceName: bestItem.spaceName,
      targetLotId: bestItem.lotId,
      targetLotName: bestItem.lotName,
      travelCost: bestItem.travelCost,
      utility
    })
  }

  // If no valid intents, return idle
  if (intents.length === 0) {
    console.log(`  ⚠️  No valid actions available - returning idle`)
    return {
      action: 'idle',
      utility: 0
    }
  }

  // Sort by utility (highest first)
  intents.sort((a, b) => b.utility - a.utility)

  const bestIntent = intents[0]
  console.log(`\n  🏆 Best intent: ${bestIntent.action} (utility ${bestIntent.utility.toFixed(2)})`)
  console.log(`     Item: ${bestIntent.itemName}`)
  console.log(`     Location: ${bestIntent.targetSpaceName} (${bestIntent.targetLotName})`)
  console.log(`     Travel cost: ${bestIntent.travelCost}`)

  return bestIntent
}
