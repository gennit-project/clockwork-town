/**
 * TypeScript type definitions for the simulation system
 */

// ============================================
// CORE TYPES
// ============================================

export type ActionName =
  | 'eat'
  | 'sleep'
  | 'medicate'
  | 'chat_friend'
  | 'call_mom'
  | 'date'
  | 'read'
  | 'write'
  | 'view_art'
  | 'volunteer'
  | 'work'
  | 'idle'

export type NeedName =
  | 'food'
  | 'sleep'
  | 'health'
  | 'friends'
  | 'family'
  | 'romance'
  | 'fulfillment'

export interface Needs {
  food: number
  sleep: number
  health: number
  friends: number
  family: number
  romance: number
  fulfillment: number
}

export interface Cooldowns {
  eat: number
  sleep: number
  medicate: number
  chat_friend: number
  call_mom: number
  date: number
  read: number
  write: number
  view_art: number
  volunteer: number
  work: number
}

export interface CharacterLocation {
  regionId: string | null
  lotId: string | null
  lotName: string | null
  spaceId: string | null
  spaceName: string | null
}

export interface CharacterActivity {
  itemId: string | null
  actionName: string | null
}

export interface CharacterState {
  name: string
  needs: Needs
  cooldowns: Cooldowns
  currentAction: ActionName
  location: CharacterLocation
  currentActivity?: CharacterActivity
  traits: string[]
  memories?: Memory[]
}

export interface Memory {
  tick: number
  action: string
  item: string
  location: string
  utility: number
}

// ============================================
// ACTION & NEED CONFIGURATION
// ============================================

export interface ActionEffect {
  primaryNeed: NeedName | null
  primaryEffect: number
  secondaryEffects: Partial<Record<NeedName, number>>
  cooldownTicks: number
}

export type ActionEffects = Record<ActionName, ActionEffect>

export type NeedWeights = Record<NeedName, number>

export type NeedDecayRates = Record<NeedName, number>

// ============================================
// WORLD DATA TYPES
// ============================================

export interface ItemData {
  id: string
  name: string
  spaceId: string
  lotId: string
  regionId: string
  allowedActivities: string[]
  maxSimultaneousUsers: number | null
}

export interface SpaceData {
  id: string
  name: string
  lotId: string
  itemIds: string[]
}

export interface LotData {
  id: string
  name: string
  regionId: string
  spaceIds: string[]
}

export interface WorldData {
  lots: Record<string, LotData>
  spaces: Record<string, SpaceData>
  items: Record<string, ItemData>
  itemsByAffordance: Record<string, string[]>
}

export type ItemOccupancy = Record<string, string[]>

// ============================================
// PATHFINDING TYPES
// ============================================

export interface ItemOption {
  itemId: string
  itemName: string
  spaceId: string
  spaceName: string
  lotId: string
  lotName: string
  travelCost: number
}

// ============================================
// DECISION MAKING TYPES
// ============================================

export interface Intent {
  action: ActionName
  itemId?: string
  itemName?: string
  targetSpaceId?: string
  targetSpaceName?: string
  targetLotId?: string
  targetLotName?: string
  travelCost?: number
  utility: number
}

// ============================================
// ACTIVITY LOG TYPES
// ============================================

export interface ActivityLogEntry {
  tick: number
  timestamp: string
  characterId: string
  action: string
  details: string
}

// ============================================
// INPUT LOT DATA (from GraphQL)
// ============================================

export interface InputItem {
  id: string
  name: string
  description?: string
  allowedActivities?: string[]
  maxSimultaneousUsers?: number | null
}

export interface InputSpace {
  id: string
  name: string
  description?: string
  items?: InputItem[]
}

export interface InputLot {
  id: string
  name: string
  lotType: string
  indoorRooms?: InputSpace[]
  outdoorAreas?: InputSpace[]
}
