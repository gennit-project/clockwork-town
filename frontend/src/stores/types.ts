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
  | 'snap'
  | 'belittle'
  | 'argue'
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
  /** The character who owns this animal (OWNS_PET); drives reunions. */
  ownerId?: string | null
  /** When the owner and this animal were last on the same lot (sim ISO time). */
  lastWithOwnerAt?: string | null
  /** Whether they were together last tick, so a reunion fires once on re-meeting. */
  withOwner?: boolean
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
  /** Why this memory was formed, when known (stored as JSON on the server). */
  cause?: Cause
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
  action: Extract<ActionName, 'chat_friend' | 'date' | 'invite_over' | 'propose_relationship' | 'view_art' | 'view_movie'>
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
  cause?: Cause
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
  /** What the current action is aimed at (item, person or pet), for status text; set when an action completes. */
  currentTargetName?: string | null
  traits: string[]
  /** Trait ids (parallel to `traits` display names); drive TRAIT_EFFECTS. */
  traitIds: string[]
  /** Age in years, when known. Unknown ages are treated as possibly a child (see utils/antisocial.ts). */
  age?: number
  /** Ranked values, most important first. See config/valueDefs.ts. */
  values: CharacterValueState[]
  /** Ticks left before this character re-issues a rejected invitation (`action:targetId`). */
  inviteBackoff?: Record<string, number>
  /** What this resident has done so far today (see utils/dailySummary.ts). */
  dayTally?: DayTally
  /** What they approve or disapprove of, by topic id; anything not listed is neutral. */
  stances?: Record<string, StanceValue>
  /** Irritation / jealousy meters with the ledger of what makes them up (see utils/pressure.ts). */
  pressure?: Partial<Record<'irritation' | 'jealousy', MeterState>>
  /** Things they currently hold against people (see utils/witnessReactions.ts). */
  grievances?: Grievance[]
  /** Ticks left before they react again to `${actorId}:${topicId}`. */
  witnessCooldowns?: Record<string, number>
  /** Bookkeeping for antisocial acts: ticks until they can act again, and how many today (see utils/antisocial.ts). */
  antisocial?: { cooldown: number; day: string; count: number }
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

/** `neutral` is an explicit "no opinion", which matters for topics that have a default stance. */
export type StanceValue = 'approves' | 'disapproves' | 'neutral'

/** A pressure meter: its value and what currently makes it up (trigger -> amount; sums to value). */
export interface MeterState {
  value: number
  ledger: Record<string, number>
}

/** Something a witness holds against someone, until it fades or (later) they vent about it. */
export interface Grievance {
  id: string
  aboutCharacterId: string
  aboutName: string
  topicId: string
  /** What the other person was doing, as a phrase: "napping in the daytime". */
  summary: string
  /** Ticks until it fades; refreshed if they do it again. */
  ticksRemaining: number
  /** Times they've done it while this witness was watching. */
  times: number
  /** True once they've talked it over with a friend; it still fades, sooner, but no longer drives them to vent. */
  vented?: boolean
  /** Why the witness holds this: the act, their stance and when. */
  cause?: Cause
  /** True when the act was done to them (the target), not merely witnessed: it weighs more on their irritation. */
  directed?: boolean
}

export interface CharacterValueState {
  id: string
  name: string
  ticksSinceFulfilled: number
}

/** A resident's activity so far today; rolled into a daily summary memory at midnight. */
export interface DayTally {
  /** Completed actions by name. */
  actions: Record<string, number>
  /** Completed actions by lot name. */
  places: Record<string, number>
  /** Times each person was involved in a social action. */
  people: Record<string, number>
}

/** A notable happening worth surfacing to the player (reunions today; grief etc. later). */
export interface SimulationEvent {
  tick: number
  iso: string
  type: string
  message: string
  characterIds: string[]
  cause?: Cause
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
  /** Social friction chosen by pressure, not by the planner. Every such act must carry a cause. */
  antisocial?: boolean
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
  /**
   * Extra participants in a group chat, beyond `socialTargetId` (the primary partner).
   * Only chat_friend is ever a group; `date` is always exactly one other person. After
   * coordination this holds only the people who accepted.
   */
  groupTargetIds?: string[]
  groupTargetNames?: string[]
  /**
   * True on the intent given to someone who accepted an invitation. The initiator records
   * the shared event once; participants must not record it again.
   */
  isSocialParticipant?: boolean
  /** When the action targets an animal (e.g. pet_animal), the animal being interacted with. */
  animalTargetId?: string
  animalTargetName?: string
  inviteContextType?: InviteOverContext
  proposedRelationshipLabel?: RelationshipProposalLabel
  hostedFollowUp?: TaskStep
  steps?: TaskStep[]
  /** Why this decision was made; set on idle intents so the log can explain them. */
  cause?: Cause
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
  groupTargetIds?: string[]
  groupTargetNames?: string[]
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

/** What kind of decision a Cause explains. Extended by later Epic 6 items (antisocial acts, rejections). */
export type CauseKind = 'declined_invitation' | 'idle' | 'disapproval' | 'pressure' | 'antisocial_act'

/** One real number behind a decision, captured when the decision was made. */
export interface CauseFactor {
  label: string
  value: string | number
  threshold?: number
}

/** An auditable "why": built at decision time from the actual inputs, never reconstructed afterwards. */
export interface Cause {
  kind: CauseKind
  summary: string
  factors: CauseFactor[]
}

export interface ActivityLogEntry {
  tick: number
  timestamp: string
  characterId: string
  action: string
  details: string
  cause?: Cause
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

// ============================================
// SERVICE DESK (ALERTS & TICKETS)
// ============================================

export type ServiceDeskSeverity = 'critical' | 'warning' | 'info'

/** A threshold condition on current state. Alerts are derived, never stored. */
export interface Alert {
  /** Stable key: same condition on the same resident always yields the same id. */
  id: string
  rule: string
  severity: ServiceDeskSeverity
  characterId: string
  characterName: string
  message: string
}

export type TicketStatus = 'open' | 'acknowledged' | 'resolved'

/** A discrete resident incident with a lifecycle. */
export interface Ticket {
  id: string
  /** Dedup key; at most one unresolved ticket exists per key. */
  key: string
  rule: string
  severity: ServiceDeskSeverity
  characterId: string
  characterName: string
  title: string
  status: TicketStatus
  openedTick: number
  updatedTick: number
  /** True when the sim closed it because the underlying condition cleared. */
  autoResolved?: boolean
  cause?: Cause
}

export type TicketCandidate = Omit<Ticket, 'id' | 'status' | 'openedTick' | 'updatedTick' | 'autoResolved'>
