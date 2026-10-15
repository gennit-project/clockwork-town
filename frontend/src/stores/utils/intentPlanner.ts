import type {
  ActionName,
  AnimalState,
  CharacterRelationship,
  CharacterState,
  Cooldowns,
  Intent,
  ItemOption,
  ItemOccupancy,
  PlanCandidate,
  TaskStep,
  WorldData
} from '../types'
import { calculateUtility } from './actionUtility'
import { isInvitationBackedOff } from './inviteBackoff'
import { GROUP_FUN, GROUP_SOCIAL } from '../config/social'
import { isGroupFunAction } from './groupSocial'
import { comfortEatBonus, ventingChatBonus } from './venting'
import { isActionDisabled } from './traitEffects'
import { valueUtilityBonus } from './valueEffects'
import { findItemsWithAffordance } from './pathfinding'
import { canAccessLot } from './accessControl'
import { evaluateRelationshipAvailability } from './relationshipAvailability'
import { hasBloodFamilyLabel } from './family'

export interface BuildPlanCandidatesParams {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy?: ItemOccupancy
  characterStates?: Record<string, CharacterState>
  reservedCharacterIds?: string[]
  animalStates?: Record<string, AnimalState>
  reservedAnimalIds?: string[]
}

/** Petting a nearby pet is a touch more appealing than a solo fulfillment hobby. */
const PET_AFFORDANCE_WEIGHT = 1.25

type CooldownAction = keyof Cooldowns

const DEFAULT_PLANNED_ACTIONS: CooldownAction[] = [
  'eat',
  'sleep',
  'use_toilet',
  'shower',
  'medicate',
  'chat_friend',
  'call_mom',
  'date',
  'read',
  'write',
  'view_art',
  'view_movie',
  'volunteer'
]

const RELATIONSHIP_SHORT_TERM_WEIGHT = 2
const RELATIONSHIP_LONG_TERM_WEIGHT = 1
const INVITE_OVER_BONUS = 0.1
const CALL_BONUS = -0.15
const MIN_RELATIONSHIP_SCORE = 0.05

function buildAccessibleItemOptions({
  characterId,
  characterState,
  worldData,
  itemOccupancy,
  matcher
}: {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy: ItemOccupancy
  matcher: (itemId: string) => boolean
}): ItemOption[] {
  const options: ItemOption[] = []

  for (const item of Object.values(worldData.items)) {
    if (!matcher(item.id)) {
      continue
    }

    const withReadAffordance = findItemsWithAffordance({
      characterId,
      action: item.allowedActivities[0] || 'idle',
      characterContext: characterState,
      worldData,
      itemOccupancy
    }).find((option) => option.itemId === item.id)

    if (!withReadAffordance) {
      const space = worldData.spaces[item.spaceId]
      const lot = worldData.lots[item.lotId]
      if (!space || !lot) {
        continue
      }

      let travelCost: number | null = null
      if (item.spaceId === characterState.location.spaceId) {
        travelCost = 0
      } else if (item.lotId === characterState.location.lotId) {
        travelCost = 1
      } else if (item.regionId === characterState.location.regionId) {
        travelCost = 2
      }

      if (travelCost === null) {
        continue
      }

      options.push({
        itemId: item.id,
        itemName: item.name,
        spaceId: item.spaceId,
        spaceName: space.name,
        lotId: item.lotId,
        lotName: lot.name,
        travelCost,
        affordanceWeight: 1
      })
      continue
    }

    options.push(withReadAffordance)
  }

  return options.sort((left, right) => left.travelCost - right.travelCost)
}

function buildDirectStep(action: ActionName, option: ReturnType<typeof findItemsWithAffordance>[number]): TaskStep {
  return {
    action,
    label: `${action}:${option.itemName}`,
    itemId: option.itemId,
    itemName: option.itemName,
    targetSpaceId: option.spaceId,
    targetSpaceName: option.spaceName,
    targetLotId: option.lotId,
    targetLotName: option.lotName,
    totalTicks: 1,
    remainingTicks: 0
  }
}

function buildRelationshipPriorityScore({
  relationship
}: {
  relationship: CharacterRelationship
}): number {
  return (relationship.shortTermScore * RELATIONSHIP_SHORT_TERM_WEIGHT)
    + (relationship.longTermScore * RELATIONSHIP_LONG_TERM_WEIGHT)
}

function buildRelationshipUtilityBonus({
  relationship
}: {
  relationship: CharacterRelationship
}): number {
  return buildRelationshipPriorityScore({ relationship }) / 2
}

function buildAutonomousSocialUtility({
  characterId,
  characterState,
  relationship,
  action,
  travelCost
}: {
  characterId: string
  characterState: CharacterState
  relationship: CharacterRelationship
  action: Extract<ActionName, 'chat_friend' | 'invite_over' | 'call_romance'>
  travelCost: number
}): number {
  const baseUtility = calculateUtility(characterId, 'chat_friend', characterState.needs, {
    itemId: action,
    itemName: action,
    spaceId: characterState.location.spaceId || 'unknown-space',
    spaceName: characterState.location.spaceName || 'Unknown space',
    lotId: characterState.location.lotId || 'unknown-lot',
    lotName: characterState.location.lotName || 'Unknown lot',
    travelCost,
    affordanceWeight: 1
  })

  if (action === 'invite_over') {
    return baseUtility + INVITE_OVER_BONUS + buildRelationshipUtilityBonus({ relationship })
  }

  if (action === 'call_romance') {
    return baseUtility + CALL_BONUS + buildRelationshipUtilityBonus({ relationship })
  }

  return baseUtility + buildRelationshipUtilityBonus({ relationship })
}

function findPreferredInviteFollowUp({
  characterId,
  characterState,
  worldData,
  itemOccupancy
}: {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy: ItemOccupancy
}): TaskStep | null {
  const chatOptions = findItemsWithAffordance({
    characterId,
    action: 'chat_friend',
    characterContext: characterState,
    worldData,
    itemOccupancy
  }).filter((itemOption) => {
    const item = worldData.items[itemOption.itemId]
    const maxUsers = item?.maxSimultaneousUsers
    return itemOption.lotId === characterState.location.lotId
      && (maxUsers === null || maxUsers === undefined || maxUsers >= 2)
  })

  const preferredOption = chatOptions[0]
  if (!preferredOption) {
    return null
  }

  return {
    action: 'chat_friend',
    label: `invite-follow-up:${preferredOption.itemName}`,
    itemId: preferredOption.itemId,
    itemName: preferredOption.itemName,
    targetSpaceId: preferredOption.spaceId,
    targetSpaceName: preferredOption.spaceName,
    targetLotId: preferredOption.lotId,
    targetLotName: preferredOption.lotName,
    totalTicks: 1,
    remainingTicks: 0,
    socialTargetId: characterId,
    socialTargetName: characterState.name
  }
}

function buildDirectPlanCandidates({
  characterId,
  action,
  characterState,
  worldData,
  itemOccupancy
}: {
  characterId: string
  action: ActionName
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy?: ItemOccupancy
}): PlanCandidate[] {
  const items = findItemsWithAffordance({
    characterId,
    action,
    characterContext: characterState,
    worldData,
    itemOccupancy
  })

  return items.map((itemOption) => {
    const primaryStep = buildDirectStep(action, itemOption)
    const utility = calculateUtility(characterId, action, characterState.needs, itemOption)
      + getItemActionModifier({
        action,
        itemId: itemOption.itemId,
        worldData
      })

    return {
      goal: action,
      strategy: `${action}:direct`,
      utility,
      travelCost: itemOption.travelCost,
      primaryStep,
      steps: [primaryStep]
    }
  })
}

function calculateTravelCostToItem({
  characterState,
  itemOption,
  worldData
}: {
  characterState: CharacterState
  itemOption: ItemOption
  worldData: WorldData
}): number | null {
  if (itemOption.spaceId === characterState.location.spaceId) {
    return 0
  }

  if (itemOption.lotId === characterState.location.lotId) {
    return 1
  }

  const targetLot = worldData.lots[itemOption.lotId]
  if (targetLot && targetLot.regionId === characterState.location.regionId) {
    return 2
  }

  return null
}

function buildSocialPlanCandidates({
  action,
  characterId,
  characterState,
  worldData,
  itemOccupancy,
  characterStates = {},
  reservedCharacterIds = []
}: {
  action: 'chat_friend' | 'date' | 'view_art' | 'view_movie'
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy: ItemOccupancy
  characterStates?: Record<string, CharacterState>
  reservedCharacterIds?: string[]
}): PlanCandidate[] {
  const reservedCharacterIdSet = new Set(reservedCharacterIds)
  const isFun = isGroupFunAction(action)
  const socialItemOptions = findItemsWithAffordance({
    characterId,
    action,
    characterContext: characterState,
    worldData,
    itemOccupancy
  }).filter((itemOption) => {
    const maxUsers = worldData.items[itemOption.itemId]?.maxSimultaneousUsers
    return maxUsers === null || maxUsers === undefined || maxUsers >= 2
  })

  const candidates: PlanCandidate[] = []

  for (const itemOption of socialItemOptions) {
    const targetLot = worldData.lots[itemOption.lotId]
    if (!targetLot) {
      continue
    }

    // People who could join a chat at this item, for building a group candidate below.
    const groupPool: GroupPoolEntry[] = []

    for (const [socialTargetId, socialTargetState] of Object.entries(characterStates)) {
      if (socialTargetId === characterId || reservedCharacterIdSet.has(socialTargetId)) {
        continue
      }

      if (socialTargetState.currentTask || (socialTargetState.queuedActions?.length ?? 0) > 0) {
        continue
      }

      if (socialTargetState.cooldowns[action] > 0) {
        continue
      }

      // No romancing blood relatives.
      if (action === 'date') {
        const relationship = characterState.relationships?.find((rel) => rel.toCharacterId === socialTargetId)
        if (hasBloodFamilyLabel(relationship?.labels)) {
          continue
        }
      }

      if (!canAccessLot({
        characterState: socialTargetState,
        lotId: itemOption.lotId,
        isPublic: targetLot.isPublic
      })) {
        continue
      }

      const socialTargetTravelCost = calculateTravelCostToItem({
        characterState: socialTargetState,
        itemOption,
        worldData
      })
      if (socialTargetTravelCost === null) {
        continue
      }

      // Housemates are natural company: nudge chats toward them.
      const isHousehold =
        action === 'chat_friend' &&
        !!characterState.householdId &&
        socialTargetState.householdId === characterState.householdId
      const utility =
        calculateUtility(characterId, action, characterState.needs, {
          ...itemOption,
          travelCost: itemOption.travelCost + socialTargetTravelCost
        }) +
        (isHousehold ? GROUP_SOCIAL.householdChatBonus : 0) +
        // Doing something fun together is better than doing it alone.
        (isFun ? GROUP_FUN.bonusPerOtherParticipant : 0)
      const primaryStep: TaskStep = {
        action,
        label: `${action}:${socialTargetState.name}`,
        itemId: itemOption.itemId,
        itemName: itemOption.itemName,
        targetSpaceId: itemOption.spaceId,
        targetSpaceName: itemOption.spaceName,
        targetLotId: itemOption.lotId,
        targetLotName: itemOption.lotName,
        totalTicks: 1,
        remainingTicks: 0,
        socialTargetId,
        socialTargetName: socialTargetState.name
      }

      const pairCandidate: PlanCandidate = {
        goal: action,
        strategy: `${action}:with-participant`,
        utility,
        travelCost: itemOption.travelCost,
        primaryStep,
        steps: [primaryStep]
      }
      candidates.push(pairCandidate)
      const relationship = characterState.relationships?.find((rel) => rel.toCharacterId === socialTargetId)
      groupPool.push({
        id: socialTargetId,
        name: socialTargetState.name,
        isHousehold,
        // The same bonus a relationship-ranked chat with this person would get (chats only: fun
        // is driven by the group bonus, so a loved one doesn't make a movie outrank eating).
        relationshipBonus: !isFun && relationship ? buildRelationshipUtilityBonus({ relationship }) : 0,
        candidate: pairCandidate
      })
    }

    // A date is always exactly one other person; everything else here can be a group.
    if (action !== 'date') {
      const groupCandidate = buildGroupCandidate({
        action,
        pool: groupPool.filter((entry) => !isInvitationBackedOff(characterState, action, entry.id)),
        maxUsers: worldData.items[itemOption.itemId]?.maxSimultaneousUsers
      })
      if (groupCandidate) {
        candidates.push(groupCandidate)
      }
    }
  }

  return candidates
}

interface GroupPoolEntry {
  id: string
  name: string
  isHousehold: boolean
  /** What this person's relationship adds to a chat with them (see buildRelationshipUtilityBonus). */
  relationshipBonus?: number
  candidate: PlanCandidate
}

/**
 * The best group chat at an item: the best pair candidate plus up to two more people,
 * household first, as far as the item has room for. A group scores a little higher than the
 * same pair, so it is preferred when available but nobody is forced into one. `date` never
 * comes through here: it is always exactly one other person.
 */
/** A group chat; see buildGroupCandidate. */
export function buildGroupChatCandidate(args: { pool: GroupPoolEntry[]; maxUsers: number | null | undefined }): PlanCandidate | null {
  return buildGroupCandidate({ ...args, action: 'chat_friend' })
}

export function buildGroupCandidate({
  action,
  pool,
  maxUsers
}: {
  action: 'chat_friend' | 'view_art' | 'view_movie'
  pool: GroupPoolEntry[]
  /** The item's capacity including the initiator; null/undefined means unlimited. */
  maxUsers: number | null | undefined
}): PlanCandidate | null {
  const bonus = (entry: GroupPoolEntry) => entry.relationshipBonus ?? 0
  const score = (entry: GroupPoolEntry) => entry.candidate.utility + bonus(entry)

  const byScore = [...pool].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
  const [primary, ...rest] = byScore
  if (!primary) return null

  // Seats beyond the initiator and the primary partner.
  const seats = maxUsers === null || maxUsers === undefined ? Infinity : Math.max(0, maxUsers - 2)
  const extrasCount = Math.min(GROUP_SOCIAL.maxGroupExtras, rest.length, seats)
  if (extrasCount < 1) return null

  const extras = rest
    .sort(
      (a, b) =>
        Number(b.isHousehold) - Number(a.isHousehold) || score(b) - score(a) || a.id.localeCompare(b.id)
    )
    .slice(0, extrasCount)

  const names = [primary.name, ...extras.map((extra) => extra.name)]
  const step: TaskStep = {
    ...primary.candidate.primaryStep,
    label: `${action}:${names.join('+')}`,
    groupTargetIds: extras.map((extra) => extra.id),
    groupTargetNames: extras.map((extra) => extra.name)
  }
  const perExtra = action === 'chat_friend' ? GROUP_SOCIAL.groupChatBonusPerExtra : GROUP_FUN.bonusPerOtherParticipant
  const extrasBonus = extras.reduce(
    (sum, extra) => sum + perExtra + bonus(extra) * GROUP_SOCIAL.extraRelationshipWeight,
    0
  )
  return {
    ...primary.candidate,
    strategy: `${action}:group`,
    utility: score(primary) + extrasBonus,
    primaryStep: step,
    steps: [step]
  }
}

function buildRelationshipSocialPlanCandidates({
  characterId,
  characterState,
  worldData,
  itemOccupancy,
  characterStates = {},
  reservedCharacterIds = []
}: {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy: ItemOccupancy
  characterStates?: Record<string, CharacterState>
  reservedCharacterIds?: string[]
}): PlanCandidate[] {
  const reservedCharacterIdSet = new Set(reservedCharacterIds)
  const inviteFollowUp = findPreferredInviteFollowUp({
    characterId,
    characterState,
    worldData,
    itemOccupancy
  })

  const socialCandidates = buildSocialPlanCandidates({
    action: 'chat_friend',
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    characterStates,
    reservedCharacterIds
  })

  const chatCandidatesByTargetId = new Map<string, PlanCandidate>()
  for (const candidate of socialCandidates) {
    const socialTargetId = candidate.primaryStep.socialTargetId
    if (candidate.strategy === 'chat_friend:group') {
      continue
    }
    if (!socialTargetId || chatCandidatesByTargetId.has(socialTargetId)) {
      continue
    }

    chatCandidatesByTargetId.set(socialTargetId, candidate)
  }

  const rankedRelationships = (characterState.relationships || [])
    .filter((relationship) => !relationship.isDeceasedTarget)
    .filter((relationship) => buildRelationshipPriorityScore({ relationship }) >= MIN_RELATIONSHIP_SCORE)
    .sort((left, right) => buildRelationshipPriorityScore({ relationship: right }) - buildRelationshipPriorityScore({ relationship: left }))

  const candidates: PlanCandidate[] = []

  for (const relationship of rankedRelationships) {
    const socialTargetId = relationship.toCharacterId
    const targetState = characterStates[socialTargetId]
    if (!targetState || reservedCharacterIdSet.has(socialTargetId) || socialTargetId === characterId) {
      continue
    }

    const availability = evaluateRelationshipAvailability({
      relationship,
      targetState
    })

    const chatCandidate = chatCandidatesByTargetId.get(socialTargetId)
    if (chatCandidate && availability.canInviteOver) {
      candidates.push({
        ...chatCandidate,
        strategy: 'chat_friend:relationship-ranked',
        utility: buildAutonomousSocialUtility({
          characterId,
          characterState,
          relationship,
          action: 'chat_friend',
          travelCost: chatCandidate.travelCost
        })
      })
      continue
    }

    if (availability.canInviteOver && inviteFollowUp && characterState.cooldowns.invite_over === 0) {
      const primaryStep: TaskStep = {
        action: 'invite_over',
        label: `invite-over:${targetState.name}`,
        targetSpaceId: characterState.location.spaceId || undefined,
        targetSpaceName: characterState.location.spaceName || undefined,
        targetLotId: characterState.location.lotId || undefined,
        targetLotName: characterState.location.lotName || undefined,
        totalTicks: 1,
        remainingTicks: 0,
        socialTargetId,
        socialTargetName: targetState.name,
        inviteContextType: 'hang_out',
        hostedFollowUp: {
          ...inviteFollowUp,
          socialTargetId,
          socialTargetName: targetState.name
        }
      }

      candidates.push({
        goal: 'invite_over',
        strategy: 'invite_over:relationship-ranked',
        utility: buildAutonomousSocialUtility({
          characterId,
          characterState,
          relationship,
          action: 'invite_over',
          travelCost: 0
        }),
        travelCost: 0,
        primaryStep,
        steps: [primaryStep]
      })
      continue
    }

    if (availability.canCall && characterState.cooldowns.call_romance === 0) {
      const primaryStep: TaskStep = {
        action: 'call_romance',
        label: `call:${targetState.name}`,
        totalTicks: 1,
        remainingTicks: 0,
        socialTargetId,
        socialTargetName: targetState.name
      }

      candidates.push({
        goal: 'call_romance',
        strategy: 'call_romance:relationship-ranked',
        utility: buildAutonomousSocialUtility({
          characterId,
          characterState,
          relationship,
          action: 'call_romance',
          travelCost: 0
        }),
        travelCost: 0,
        primaryStep,
        steps: [primaryStep]
      })
    }
  }

  return candidates
}

/**
 * Build `pet_animal` candidates: for every reachable, unreserved animal, a plan
 * to go to wherever the animal currently is and spend time with it. This is the
 * human side of the human–animal interaction; completing it boosts the human's
 * fulfillment/companionship and the animal's affection (applied in the runtime).
 * Reserving an animal (reservedAnimalIds) keeps two people from claiming the
 * same pet in one tick, mirroring the multi-participant social coordination.
 */
function buildAnimalInteractionCandidates({
  characterId,
  characterState,
  worldData,
  animalStates = {},
  reservedAnimalIds = []
}: {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  animalStates?: Record<string, AnimalState>
  reservedAnimalIds?: string[]
}): PlanCandidate[] {
  const reservedAnimalIdSet = new Set(reservedAnimalIds)
  const candidates: PlanCandidate[] = []

  for (const [animalId, animalState] of Object.entries(animalStates)) {
    if (reservedAnimalIdSet.has(animalId)) {
      continue
    }

    const { lotId, lotName, spaceId, spaceName } = animalState.location
    if (!lotId || !spaceId) {
      continue
    }

    const lot = worldData.lots[lotId]
    if (!lot) {
      continue
    }

    if (!canAccessLot({ characterState, lotId, isPublic: lot.isPublic })) {
      continue
    }

    const travelCost = calculateTravelCostToItem({
      characterState,
      itemOption: {
        itemId: `animal:${animalId}`,
        itemName: animalState.name,
        spaceId,
        spaceName: spaceName || lot.name,
        lotId,
        lotName: lotName || lot.name,
        travelCost: 0,
        affordanceWeight: PET_AFFORDANCE_WEIGHT
      },
      worldData
    })
    if (travelCost === null) {
      continue
    }

    const utility = calculateUtility(characterId, 'pet_animal', characterState.needs, {
      itemId: `animal:${animalId}`,
      itemName: animalState.name,
      spaceId,
      spaceName: spaceName || lot.name,
      lotId,
      lotName: lotName || lot.name,
      travelCost,
      affordanceWeight: PET_AFFORDANCE_WEIGHT
    })

    const primaryStep: TaskStep = {
      action: 'pet_animal',
      label: `pet_animal:${animalState.name}`,
      targetSpaceId: spaceId,
      targetSpaceName: spaceName || lot.name,
      targetLotId: lotId,
      targetLotName: lotName || lot.name,
      totalTicks: 1,
      remainingTicks: 0,
      animalTargetId: animalId,
      animalTargetName: animalState.name
    }

    candidates.push({
      goal: 'pet_animal',
      strategy: 'pet_animal:with-animal',
      utility,
      travelCost,
      primaryStep,
      steps: [primaryStep]
    })
  }

  return candidates
}

function getItemActionModifier({
  action,
  itemId,
  worldData
}: {
  action: ActionName
  itemId: string
  worldData: WorldData
}): number {
  if (action !== 'sleep') {
    return 0
  }

  return worldData.items[itemId]?.comfort ?? 0
}

function buildStructuredReadCandidates({
  characterId,
  characterState,
  worldData,
  itemOccupancy
}: {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy: ItemOccupancy
}): PlanCandidate[] {
  const sources = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isBookSource
  })

  const seats = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => {
      const classification = worldData.items[itemId].classification
      return classification.isChairSeat || classification.isBedSeat
    }
  })

  const candidates: PlanCandidate[] = []

  for (const source of sources) {
    for (const seat of seats) {
      const totalTravelCost = source.travelCost + seat.travelCost
      const utility = calculateUtility(characterId, 'read', characterState.needs, {
        ...seat,
        travelCost: totalTravelCost,
        affordanceWeight: seat.affordanceWeight + 0.35
      })
      const steps: TaskStep[] = [
        {
          action: 'read',
          label: `acquire-book:${source.itemName}`,
          itemId: source.itemId,
          itemName: source.itemName,
          targetSpaceId: source.spaceId,
          targetSpaceName: source.spaceName,
          targetLotId: source.lotId,
          targetLotName: source.lotName,
          totalTicks: 1,
          remainingTicks: 0
        },
        {
          action: 'read',
          label: `read-seated:${seat.itemName}`,
          itemId: seat.itemId,
          itemName: seat.itemName,
          targetSpaceId: seat.spaceId,
          targetSpaceName: seat.spaceName,
          targetLotId: seat.lotId,
          targetLotName: seat.lotName,
          totalTicks: 2,
          remainingTicks: 1
        }
      ]

      candidates.push({
        goal: 'read',
        strategy: 'read:bookshelf-seat',
        utility,
        travelCost: totalTravelCost,
        primaryStep: steps[0],
        steps
      })
    }
  }

  return candidates
}

function buildStructuredEatCandidates({
  characterId,
  characterState,
  worldData,
  itemOccupancy
}: {
  characterId: string
  characterState: CharacterState
  worldData: WorldData
  itemOccupancy: ItemOccupancy
}): PlanCandidate[] {
  const storageItems = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isFoodStorage
  })

  const tableSeats = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isTableSeat
  })

  const fallbackSeats = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => {
      const classification = worldData.items[itemId].classification
      return classification.isChairSeat || classification.isLoungeSeat
    }
  })

  const candidates: PlanCandidate[] = []

  candidates.push(...buildSeatedEatCandidates({
    characterId,
    characterState,
    seatOptions: tableSeats,
    sourceOptions: storageItems,
    sourceStepLabel: 'acquire-food',
    strategy: 'eat:stored-food-table',
    seatBonus: 0.4
  }))

  candidates.push(...buildSeatedEatCandidates({
    characterId,
    characterState,
    seatOptions: fallbackSeats,
    sourceOptions: storageItems,
    sourceStepLabel: 'acquire-food',
    strategy: 'eat:stored-food-seat',
    seatBonus: 0.2
  }))

  const takeoutSources = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isTakeoutSource
  })

  candidates.push(...buildSeatedEatCandidates({
    characterId,
    characterState,
    seatOptions: tableSeats,
    sourceOptions: takeoutSources,
    sourceStepLabel: 'order-takeout',
    strategy: 'eat:takeout-table',
    seatBonus: 0.5
  }))

  candidates.push(...buildSeatedEatCandidates({
    characterId,
    characterState,
    seatOptions: fallbackSeats,
    sourceOptions: takeoutSources,
    sourceStepLabel: 'order-takeout',
    strategy: 'eat:takeout-seat',
    seatBonus: 0.3
  }))

  const grocerySources = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isGrocerySource
  })

  const kitchenStations = buildAccessibleItemOptions({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    matcher: (itemId) => worldData.items[itemId].classification.isKitchenStation
  })

  candidates.push(...buildCookedMealCandidates({
    characterId,
    characterState,
    grocerySources,
    kitchenStations,
    seatOptions: tableSeats,
    strategy: 'eat:cook-meal-table',
    seatBonus: 0.7
  }))

  candidates.push(...buildCookedMealCandidates({
    characterId,
    characterState,
    grocerySources,
    kitchenStations,
    seatOptions: fallbackSeats,
    strategy: 'eat:cook-meal-seat',
    seatBonus: 0.45
  }))

  return candidates
}

function buildSeatedEatCandidates({
  characterId,
  characterState,
  sourceOptions,
  seatOptions,
  sourceStepLabel,
  strategy,
  seatBonus
}: {
  characterId: string
  characterState: CharacterState
  sourceOptions: ItemOption[]
  seatOptions: ItemOption[]
  sourceStepLabel: string
  strategy: string
  seatBonus: number
}): PlanCandidate[] {
  const candidates: PlanCandidate[] = []

  for (const source of sourceOptions) {
    for (const seat of seatOptions) {
      const totalTravelCost = source.travelCost + seat.travelCost
      const utility = calculateUtility(characterId, 'eat', characterState.needs, {
        ...seat,
        travelCost: totalTravelCost,
        affordanceWeight: seat.affordanceWeight + seatBonus
      })
      const steps: TaskStep[] = [
        {
          action: 'eat',
          label: `${sourceStepLabel}:${source.itemName}`,
          itemId: source.itemId,
          itemName: source.itemName,
          targetSpaceId: source.spaceId,
          targetSpaceName: source.spaceName,
          targetLotId: source.lotId,
          targetLotName: source.lotName,
          totalTicks: 1,
          remainingTicks: 0
        },
        {
          action: 'eat',
          label: `eat-seated:${seat.itemName}`,
          itemId: seat.itemId,
          itemName: seat.itemName,
          targetSpaceId: seat.spaceId,
          targetSpaceName: seat.spaceName,
          targetLotId: seat.lotId,
          targetLotName: seat.lotName,
          totalTicks: 2,
          remainingTicks: 1
        }
      ]

      candidates.push({
        goal: 'eat',
        strategy,
        utility,
        travelCost: totalTravelCost,
        primaryStep: steps[0],
        steps
      })
    }
  }

  return candidates
}

function buildCookedMealCandidates({
  characterId,
  characterState,
  grocerySources,
  kitchenStations,
  seatOptions,
  strategy,
  seatBonus
}: {
  characterId: string
  characterState: CharacterState
  grocerySources: ItemOption[]
  kitchenStations: ItemOption[]
  seatOptions: ItemOption[]
  strategy: string
  seatBonus: number
}): PlanCandidate[] {
  const candidates: PlanCandidate[] = []

  for (const grocery of grocerySources) {
    for (const kitchen of kitchenStations) {
      for (const seat of seatOptions) {
        const totalTravelCost = grocery.travelCost + kitchen.travelCost + seat.travelCost
        const utility = calculateUtility(characterId, 'eat', characterState.needs, {
          ...seat,
          travelCost: totalTravelCost,
          affordanceWeight: seat.affordanceWeight + seatBonus
        })
        const steps: TaskStep[] = [
          {
            action: 'eat',
            label: `buy-groceries:${grocery.itemName}`,
            itemId: grocery.itemId,
            itemName: grocery.itemName,
            targetSpaceId: grocery.spaceId,
            targetSpaceName: grocery.spaceName,
            targetLotId: grocery.lotId,
            targetLotName: grocery.lotName,
            totalTicks: 1,
            remainingTicks: 0
          },
          {
            action: 'eat',
            label: `cook-meal:${kitchen.itemName}`,
            itemId: kitchen.itemId,
            itemName: kitchen.itemName,
            targetSpaceId: kitchen.spaceId,
            targetSpaceName: kitchen.spaceName,
            targetLotId: kitchen.lotId,
            targetLotName: kitchen.lotName,
            totalTicks: 2,
            remainingTicks: 1
          },
          {
            action: 'eat',
            label: `eat-seated:${seat.itemName}`,
            itemId: seat.itemId,
            itemName: seat.itemName,
            targetSpaceId: seat.spaceId,
            targetSpaceName: seat.spaceName,
            targetLotId: seat.lotId,
            targetLotName: seat.lotName,
            totalTicks: 2,
            remainingTicks: 1
          }
        ]

        candidates.push({
          goal: 'eat',
          strategy,
          utility,
          travelCost: totalTravelCost,
          primaryStep: steps[0],
          steps
        })
      }
    }
  }

  return candidates
}

export function buildPlanCandidates({
  characterId,
  characterState,
  worldData,
  itemOccupancy = {},
  characterStates = {},
  reservedCharacterIds = [],
  animalStates = {},
  reservedAnimalIds = []
}: BuildPlanCandidatesParams): PlanCandidate[] {
  const candidates: PlanCandidate[] = buildRelationshipSocialPlanCandidates({
    characterId,
    characterState,
    worldData,
    itemOccupancy,
    characterStates,
    reservedCharacterIds
  })

  if (characterState.cooldowns.pet_animal === 0) {
    candidates.push(...buildAnimalInteractionCandidates({
      characterId,
      characterState,
      worldData,
      animalStates,
      reservedAnimalIds
    }))
  }

  for (const action of DEFAULT_PLANNED_ACTIONS) {
    if (characterState.cooldowns[action] > 0) {
      continue
    }

    if (action === 'read') {
      candidates.push(...buildStructuredReadCandidates({
        characterId,
        characterState,
        worldData,
        itemOccupancy
      }))
    }

    if (action === 'eat') {
      candidates.push(...buildStructuredEatCandidates({
        characterId,
        characterState,
        worldData,
        itemOccupancy
      }))
    }

    if (action === 'chat_friend' || action === 'date') {
      candidates.push(...buildSocialPlanCandidates({
        action,
        characterId,
        characterState,
        worldData,
        itemOccupancy,
        characterStates,
        reservedCharacterIds
      }))
      continue
    }

    // Fun can be done together as well as alone: add the with-people options, then fall through
    // to the solo ones below.
    if (action === 'view_art' || action === 'view_movie') {
      candidates.push(...buildSocialPlanCandidates({
        action,
        characterId,
        characterState,
        worldData,
        itemOccupancy,
        characterStates,
        reservedCharacterIds
      }))
    }

    candidates.push(...buildDirectPlanCandidates({
      characterId,
      action,
      characterState,
      worldData,
      itemOccupancy
    }))
  }

  // Traits can switch a need off; drop actions that serve it, for the character
  // and for any social target who would have to take part.
  // When bored, group fun beats solo hobbies; if no group option exists, solo is left alone.
  const bored = characterState.needs.fulfillment < GROUP_FUN.boredThreshold
  const groupFunAvailable =
    bored &&
    candidates.some((c) => isGroupFunAction(c.goal) && !!c.primaryStep.socialTargetId)
  const isSoloFun = (c: PlanCandidate) =>
    (GROUP_FUN.soloFunActions as readonly ActionName[]).includes(c.goal) && !c.primaryStep.socialTargetId

  return candidates
    .map((candidate) =>
      groupFunAvailable && isSoloFun(candidate)
        ? { ...candidate, utility: candidate.utility - GROUP_FUN.soloPenalty }
        : candidate
    )
    .map((candidate) => {
      const bonus =
        valueUtilityBonus(characterState, candidate.goal) +
        // Upset: want to complain to a friend (chats), and to comfort-eat.
        (candidate.goal === 'chat_friend' ? ventingChatBonus(characterState, candidate.primaryStep.socialTargetId) : 0) +
        (candidate.goal === 'eat' ? comfortEatBonus(characterState) : 0)
      return bonus > 0 ? { ...candidate, utility: candidate.utility + bonus } : candidate
    })
    .filter((candidate) => {
      if (isActionDisabled(candidate.goal, characterState.traitIds)) {
        return false
      }
      const targetId = candidate.primaryStep.socialTargetId
      if (targetId && isInvitationBackedOff(characterState, candidate.goal, targetId)) {
        return false
      }
      const targetState = targetId ? characterStates[targetId] : undefined
      return !targetState || !isActionDisabled(candidate.goal, targetState.traitIds)
    })
    .sort((left, right) => {
      if (right.utility !== left.utility) {
        return right.utility - left.utility
      }

      if (left.travelCost !== right.travelCost) {
        return left.travelCost - right.travelCost
      }

      return left.strategy.localeCompare(right.strategy)
    })
}

export function planCandidateToIntent(candidate: PlanCandidate): Intent {
  return {
    goal: candidate.goal,
    strategy: candidate.strategy,
    action: candidate.primaryStep.action,
    itemId: candidate.primaryStep.itemId,
    itemName: candidate.primaryStep.itemName,
    targetSpaceId: candidate.primaryStep.targetSpaceId,
    targetSpaceName: candidate.primaryStep.targetSpaceName,
    targetLotId: candidate.primaryStep.targetLotId,
    targetLotName: candidate.primaryStep.targetLotName,
    travelCost: candidate.travelCost,
    utility: candidate.utility,
    source: 'auto',
    socialTargetId: candidate.primaryStep.socialTargetId,
    socialTargetName: candidate.primaryStep.socialTargetName,
    groupTargetIds: candidate.primaryStep.groupTargetIds,
    groupTargetNames: candidate.primaryStep.groupTargetNames,
    animalTargetId: candidate.primaryStep.animalTargetId,
    animalTargetName: candidate.primaryStep.animalTargetName,
    inviteContextType: candidate.primaryStep.inviteContextType,
    hostedFollowUp: candidate.primaryStep.hostedFollowUp as TaskStep | undefined,
    steps: candidate.steps
  }
}
