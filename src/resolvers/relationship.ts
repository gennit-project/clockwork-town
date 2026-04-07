import { batch, q } from "../kuzuHelpers";

export interface UpsertCharacterRelationshipInput {
  id?: string;
  fromCharacterId: string;
  toCharacterId: string;
  shortTermScore?: number | null;
  longTermScore?: number | null;
  labels?: string[] | null;
  lastSeenAt?: string | null;
  lastSpokeAt?: string | null;
  isDeceasedTarget?: boolean | null;
}

export interface RelationshipMemoryInput {
  relationshipIds?: string[] | null;
}

async function listCharacterRelationships(fromCharacterId: string) {
  return q(`
    MATCH (rel:Relationship {fromCharacterId:$fromCharacterId})
    RETURN
      rel.id AS id,
      rel.fromCharacterId AS fromCharacterId,
      rel.toCharacterId AS toCharacterId,
      rel.shortTermScore AS shortTermScore,
      rel.longTermScore AS longTermScore,
      rel.labels AS labels,
      rel.lastSeenAt AS lastSeenAt,
      rel.lastSpokeAt AS lastSpokeAt,
      rel.isDeceasedTarget AS isDeceasedTarget
    ORDER BY rel.longTermScore DESC, rel.shortTermScore DESC, rel.id ASC
  `, { fromCharacterId });
}

export async function syncMemoryRelationships({
  memoryId,
  relationshipIds = []
}: {
  memoryId: string;
  relationshipIds?: string[] | null;
}) {
  await q(`
    MATCH (rel:Relationship)-[edge:REL_HAS_MEMORY]->(m:Memory {id:$memoryId})
    DELETE edge
  `, { memoryId });

  for (const relationshipId of relationshipIds ?? []) {
    await q(`
      MATCH (rel:Relationship {id:$relationshipId}), (m:Memory {id:$memoryId})
      CREATE (rel)-[:REL_HAS_MEMORY]->(m)
    `, { relationshipId, memoryId });
  }
}

export async function upsertCharacterRelationship(input: UpsertCharacterRelationshipInput) {
  const relationshipId = input.id ?? crypto.randomUUID();
  const [existing] = await q(`
    MATCH (rel:Relationship {fromCharacterId:$fromCharacterId, toCharacterId:$toCharacterId})
    RETURN rel.id AS id
  `, {
    fromCharacterId: input.fromCharacterId,
    toCharacterId: input.toCharacterId
  });

  if (!existing) {
    await batch(async () => {
      await q(`
        CREATE (:Relationship {
          id:$id,
          fromCharacterId:$fromCharacterId,
          toCharacterId:$toCharacterId,
          shortTermScore:$shortTermScore,
          longTermScore:$longTermScore,
          labels:$labels,
          lastSeenAt:$lastSeenAt,
          lastSpokeAt:$lastSpokeAt,
          isDeceasedTarget:$isDeceasedTarget
        })
      `, {
        id: relationshipId,
        fromCharacterId: input.fromCharacterId,
        toCharacterId: input.toCharacterId,
        shortTermScore: input.shortTermScore ?? 0,
        longTermScore: input.longTermScore ?? 0,
        labels: input.labels ?? [],
        lastSeenAt: input.lastSeenAt ?? null,
        lastSpokeAt: input.lastSpokeAt ?? null,
        isDeceasedTarget: input.isDeceasedTarget ?? false
      });

      await q(`
        MATCH (rel:Relationship {id:$relationshipId}), (fromCharacter:Character {id:$fromCharacterId}), (toCharacter:Character {id:$toCharacterId})
        CREATE (rel)-[:FROM_CHARACTER]->(fromCharacter),
               (rel)-[:TO_CHARACTER]->(toCharacter)
      `, {
        relationshipId,
        fromCharacterId: input.fromCharacterId,
        toCharacterId: input.toCharacterId
      });
    });
  } else {
    const setFields: string[] = [];
    const params: Record<string, unknown> = { id: existing.id };

    if (input.shortTermScore !== undefined) {
      setFields.push("rel.shortTermScore = $shortTermScore");
      params.shortTermScore = input.shortTermScore;
    }
    if (input.longTermScore !== undefined) {
      setFields.push("rel.longTermScore = $longTermScore");
      params.longTermScore = input.longTermScore;
    }
    if (input.labels !== undefined) {
      setFields.push("rel.labels = $labels");
      params.labels = input.labels ?? [];
    }
    if (input.lastSeenAt !== undefined) {
      setFields.push("rel.lastSeenAt = $lastSeenAt");
      params.lastSeenAt = input.lastSeenAt;
    }
    if (input.lastSpokeAt !== undefined) {
      setFields.push("rel.lastSpokeAt = $lastSpokeAt");
      params.lastSpokeAt = input.lastSpokeAt;
    }
    if (input.isDeceasedTarget !== undefined) {
      setFields.push("rel.isDeceasedTarget = $isDeceasedTarget");
      params.isDeceasedTarget = input.isDeceasedTarget;
    }

    if (setFields.length > 0) {
      await q(`
        MATCH (rel:Relationship {id:$id})
        SET ${setFields.join(", ")}
      `, params);
    }
  }

  const [relationship] = await q(`
    MATCH (rel:Relationship {id:$id})
    RETURN
      rel.id AS id,
      rel.fromCharacterId AS fromCharacterId,
      rel.toCharacterId AS toCharacterId,
      rel.shortTermScore AS shortTermScore,
      rel.longTermScore AS longTermScore,
      rel.labels AS labels,
      rel.lastSeenAt AS lastSeenAt,
      rel.lastSpokeAt AS lastSpokeAt,
      rel.isDeceasedTarget AS isDeceasedTarget
  `, { id: existing?.id ?? relationshipId });

  return relationship;
}

export const RelationshipResolvers = {
  Query: {
    relationship: async (_: any, { id }: { id: string }) => {
      const [relationship] = await q(`
        MATCH (rel:Relationship {id:$id})
        RETURN
          rel.id AS id,
          rel.fromCharacterId AS fromCharacterId,
          rel.toCharacterId AS toCharacterId,
          rel.shortTermScore AS shortTermScore,
          rel.longTermScore AS longTermScore,
          rel.labels AS labels,
          rel.lastSeenAt AS lastSeenAt,
          rel.lastSpokeAt AS lastSpokeAt,
          rel.isDeceasedTarget AS isDeceasedTarget
      `, { id });

      return relationship ?? null;
    },
    relationships: async (_: any, { fromCharacterId }: { fromCharacterId: string }) =>
      listCharacterRelationships(fromCharacterId)
  },
  Mutation: {
    upsertCharacterRelationship: async (_: any, { input }: { input: UpsertCharacterRelationshipInput }) =>
      upsertCharacterRelationship(input)
  },
  Character: {
    relationships: async (parent: { id: string }) =>
      listCharacterRelationships(parent.id),
    knownCharacters: async (parent: { id: string }) =>
      listCharacterRelationships(parent.id),
    knownAnimals: async () => []
  },
  Relationship: {
    from: async (parent: { fromCharacterId?: string | null; id: string }) => {
      const fromCharacterId = parent.fromCharacterId
        ?? ((await q(`
          MATCH (rel:Relationship {id:$id})-[:FROM_CHARACTER]->(fromCharacter:Character)
          RETURN fromCharacter.id AS id
        `, { id: parent.id }))[0]?.id ?? null);

      if (!fromCharacterId) {
        return null;
      }

      const [character] = await q(`
        MATCH (character:Character {id:$id})
        RETURN character.id AS id, character.name AS name, character.age AS age, character.bio AS bio
      `, { id: fromCharacterId });
      return character ?? null;
    },
    to: async (parent: { toCharacterId?: string | null; id: string }) => {
      const toCharacterId = parent.toCharacterId
        ?? ((await q(`
          MATCH (rel:Relationship {id:$id})-[:TO_CHARACTER]->(toCharacter:Character)
          RETURN toCharacter.id AS id
        `, { id: parent.id }))[0]?.id ?? null);

      if (!toCharacterId) {
        return null;
      }

      const [character] = await q(`
        MATCH (character:Character {id:$id})
        RETURN character.id AS id, character.name AS name, character.age AS age, character.bio AS bio
      `, { id: toCharacterId });
      return character ?? null;
    },
    memories: async (parent: { id: string }) =>
      q(`
        MATCH (:Relationship {id:$relationshipId})-[:REL_HAS_MEMORY]->(memory:Memory)
        RETURN
          memory.id AS id,
          memory.content AS content,
          memory.createdAt AS createdAt,
          memory.eventType AS eventType,
          memory.locationLotId AS locationLotId,
          memory.locationLotName AS locationLotName,
          memory.locationSpaceId AS locationSpaceId,
          memory.locationSpaceName AS locationSpaceName,
          memory.relationshipIds AS relationshipIds
        ORDER BY memory.createdAt DESC
      `, { relationshipId: parent.id })
  },
  Memory: {
    relationships: async (parent: { id: string }) =>
      q(`
        MATCH (rel:Relationship)-[:REL_HAS_MEMORY]->(:Memory {id:$memoryId})
        RETURN
          rel.id AS id,
          rel.fromCharacterId AS fromCharacterId,
          rel.toCharacterId AS toCharacterId,
          rel.shortTermScore AS shortTermScore,
          rel.longTermScore AS longTermScore,
          rel.labels AS labels,
          rel.lastSeenAt AS lastSeenAt,
          rel.lastSpokeAt AS lastSpokeAt,
          rel.isDeceasedTarget AS isDeceasedTarget
        ORDER BY rel.longTermScore DESC, rel.shortTermScore DESC, rel.id ASC
      `, { memoryId: parent.id }),
    relationshipIds: async (parent: { relationshipIds?: string[] | null; id: string }) => {
      if (parent.relationshipIds) {
        return parent.relationshipIds;
      }

      const relationships = await q(`
        MATCH (rel:Relationship)-[:REL_HAS_MEMORY]->(:Memory {id:$memoryId})
        RETURN rel.id AS id
        ORDER BY rel.id ASC
      `, { memoryId: parent.id });

      return relationships.map((relationship) => relationship.id);
    }
  }
};
