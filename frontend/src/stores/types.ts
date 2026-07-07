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
  | 'propose_relationship'
  | 'read'
  | 'write'
  | 'view_art'
  | 'view_movie'
  | 'volunteer'
  | 'pet_animal'
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

/**
 * One sampled point of happiness history, captured per tick for time-series panels.
 * `town` and each value in `perCharacter` are on a 0..1 scale.
 */
export interface HappinessSample {
  tick: number
  iso: string
  town: number
  perCharacter: Record<string, number>
  /** Per-character full needs snapshot at this tick (for the need-trend heatmap). */
  perCharacterNeeds: Record<string, Needs>
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
  propose_relationship: number
  read: number
  write: number
  view_art: number
  view_movie: number
  volunteer: number
  pet_animal: number
  work: number
}

export type InviteOverContext = 'hang_out' | 'watch_movie' | 'have_dinner'
export type RelationshipProposalLabel = 'girlfriend' | 'husband' | 'monogamous' | 'casual relationship'

export interface CharacterLocation {
  regionId: string | null
  lotId: string | null
  lotName: string | null
  spaceId: string | null
  spaceName: string | null
}

// ============================================
// ANIMAL RUNTIME
// ============================================

export type AnimalNeedName = 'food' | 'energy' | 'bladder' | 'affection' | 'hygiene'

export interface AnimalNeeds {
  food: number
  energy: number
  bladder: number
  affection: number
  hygiene: number
}

export type AnimalActionName = 'eat' | 'sleep' | 'relieve' | 'play' | 'groom' | 'wander' | 'idle'

export interface AnimalState {
  name: string
  traits: string[]
  needs: AnimalNeeds
  currentAction: AnimalActionName
  location: CharacterLocation
  homeLotId: string | null
  homeLotName: string | null
  accessibleLotIds: string[]
}

export interface CharacterActivity {
  itemId: string | null
  actionName: string | null
}

export interface LongTermMemory {
  id: string
  content: string
  createdAt: string
  eventType?: string | null
  locationLotId?: string | null
  locationLotName?: string | null
  locationSpaceId?: string | null
  locationSpaceName?: string | null
  relationshipIds?: string[]
}

export interface CharacterRelationship {
  id: string
  fromCharacterId: string
  toCharacterId: string
  shortTermScore: number
  longTermScore: number
  labels: string[]
  lastSeenAt?: string | null
  lastSpokeAt?: string | null
  isDeceasedTarget: boolean
}

export type SocialInvitationStatus = 'pending' | 'accepted' | 'rejected'

export interface SocialInvitation {
  id: string
  action: Extract<ActionName, 'chat_friend' | 'date' | 'invite_over' | 'propose_relationship'>
  inviteContextType?: InviteOverContext
  proposedRelationshipLabel?: RelationshipProposalLabel
  fromCharacterId: string
  fromCharacterName: string
  toCharacterId: string
  toCharacterName: string
  itemId?: string
  itemName?: string
  targetSpaceId?: string
  targetSpaceName?: string
  targetLotId?: string
  targetLotName?: string
  createdAtTick: number
  status: SocialInvitationStatus
  reason?: string
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
  relationships?: CharacterRelationship[]
  queuedActions?: Intent[]
  incomingSocialInvitations: SocialInvitation[]
  outgoingSocialInvitations: SocialInvitation[]
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
  comfort?: number
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
  /** "work" (default) or "sleep". Sleep shifts point at the character's home lot. */
  activity?: string | null
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
  /** When the action targets an animal (e.g. pet_animal), the animal being interacted with. */
  animalTargetId?: string
  animalTargetName?: string
  inviteContextType?: InviteOverContext
  proposedRelationshipLabel?: RelationshipProposalLabel
  hostedFollowUp?: TaskStep
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
  animalTargetId?: string
  animalTargetName?: string
  inviteContextType?: InviteOverContext
  proposedRelationshipLabel?: RelationshipProposalLabel
  hostedFollowUp?: Omit<TaskStep, 'hostedFollowUp'>
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
  comfort?: number
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
