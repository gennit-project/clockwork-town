/**
 * TypeScript type definitions for the simulation system
 */

// ============================================
// CORE TYPES
// ============================================

export type ActionName =
  | 'eat'
  | 'sleep'
  | 'use_toilet'
  | 'shower'
  | 'medicate'
  | 'chat_friend'
  | 'call_mom'
  | 'date'
  | 'text_romance'
  | 'call_romance'
  | 'invite_over'
  | 'read'
  | 'write'
  | 'view_art'
  | 'volunteer'
  | 'work'
  | 'idle'

export type NeedName =
  | 'food'
  | 'sleep'
  | 'bladder'
  | 'hygiene'
  | 'health'
  | 'friends'
  | 'family'
  | 'romance'
  | 'fulfillment'

export interface Needs {
  food: number
  sleep: number
  bladder: number
  hygiene: number
  health: number
  friends: number
  family: number
  romance: number
  fulfillment: number
}

export interface Cooldowns {
  eat: number
  sleep: number
  use_toilet: number
  shower: number
  medicate: number
  chat_friend: number
  call_mom: number
  date: number
  text_romance: number
  call_romance: number
  invite_over: number
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

export interface LongTermMemory {
  id: string
  content: string
  createdAt: string
}

export interface ActiveTask {
  planId: string
  goal: ActionName
  action: ActionName
  itemId?: string
  itemName?: string
  targetSpaceId?: string
  targetSpaceName?: string
  targetLotId?: string
  targetLotName?: string
  remainingTicks: number
  totalTicks: number
  socialTargetId?: string
  socialTargetName?: string
  currentStepIndex: number
  steps: TaskStep[]
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
  longTermMemories?: LongTermMemory[]
  queuedActions?: Intent[]
  currentTask?: ActiveTask | null
  householdId?: string | null
  homeLotId?: string | null
  homeLotName?: string | null
  accessibleLotIds: string[]
  workSchedule: WorkShift[]
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
  affordances: ItemAffordance[]
  maxSimultaneousUsers: number | null
  classification: ItemClassification
}

export interface ItemClassification {
  isFoodStorage: boolean
  isTakeoutSource: boolean
  isGrocerySource: boolean
  isKitchenStation: boolean
  isTableSeat: boolean
  isChairSeat: boolean
  isLoungeSeat: boolean
  isBedSeat: boolean
  isBookSource: boolean
}

export interface ItemAffordance {
  action: string
  weight: number
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
  lotType: string
  isPublic: boolean
  spaceIds: string[]
}

export interface WorldData {
  lots: Record<string, LotData>
  spaces: Record<string, SpaceData>
  items: Record<string, ItemData>
  itemsByAffordance: Record<string, string[]>
}

export interface SimulationDateTime {
  iso: string
  year: number
  month: number
  day: number
  weekday: string
  hour: number
  minute: number
}

export interface WorkShift {
  day: string
  start: string
  end: string
  locationLotId?: string | null
  locationLotName?: string | null
}

export type ItemOccupancy = Record<string, string[]>

export type AutoTickSpeed = 'slow' | 'normal' | 'fast'

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
  affordanceWeight: number
}

// ============================================
// DECISION MAKING TYPES
// ============================================

export interface Intent {
  goal?: ActionName
  strategy?: string
  action: ActionName
  itemId?: string
  itemName?: string
  targetSpaceId?: string
  targetSpaceName?: string
  targetLotId?: string
  targetLotName?: string
  travelCost?: number
  utility: number
  source?: 'auto' | 'manual'
  socialTargetId?: string
  socialTargetName?: string
  steps?: TaskStep[]
}

export interface TaskStep {
  action: ActionName
  label?: string
  itemId?: string
  itemName?: string
  targetSpaceId?: string
  targetSpaceName?: string
  targetLotId?: string
  targetLotName?: string
  totalTicks: number
  remainingTicks: number
  socialTargetId?: string
  socialTargetName?: string
}

export interface PlanCandidate {
  goal: ActionName
  strategy: string
  utility: number
  travelCost: number
  primaryStep: TaskStep
  steps: TaskStep[]
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
  itemRoles?: string[]
  allowedActivities?: string[]
  affordances?: ItemAffordance[]
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
