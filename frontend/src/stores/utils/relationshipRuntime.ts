import type { CharacterRelationship, CharacterState, Intent } from '../types'

const REUNION_ABSENCE_THRESHOLD_MINUTES = 6 * 60
const LUNCH_START_HOUR = 11
const LUNCH_END_HOUR = 14
const MOVIE_ITEM_PATTERN = /movie|tv|television|screen|projector/i

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
}

interface RelationshipLocation {
  lotId?: string | null
  lotName?: string | null
  spaceId?: string | null
  spaceName?: string | null
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

function formatElapsedHours(minutes: number): string {
  const hours = minutes / 60
  return hours === 1 ? '1 hour' : `${Math.round(hours)} hours`
}

function isLunchTime(timestamp: string): boolean {
  const date = new Date(timestamp)
  const hour = date.getHours()
  return hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR
}

function isMovieViewingIntent(intent: Intent): boolean {
  return intent.action === 'view_art' && MOVIE_ITEM_PATTERN.test(intent.itemName || '')
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

  if (forward.created) {
    await createFirstMetMemory({
      characterId,
      otherCharacterName: targetState.name,
      relationshipId: forward.relationship.id,
      timestamp,
      location,
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
  }

  if (!forward.created && !reverse.created) {
    const forwardMinutesApart = getMinutesSinceTimestamp(previousForwardLastSeenAt, timestamp)
    const reverseMinutesApart = getMinutesSinceTimestamp(previousReverseLastSeenAt, timestamp)
    const longestAbsenceMinutes = Math.max(forwardMinutesApart ?? 0, reverseMinutesApart ?? 0)

    if (longestAbsenceMinutes >= REUNION_ABSENCE_THRESHOLD_MINUTES) {
      const elapsedText = formatElapsedHours(longestAbsenceMinutes)
      await createPairedRelationshipMemories({
        forwardRelationship: forward.relationship,
        reverseRelationship: reverse.relationship,
        characterId,
        targetCharacterId,
        characterState,
        targetState,
        timestamp,
        location,
        eventType: 'reunited_after_long_absence',
        buildForwardContent: () => `Saw ${targetState.name} again after ${elapsedText} apart.`,
        buildReverseContent: () => `Saw ${characterState.name} again after ${elapsedText} apart.`,
        dependencies
      })
    }
  }
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

  if (forward.created) {
    await createFirstMetMemory({
      characterId,
      otherCharacterName: targetState.name,
      relationshipId: forward.relationship.id,
      timestamp,
      location,
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
  }
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
  if (!isMovieViewingIntent(intent)) {
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
}
