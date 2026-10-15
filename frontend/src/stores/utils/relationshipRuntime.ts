import type { CharacterRelationship, CharacterState, Intent } from '../types'
import { hasBloodFamilyLabel } from './family'
import { evaluateRelationshipEvents } from './relationshipEvents'
import { joinNames } from './groupSocial'

const LUNCH_START_HOUR = 11
const LUNCH_END_HOUR = 14
const MIN_RELATIONSHIP_SCORE = 0
const MAX_RELATIONSHIP_SCORE = 1
const SHORT_TERM_DECAY_PER_TICK = 0.01
const LONG_TERM_DECAY_PER_TICK = 0.002
const MILESTONE_LABELS = ['best friend', 'attracted to', 'casual relationship'] as const
const ROMANTIC_EVENT_TYPES = new Set(['date', 'text_romance', 'call_romance', 'invite_over'])
const SHARED_EXPERIENCE_EVENT_TYPES = new Set([
  'ate_lunch_together',
  'watched_a_movie_together',
  'reunited_after_long_absence',
  'invite_over'
])

const RELATIONSHIP_EVENT_SCORES: Record<string, { shortTerm: number; longTerm: number }> = {
  first_met: { shortTerm: 0.08, longTerm: 0.03 },
  // Chat and date are recorded once per conversation by the initiator. They used to be applied
  // once per participant (so twice per pair); these values are doubled to keep the same pace.
  chat_friend: { shortTerm: 0.24, longTerm: 0.06 },
  date: { shortTerm: 0.36, longTerm: 0.12 },
  text_romance: { shortTerm: 0.05, longTerm: 0.01 },
  call_romance: { shortTerm: 0.08, longTerm: 0.02 },
  invite_over: { shortTerm: 0.1, longTerm: 0.025 },
  propose_relationship: { shortTerm: 0.12, longTerm: 0.05 },
  ate_lunch_together: { shortTerm: 0.07, longTerm: 0.025 },
  watched_a_movie_together: { shortTerm: 0.06, longTerm: 0.02 },
  reunited_after_long_absence: { shortTerm: 0.05, longTerm: 0.015 }
}

export interface RelationshipRuntimeDependencies {
  persistCharacterRelationship: (input: {
    id?: string
    fromCharacterId: string
    toCharacterId: string
    shortTermScore?: number
    longTermScore?: number
    labels?: string[]
    lastSeenAt?: string
    lastSpokeAt?: string
    isDeceasedTarget?: boolean
  }) => Promise<CharacterRelationship>
  createStructuredCharacterLongTermMemory: (input: {
    characterId: string
    content: string
    relationshipIds?: string[]
    eventType?: string
    locationLotId?: string
    locationLotName?: string
    locationSpaceId?: string
    locationSpaceName?: string
    createdAt?: string
  }) => Promise<void>
  /** Called for events worth telling the player about (see relationshipEvents.ts). */
  onNotableEvent?: (event: { type: string; message: string; characterIds: string[] }) => void
}

interface RelationshipLocation {
  lotId?: string | null
  lotName?: string | null
  spaceId?: string | null
  spaceName?: string | null
}

function haveSameLabels({
  left,
  right
}: {
  left: string[]
  right: string[]
}): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((label, index) => label === right[index])
}

function appendRelationshipLabel({
  labels,
  label
}: {
  labels: string[]
  label: string
}): string[] {
  if (labels.includes(label)) {
    return labels
  }

  return [...labels, label]
}

function buildRelationshipMilestoneLabels({
  relationship,
  memories
}: {
  relationship: CharacterRelationship
  memories: CharacterState['longTermMemories']
}): string[] {
  const relationshipMemories = (memories || []).filter((memory) =>
    (memory.relationshipIds || []).includes(relationship.id)
  )
  const eventTypes = new Set(
    relationshipMemories
      .map((memory) => memory.eventType)
      .filter((eventType): eventType is string => Boolean(eventType))
  )

  const romanticEventTypes = [...eventTypes].filter((eventType) => ROMANTIC_EVENT_TYPES.has(eventType))
  const sharedExperienceEventTypes = [...eventTypes].filter((eventType) => SHARED_EXPERIENCE_EVENT_TYPES.has(eventType))
  const nextLabels: string[] = []

  // Blood relatives never gain romantic milestone labels ("attracted to" etc.).
  const isBloodRelative = hasBloodFamilyLabel(relationship.labels)

  if (
    relationship.longTermScore >= 0.55
    && eventTypes.has('first_met')
    && sharedExperienceEventTypes.length >= 2
  ) {
    nextLabels.push('best friend')
  }

  if (
    !isBloodRelative
    && relationship.longTermScore >= 0.35
    && relationship.shortTermScore >= 0.15
    && romanticEventTypes.length >= 1
  ) {
    nextLabels.push('attracted to')
  }

  if (
    !isBloodRelative
    && relationship.longTermScore >= 0.5
    && relationship.shortTermScore >= 0.3
    && romanticEventTypes.length >= 2
    && (eventTypes.has('invite_over') || eventTypes.has('date'))
  ) {
    nextLabels.push('casual relationship')
  }

  return nextLabels
}

async function syncRelationshipMilestoneLabels({
  characterState,
  relationshipId,
  dependencies
}: {
  characterState: CharacterState
  relationshipId: string
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  const relationship = (characterState.relationships || []).find((entry) => entry.id === relationshipId)
  if (!relationship) {
    return
  }

  const preservedLabels = relationship.labels.filter((label) => !MILESTONE_LABELS.includes(label as typeof MILESTONE_LABELS[number]))
  const milestoneLabels = buildRelationshipMilestoneLabels({
    relationship,
    memories: characterState.longTermMemories
  })
  const nextLabels = [...preservedLabels, ...milestoneLabels]

  if (haveSameLabels({
    left: relationship.labels,
    right: nextLabels
  })) {
    return
  }

  await persistUpdatedRelationship({
    fromState: characterState,
    relationship: {
      ...relationship,
      labels: nextLabels
    },
    dependencies
  })
}

function clampRelationshipScore(score: number): number {
  return Math.min(MAX_RELATIONSHIP_SCORE, Math.max(MIN_RELATIONSHIP_SCORE, score))
}

function roundRelationshipScore(score: number): number {
  return Math.round(score * 1000) / 1000
}

function getRelationshipEventDelta(eventType: string): { shortTerm: number; longTerm: number } {
  return RELATIONSHIP_EVENT_SCORES[eventType] || { shortTerm: 0, longTerm: 0 }
}

function buildUpdatedRelationship({
  relationship,
  shortTermScore,
  longTermScore,
  lastSeenAt,
  lastSpokeAt
}: {
  relationship: CharacterRelationship
  shortTermScore?: number
  longTermScore?: number
  lastSeenAt?: string
  lastSpokeAt?: string
}): CharacterRelationship {
  return {
    ...relationship,
    shortTermScore: roundRelationshipScore(clampRelationshipScore(shortTermScore ?? relationship.shortTermScore)),
    longTermScore: roundRelationshipScore(clampRelationshipScore(longTermScore ?? relationship.longTermScore)),
    lastSeenAt: lastSeenAt ?? relationship.lastSeenAt ?? null,
    lastSpokeAt: lastSpokeAt ?? relationship.lastSpokeAt ?? null
  }
}

function upsertLocalRelationship(state: CharacterState, relationship: CharacterRelationship): void {
  const relationships = state.relationships || []
  const existingIndex = relationships.findIndex((entry) => entry.id === relationship.id)
  if (existingIndex >= 0) {
    relationships.splice(existingIndex, 1, relationship)
    state.relationships = [...relationships]
    return
  }

  state.relationships = [...relationships, relationship]
}

async function ensureDirectionalRelationship({
  fromCharacterId,
  toCharacterId,
  fromState,
  lastSeenAt,
  lastSpokeAt,
  dependencies
}: {
  fromCharacterId: string
  toCharacterId: string
  fromState: CharacterState
  lastSeenAt?: string
  lastSpokeAt?: string
  dependencies: RelationshipRuntimeDependencies
}): Promise<{ relationship: CharacterRelationship; created: boolean }> {
  const existing = (fromState.relationships || []).find((entry) => entry.toCharacterId === toCharacterId)
  const relationship = await dependencies.persistCharacterRelationship({
    id: existing?.id,
    fromCharacterId,
    toCharacterId,
    shortTermScore: existing?.shortTermScore ?? 0,
    longTermScore: existing?.longTermScore ?? 0,
    labels: existing?.labels ?? [],
    lastSeenAt: lastSeenAt ?? existing?.lastSeenAt ?? undefined,
    lastSpokeAt: lastSpokeAt ?? existing?.lastSpokeAt ?? undefined,
    isDeceasedTarget: existing?.isDeceasedTarget ?? false
  })

  upsertLocalRelationship(fromState, relationship)
  return {
    relationship,
    created: !existing
  }
}

async function persistUpdatedRelationship({
  fromState,
  relationship,
  dependencies
}: {
  fromState: CharacterState
  relationship: CharacterRelationship
  dependencies: RelationshipRuntimeDependencies
}): Promise<CharacterRelationship> {
  const persistedRelationship = await dependencies.persistCharacterRelationship({
    id: relationship.id,
    fromCharacterId: relationship.fromCharacterId,
    toCharacterId: relationship.toCharacterId,
    shortTermScore: relationship.shortTermScore,
    longTermScore: relationship.longTermScore,
    labels: relationship.labels,
    lastSeenAt: relationship.lastSeenAt ?? undefined,
    lastSpokeAt: relationship.lastSpokeAt ?? undefined,
    isDeceasedTarget: relationship.isDeceasedTarget
  })

  upsertLocalRelationship(fromState, persistedRelationship)
  return persistedRelationship
}

async function applyRelationshipEventDelta({
  relationship,
  fromState,
  eventType,
  dependencies
}: {
  relationship: CharacterRelationship
  fromState: CharacterState
  eventType: string
  dependencies: RelationshipRuntimeDependencies
}): Promise<CharacterRelationship> {
  const delta = getRelationshipEventDelta(eventType)
  const updatedRelationship = buildUpdatedRelationship({
    relationship,
    shortTermScore: relationship.shortTermScore + delta.shortTerm,
    longTermScore: relationship.longTermScore + delta.longTerm
  })

  return persistUpdatedRelationship({
    fromState,
    relationship: updatedRelationship,
    dependencies
  })
}

async function createFirstMetMemory({
  characterId,
  otherCharacterName,
  relationshipId,
  timestamp,
  location,
  dependencies
}: {
  characterId: string
  otherCharacterName: string
  relationshipId: string
  timestamp: string
  location: {
    lotId?: string | null
    lotName?: string | null
    spaceId?: string | null
    spaceName?: string | null
  }
  dependencies: RelationshipRuntimeDependencies
  }): Promise<void> {
  await dependencies.createStructuredCharacterLongTermMemory({
    characterId,
    content: `Met ${otherCharacterName} for the first time.`,
    relationshipIds: [relationshipId],
    eventType: 'first_met',
    locationLotId: location.lotId ?? undefined,
    locationLotName: location.lotName ?? undefined,
    locationSpaceId: location.spaceId ?? undefined,
    locationSpaceName: location.spaceName ?? undefined,
    createdAt: timestamp
  })
}

function getMinutesSinceTimestamp(timestamp: string | null | undefined, currentTimestamp: string): number | null {
  if (!timestamp) {
    return null
  }

  const previous = new Date(timestamp).getTime()
  const current = new Date(currentTimestamp).getTime()
  if (Number.isNaN(previous) || Number.isNaN(current)) {
    return null
  }

  return Math.max(0, Math.round((current - previous) / 60000))
}

function isLunchTime(timestamp: string): boolean {
  const date = new Date(timestamp)
  const hour = date.getHours()
  return hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR
}

function getDirectContactMemoryContent({
  action,
  targetName,
  proposedRelationshipLabel
}: {
  action: Intent['action']
  targetName: string
  proposedRelationshipLabel?: string
}): string {
  if (action === 'text_romance') {
    return `Texted ${targetName}.`
  }

  if (action === 'call_romance') {
    return `Called ${targetName}.`
  }

  if (action === 'invite_over') {
    return `Invited ${targetName} over.`
  }

  if (action === 'propose_relationship') {
    return proposedRelationshipLabel
      ? `Asked ${targetName} to become ${proposedRelationshipLabel}.`
      : `Asked ${targetName} to define the relationship.`
  }

  return `Contacted ${targetName}.`
}

async function createLinkedRelationshipMemory({
  characterId,
  content,
  relationshipId,
  timestamp,
  eventType,
  location,
  dependencies
}: {
  characterId: string
  content: string
  relationshipId: string
  timestamp: string
  eventType: string
  location: RelationshipLocation
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  await dependencies.createStructuredCharacterLongTermMemory({
    characterId,
    content,
    relationshipIds: [relationshipId],
    eventType,
    locationLotId: location.lotId ?? undefined,
    locationLotName: location.lotName ?? undefined,
    locationSpaceId: location.spaceId ?? undefined,
    locationSpaceName: location.spaceName ?? undefined,
    createdAt: timestamp
  })
}

async function createPairedRelationshipMemories({
  forwardRelationship,
  reverseRelationship,
  characterId,
  targetCharacterId,
  characterState,
  targetState,
  timestamp,
  location,
  eventType,
  buildForwardContent,
  buildReverseContent,
  dependencies
}: {
  forwardRelationship: CharacterRelationship
  reverseRelationship: CharacterRelationship
  characterId: string
  targetCharacterId: string
  characterState: CharacterState
  targetState: CharacterState
  timestamp: string
  location: RelationshipLocation
  eventType: string
  buildForwardContent: (params: { characterState: CharacterState; targetState: CharacterState }) => string
  buildReverseContent: (params: { characterState: CharacterState; targetState: CharacterState }) => string
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  await createLinkedRelationshipMemory({
    characterId,
    content: buildForwardContent({ characterState, targetState }),
    relationshipId: forwardRelationship.id,
    timestamp,
    eventType,
    location,
    dependencies
  })

  await createLinkedRelationshipMemory({
    characterId: targetCharacterId,
    content: buildReverseContent({ characterState, targetState }),
    relationshipId: reverseRelationship.id,
    timestamp,
    eventType,
    location,
    dependencies
  })
}

export async function decayCharacterRelationships({
  characterState,
  dependencies
}: {
  characterState: CharacterState
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  const relationships = characterState.relationships || []

  for (const relationship of relationships) {
    const decayedRelationship = buildUpdatedRelationship({
      relationship,
      shortTermScore: relationship.shortTermScore - SHORT_TERM_DECAY_PER_TICK,
      longTermScore: relationship.longTermScore - LONG_TERM_DECAY_PER_TICK
    })

    const scoreChanged = decayedRelationship.shortTermScore !== relationship.shortTermScore
      || decayedRelationship.longTermScore !== relationship.longTermScore

    if (!scoreChanged) {
      continue
    }

    await persistUpdatedRelationship({
      fromState: characterState,
      relationship: decayedRelationship,
      dependencies
    })
    await syncRelationshipMilestoneLabels({
      characterState,
      relationshipId: relationship.id,
      dependencies
    })
  }
}

export async function recordRelationshipEncounter({
  characterId,
  targetCharacterId,
  characterState,
  targetState,
  timestamp,
  location,
  dependencies
}: {
  characterId: string
  targetCharacterId: string
  characterState: CharacterState
  targetState: CharacterState
  timestamp: string
  location: {
    lotId?: string | null
    lotName?: string | null
    spaceId?: string | null
    spaceName?: string | null
  }
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  const previousForwardLastSeenAt = (characterState.relationships || []).find(
    (entry) => entry.toCharacterId === targetCharacterId
  )?.lastSeenAt
  const previousReverseLastSeenAt = (targetState.relationships || []).find(
    (entry) => entry.toCharacterId === characterId
  )?.lastSeenAt
  const forward = await ensureDirectionalRelationship({
    fromCharacterId: characterId,
    toCharacterId: targetCharacterId,
    fromState: characterState,
    lastSeenAt: timestamp,
    dependencies
  })
  const reverse = await ensureDirectionalRelationship({
    fromCharacterId: targetCharacterId,
    toCharacterId: characterId,
    fromState: targetState,
    lastSeenAt: timestamp,
    dependencies
  })

  let forwardRelationship = forward.relationship
  let reverseRelationship = reverse.relationship

  if (forward.created) {
    await createFirstMetMemory({
      characterId,
      otherCharacterName: targetState.name,
      relationshipId: forward.relationship.id,
      timestamp,
      location,
      dependencies
    })
    forwardRelationship = await applyRelationshipEventDelta({
      relationship: forward.relationship,
      fromState: characterState,
      eventType: 'first_met',
      dependencies
    })
  }

  if (reverse.created) {
    await createFirstMetMemory({
      characterId: targetCharacterId,
      otherCharacterName: characterState.name,
      relationshipId: reverse.relationship.id,
      timestamp,
      location,
      dependencies
    })
    reverseRelationship = await applyRelationshipEventDelta({
      relationship: reverse.relationship,
      fromState: targetState,
      eventType: 'first_met',
      dependencies
    })
  }

  if (!forward.created && !reverse.created) {
    const events = evaluateRelationshipEvents({
      characterState,
      targetState,
      forward: forward.relationship,
      reverse: reverse.relationship,
      minutesApart: {
        forward: getMinutesSinceTimestamp(previousForwardLastSeenAt, timestamp),
        reverse: getMinutesSinceTimestamp(previousReverseLastSeenAt, timestamp)
      }
    })

    for (const event of events) {
      await createPairedRelationshipMemories({
        forwardRelationship: forward.relationship,
        reverseRelationship: reverse.relationship,
        characterId,
        targetCharacterId,
        characterState,
        targetState,
        timestamp,
        location,
        eventType: event.type,
        buildForwardContent: () => event.forwardMemory,
        buildReverseContent: () => event.reverseMemory,
        dependencies
      })
      forwardRelationship = await applyRelationshipEventDelta({
        relationship: forward.relationship,
        fromState: characterState,
        eventType: event.type,
        dependencies
      })
      reverseRelationship = await applyRelationshipEventDelta({
        relationship: reverse.relationship,
        fromState: targetState,
        eventType: event.type,
        dependencies
      })
      if (event.notable && event.logMessage) {
        dependencies.onNotableEvent?.({
          type: event.type,
          message: event.logMessage,
          characterIds: [characterId, targetCharacterId]
        })
      }
    }
  }

  await syncRelationshipMilestoneLabels({
    characterState,
    relationshipId: forwardRelationship.id,
    dependencies
  })
  await syncRelationshipMilestoneLabels({
    characterState: targetState,
    relationshipId: reverseRelationship.id,
    dependencies
  })
}

export async function recordRelationshipConversation({
  characterId,
  targetCharacterId,
  characterState,
  targetState,
  timestamp,
  intent,
  dependencies
}: {
  characterId: string
  targetCharacterId: string
  characterState: CharacterState
  targetState: CharacterState
  timestamp: string
  intent: Intent
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  const forward = await ensureDirectionalRelationship({
    fromCharacterId: characterId,
    toCharacterId: targetCharacterId,
    fromState: characterState,
    lastSeenAt: timestamp,
    lastSpokeAt: timestamp,
    dependencies
  })
  const reverse = await ensureDirectionalRelationship({
    fromCharacterId: targetCharacterId,
    toCharacterId: characterId,
    fromState: targetState,
    lastSeenAt: timestamp,
    lastSpokeAt: timestamp,
    dependencies
  })

  const location = {
    lotId: intent.targetLotId,
    lotName: intent.targetLotName,
    spaceId: intent.targetSpaceId,
    spaceName: intent.targetSpaceName
  }
  let forwardRelationship = forward.relationship
  let reverseRelationship = reverse.relationship

  if (forward.created) {
    await createFirstMetMemory({
      characterId,
      otherCharacterName: targetState.name,
      relationshipId: forward.relationship.id,
      timestamp,
      location,
      dependencies
    })
    forwardRelationship = await applyRelationshipEventDelta({
      relationship: forwardRelationship,
      fromState: characterState,
      eventType: 'first_met',
      dependencies
    })
  }

  if (reverse.created) {
    await createFirstMetMemory({
      characterId: targetCharacterId,
      otherCharacterName: characterState.name,
      relationshipId: reverse.relationship.id,
      timestamp,
      location,
      dependencies
    })
    reverseRelationship = await applyRelationshipEventDelta({
      relationship: reverseRelationship,
      fromState: targetState,
      eventType: 'first_met',
      dependencies
    })
  }

  forwardRelationship = await applyRelationshipEventDelta({
    relationship: buildUpdatedRelationship({
      relationship: forwardRelationship,
      lastSeenAt: timestamp,
      lastSpokeAt: timestamp
    }),
    fromState: characterState,
    eventType: intent.action,
    dependencies
  })
  reverseRelationship = await applyRelationshipEventDelta({
    relationship: buildUpdatedRelationship({
      relationship: reverseRelationship,
      lastSeenAt: timestamp,
      lastSpokeAt: timestamp
    }),
    fromState: targetState,
    eventType: intent.action,
    dependencies
  })

  await syncRelationshipMilestoneLabels({
    characterState,
    relationshipId: forwardRelationship.id,
    dependencies
  })
  await syncRelationshipMilestoneLabels({
    characterState: targetState,
    relationshipId: reverseRelationship.id,
    dependencies
  })
}

export const GROUP_CHAT_EVENT_TYPE = 'group_chat'

/**
 * A chat between three or more people, recorded once by the initiator. Every pair gets the
 * ordinary conversation update (both directions, first-met handling, milestone labels), so
 * everyone who talked grows closer to everyone else, and each person gets a single group
 * memory linked to their relationships with the others (rather than one memory per pair).
 */
export async function recordGroupConversation({
  participants,
  timestamp,
  intent,
  dependencies
}: {
  participants: Array<{ id: string; state: CharacterState }>
  timestamp: string
  intent: Intent
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      await recordRelationshipConversation({
        characterId: participants[i].id,
        targetCharacterId: participants[j].id,
        characterState: participants[i].state,
        targetState: participants[j].state,
        timestamp,
        intent,
        dependencies
      })
    }
  }

  const location = {
    lotId: intent.targetLotId,
    lotName: intent.targetLotName,
    spaceId: intent.targetSpaceId,
    spaceName: intent.targetSpaceName
  }
  for (const participant of participants) {
    const others = participants.filter((other) => other.id !== participant.id)
    const relationshipIds = others
      .map((other) => participant.state.relationships?.find((rel) => rel.toCharacterId === other.id)?.id)
      .filter((id): id is string => !!id)
    await dependencies.createStructuredCharacterLongTermMemory({
      characterId: participant.id,
      content: `Chatted with ${joinNames(others.map((other) => other.state.name))}.`,
      relationshipIds,
      eventType: GROUP_CHAT_EVENT_TYPE,
      locationLotId: location.lotId ?? undefined,
      locationLotName: location.lotName ?? undefined,
      locationSpaceId: location.spaceId ?? undefined,
      locationSpaceName: location.spaceName ?? undefined,
      createdAt: timestamp
    })
  }
}

export async function recordRelationshipDirectContact({
  characterId,
  targetCharacterId,
  characterState,
  targetState,
  timestamp,
  intent,
  dependencies
}: {
  characterId: string
  targetCharacterId: string
  characterState: CharacterState
  targetState: CharacterState
  timestamp: string
  intent: Intent
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  let forwardRelationship = (
    characterState.relationships || []
  ).find((entry) => entry.toCharacterId === targetCharacterId)
  let reverseRelationship = (
    targetState.relationships || []
  ).find((entry) => entry.toCharacterId === characterId)

  if (!forwardRelationship || !reverseRelationship) {
    return
  }

  forwardRelationship = await applyRelationshipEventDelta({
    relationship: buildUpdatedRelationship({
      relationship: forwardRelationship,
      lastSpokeAt: timestamp
    }),
    fromState: characterState,
    eventType: intent.action,
    dependencies
  })

  reverseRelationship = await applyRelationshipEventDelta({
    relationship: buildUpdatedRelationship({
      relationship: reverseRelationship,
      lastSpokeAt: timestamp
    }),
    fromState: targetState,
    eventType: intent.action,
    dependencies
  })

  await createPairedRelationshipMemories({
    forwardRelationship,
    reverseRelationship,
    characterId,
    targetCharacterId,
    characterState,
    targetState,
    timestamp,
    location: {
      lotId: intent.targetLotId,
      lotName: intent.targetLotName,
      spaceId: intent.targetSpaceId,
      spaceName: intent.targetSpaceName
    },
    eventType: intent.action,
    buildForwardContent: () => getDirectContactMemoryContent({
      action: intent.action,
      targetName: targetState.name,
      proposedRelationshipLabel: intent.proposedRelationshipLabel
    }),
    buildReverseContent: () => getDirectContactMemoryContent({
      action: intent.action,
      targetName: characterState.name,
      proposedRelationshipLabel: intent.proposedRelationshipLabel
    }),
    dependencies
  })

  await syncRelationshipMilestoneLabels({
    characterState,
    relationshipId: forwardRelationship.id,
    dependencies
  })
  await syncRelationshipMilestoneLabels({
    characterState: targetState,
    relationshipId: reverseRelationship.id,
    dependencies
  })
}

export async function recordRelationshipProposal({
  characterId,
  targetCharacterId,
  characterState,
  targetState,
  timestamp,
  intent,
  dependencies
}: {
  characterId: string
  targetCharacterId: string
  characterState: CharacterState
  targetState: CharacterState
  timestamp: string
  intent: Intent
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  const proposedRelationshipLabel = intent.proposedRelationshipLabel
  if (!proposedRelationshipLabel) {
    return
  }

  let forwardRelationship = (
    characterState.relationships || []
  ).find((entry) => entry.toCharacterId === targetCharacterId)
  let reverseRelationship = (
    targetState.relationships || []
  ).find((entry) => entry.toCharacterId === characterId)

  if (!forwardRelationship || !reverseRelationship) {
    return
  }

  forwardRelationship = await applyRelationshipEventDelta({
    relationship: buildUpdatedRelationship({
      relationship: forwardRelationship,
      lastSpokeAt: timestamp
    }),
    fromState: characterState,
    eventType: 'propose_relationship',
    dependencies
  })

  reverseRelationship = await applyRelationshipEventDelta({
    relationship: buildUpdatedRelationship({
      relationship: reverseRelationship,
      lastSpokeAt: timestamp
    }),
    fromState: targetState,
    eventType: 'propose_relationship',
    dependencies
  })

  await createPairedRelationshipMemories({
    forwardRelationship,
    reverseRelationship,
    characterId,
    targetCharacterId,
    characterState,
    targetState,
    timestamp,
    location: {
      lotId: intent.targetLotId,
      lotName: intent.targetLotName,
      spaceId: intent.targetSpaceId,
      spaceName: intent.targetSpaceName
    },
    eventType: 'propose_relationship',
    buildForwardContent: () => `Asked ${targetState.name} to become ${proposedRelationshipLabel}. ${targetState.name} said yes.`,
    buildReverseContent: () => `${characterState.name} asked to become ${proposedRelationshipLabel}. Said yes.`,
    dependencies
  })

  forwardRelationship = await persistUpdatedRelationship({
    fromState: characterState,
    relationship: {
      ...forwardRelationship,
      labels: appendRelationshipLabel({
        labels: forwardRelationship.labels,
        label: proposedRelationshipLabel
      })
    },
    dependencies
  })

  reverseRelationship = await persistUpdatedRelationship({
    fromState: targetState,
    relationship: {
      ...reverseRelationship,
      labels: appendRelationshipLabel({
        labels: reverseRelationship.labels,
        label: proposedRelationshipLabel
      })
    },
    dependencies
  })

  await syncRelationshipMilestoneLabels({
    characterState,
    relationshipId: forwardRelationship.id,
    dependencies
  })
  await syncRelationshipMilestoneLabels({
    characterState: targetState,
    relationshipId: reverseRelationship.id,
    dependencies
  })
}

export async function recordSharedMeal({
  characterId,
  targetCharacterId,
  characterState,
  targetState,
  timestamp,
  intent,
  dependencies
}: {
  characterId: string
  targetCharacterId: string
  characterState: CharacterState
  targetState: CharacterState
  timestamp: string
  intent: Intent
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  if (intent.action !== 'eat' || !isLunchTime(timestamp)) {
    return
  }

  const forward = await ensureDirectionalRelationship({
    fromCharacterId: characterId,
    toCharacterId: targetCharacterId,
    fromState: characterState,
    lastSeenAt: timestamp,
    dependencies
  })
  const reverse = await ensureDirectionalRelationship({
    fromCharacterId: targetCharacterId,
    toCharacterId: characterId,
    fromState: targetState,
    lastSeenAt: timestamp,
    dependencies
  })

  await createPairedRelationshipMemories({
    forwardRelationship: forward.relationship,
    reverseRelationship: reverse.relationship,
    characterId,
    targetCharacterId,
    characterState,
    targetState,
    timestamp,
    location: {
      lotId: intent.targetLotId,
      lotName: intent.targetLotName,
      spaceId: intent.targetSpaceId,
      spaceName: intent.targetSpaceName
    },
    eventType: 'ate_lunch_together',
    buildForwardContent: () => `Ate lunch with ${targetState.name}.`,
    buildReverseContent: () => `Ate lunch with ${characterState.name}.`,
    dependencies
  })
  const updatedForwardRelationship = await applyRelationshipEventDelta({
    relationship: forward.relationship,
    fromState: characterState,
    eventType: 'ate_lunch_together',
    dependencies
  })
  const updatedReverseRelationship = await applyRelationshipEventDelta({
    relationship: reverse.relationship,
    fromState: targetState,
    eventType: 'ate_lunch_together',
    dependencies
  })

  await syncRelationshipMilestoneLabels({
    characterState,
    relationshipId: updatedForwardRelationship.id,
    dependencies
  })
  await syncRelationshipMilestoneLabels({
    characterState: targetState,
    relationshipId: updatedReverseRelationship.id,
    dependencies
  })
}

export async function recordSharedViewingExperience({
  characterId,
  targetCharacterId,
  characterState,
  targetState,
  timestamp,
  intent,
  dependencies
}: {
  characterId: string
  targetCharacterId: string
  characterState: CharacterState
  targetState: CharacterState
  timestamp: string
  intent: Intent
  dependencies: RelationshipRuntimeDependencies
}): Promise<void> {
  if (intent.action !== 'view_movie') {
    return
  }

  const forward = await ensureDirectionalRelationship({
    fromCharacterId: characterId,
    toCharacterId: targetCharacterId,
    fromState: characterState,
    lastSeenAt: timestamp,
    dependencies
  })
  const reverse = await ensureDirectionalRelationship({
    fromCharacterId: targetCharacterId,
    toCharacterId: characterId,
    fromState: targetState,
    lastSeenAt: timestamp,
    dependencies
  })

  await createPairedRelationshipMemories({
    forwardRelationship: forward.relationship,
    reverseRelationship: reverse.relationship,
    characterId,
    targetCharacterId,
    characterState,
    targetState,
    timestamp,
    location: {
      lotId: intent.targetLotId,
      lotName: intent.targetLotName,
      spaceId: intent.targetSpaceId,
      spaceName: intent.targetSpaceName
    },
    eventType: 'watched_a_movie_together',
    buildForwardContent: () => `Watched a movie with ${targetState.name}.`,
    buildReverseContent: () => `Watched a movie with ${characterState.name}.`,
    dependencies
  })
  const updatedForwardRelationship = await applyRelationshipEventDelta({
    relationship: forward.relationship,
    fromState: characterState,
    eventType: 'watched_a_movie_together',
    dependencies
  })
  const updatedReverseRelationship = await applyRelationshipEventDelta({
    relationship: reverse.relationship,
    fromState: targetState,
    eventType: 'watched_a_movie_together',
    dependencies
  })

  await syncRelationshipMilestoneLabels({
    characterState,
    relationshipId: updatedForwardRelationship.id,
    dependencies
  })
  await syncRelationshipMilestoneLabels({
    characterState: targetState,
    relationshipId: updatedReverseRelationship.id,
    dependencies
  })
}
