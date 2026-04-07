import { batch, q } from "../kuzuHelpers";
import { deserializeStoredWorkSchedule, serializeWorkSchedule } from "./workSchedule";
import { syncMemoryRelationships } from "./relationship";

export const CharacterResolvers = {
  Character: {
    location: async (parent: { id: string }) => {
      const [loc] = await q(`
        MATCH (c:Character {id:$cid})-[:AT]->(l:Lot)
        RETURN l.id AS id, l.name AS name, l.lotType AS lotType
      `, { cid: parent.id });
      return loc ?? null;
    },
    longTermMemories: async (parent: { id: string }) => {
      return q(`
        MATCH (c:Character {id:$cid})-[:HAS_LONG_TERM_MEMORY]->(m:Memory)
        RETURN
          m.id AS id,
          m.content AS content,
          m.createdAt AS createdAt,
          m.eventType AS eventType,
          m.locationLotId AS locationLotId,
          m.locationLotName AS locationLotName,
          m.locationSpaceId AS locationSpaceId,
          m.locationSpaceName AS locationSpaceName,
          m.relationshipIds AS relationshipIds
        ORDER BY m.createdAt DESC
      `, { cid: parent.id });
    },
    shortTermMemories: async (parent: { id: string }) => {
      return q(`
        MATCH (c:Character {id:$cid})-[:HAS_SHORT_TERM_MEMORY]->(m:Memory)
        RETURN
          m.id AS id,
          m.content AS content,
          m.createdAt AS createdAt,
          m.eventType AS eventType,
          m.locationLotId AS locationLotId,
          m.locationLotName AS locationLotName,
          m.locationSpaceId AS locationSpaceId,
          m.locationSpaceName AS locationSpaceName,
          m.relationshipIds AS relationshipIds
        ORDER BY m.createdAt DESC
      `, { cid: parent.id });
    },
    workSchedule: async (parent: { id: string; workSchedule?: string[] | null }) => {
      const entries = parent.workSchedule
        ?? ((await q(`
          MATCH (c:Character {id:$cid})
          RETURN c.workSchedule AS workSchedule
        `, { cid: parent.id }))[0]?.workSchedule ?? []);

      const schedule = deserializeStoredWorkSchedule(entries);
      const lotCache = new Map<string, { id: string; name: string }>();

      return Promise.all(schedule.map(async (shift) => {
        if (!lotCache.has(shift.locationLotId)) {
          const [lot] = await q(`
            MATCH (l:Lot {id:$id})
            RETURN l.id AS id, l.name AS name
          `, { id: shift.locationLotId });
          lotCache.set(shift.locationLotId, lot ?? { id: shift.locationLotId, name: 'Unknown Workplace' });
        }

        return {
          day: shift.day,
          start: shift.start,
          end: shift.end,
          location: lotCache.get(shift.locationLotId)
        };
      }));
    }
  },

  Query: {
    character: async (_: any, { id }: { id: string }) => {
      const [c] = await q(`
        MATCH (c:Character {id:$id})
        RETURN c.id AS id, c.name AS name, c.age AS age, c.bio AS bio
      `, { id });
      return c ?? null;
    },

    characters: async (_: any, { page }: { page?: { after?: string, limit?: number } }) => {
      const limit = Math.min(page?.limit ?? 50, 200);
      const after = page?.after ?? "";
      const rows = await q(`
        MATCH (c:Character)
        WHERE $after = '' OR c.id > $after
        RETURN c.id AS id, c.name AS name, c.age AS age, c.bio AS bio
        ORDER BY c.id ASC
        LIMIT $limit
      `, { after, limit: limit + 1 });
      const hasNextPage = rows.length > limit;
      const nodes = hasNextPage ? rows.slice(0, limit) : rows;
      return {
        edges: nodes.map(n => ({ cursor: n.id, node: n })),
        hasNextPage
      };
    },

    charactersInLot: async (_: any, { lotId }: { lotId: string }) =>
      q(`
        MATCH (c:Character)-[:AT]->(l:Lot {id:$lotId})
        RETURN c.id AS id, c.name AS name, c.age AS age, c.bio AS bio
      `, { lotId }),

    whereIsEveryone: async (_: any, { regionId }: { regionId: string }) =>
      q(`
        MATCH (r:Region {id:$regionId})-[:HAS_LOT]->(l:Lot)<-[:AT]-(c:Character)
        OPTIONAL MATCH (c)-[:PERFORMS]->(a:Activity)-[:INSTANCE_OF]->(t:ActivityType)
        RETURN c.name AS who, l.name AS where, t.name AS doing, a.status AS status
      `, { regionId }),
  },

  Mutation: {
    createCharacter: async (_: any, { input }: { input: {
      id: string, name: string, age: number, bio?: string,
      traitIds: string[], valueIds: string[], homeLotId: string, householdId: string,
      workSchedule?: Array<{ day: string; start: string; end: string; locationLotId: string }>
    }}) => {
      const { id, name, age, bio, traitIds, valueIds, homeLotId, householdId, workSchedule } = input;
      await batch(async () => {
        await q(`CREATE (:Character {id:$id, name:$name, age:$age, bio:$bio, workSchedule:$workSchedule})`, {
          id,
          name,
          age,
          bio: bio ?? null,
          workSchedule: serializeWorkSchedule(workSchedule)
        });
        if (traitIds?.length) {
          for (const tid of traitIds) {
            await q(`
              MATCH (c:Character {id:$cid}), (t:Trait {id:$tid})
              CREATE (c)-[:HAS_TRAIT]->(t)
            `, { cid: id, tid });
          }
        }
        if (valueIds?.length) {
          for (const vid of valueIds) {
            await q(`
              MATCH (c:Character {id:$cid}), (v:Value {id:$vid})
              CREATE (c)-[:HAS_VALUE]->(v)
            `, { cid: id, vid });
          }
        }
        const now = new Date().toISOString();
        await q(`
          MATCH (c:Character {id:$cid}), (h:Household {id:$hid}), (l:Lot {id:$lid})
          CREATE (c)-[:IN_HOUSEHOLD]->(h),
                 (c)-[:HOME]->(l),
                 (c)-[:AT {at: $now}]->(l)
        `, { cid: id, hid: householdId, lid: homeLotId, now });
      });

      const [created] = await q(`
        MATCH (c:Character {id:$id})
        RETURN c.id AS id, c.name AS name, c.age AS age, c.bio AS bio, c.workSchedule AS workSchedule
      `, { id });
      return created;
    },

    updateCharacter: async (_: any, { input }: { input: {
      id: string;
      name?: string;
      age?: number;
      bio?: string | null;
      workSchedule?: Array<{ day: string; start: string; end: string; locationLotId: string }>;
    } }) => {
      const { id, ...updates } = input;
      const setFields: string[] = [];
      const params: Record<string, unknown> = { id };

      if (updates.name !== undefined) {
        setFields.push('c.name = $name');
        params.name = updates.name;
      }
      if (updates.age !== undefined) {
        setFields.push('c.age = $age');
        params.age = updates.age;
      }
      if (updates.bio !== undefined) {
        setFields.push('c.bio = $bio');
        params.bio = updates.bio;
      }
      if (updates.workSchedule !== undefined) {
        setFields.push('c.workSchedule = $workSchedule');
        params.workSchedule = serializeWorkSchedule(updates.workSchedule);
      }

      if (setFields.length === 0) {
        throw new Error('No character fields to update');
      }

      const [updated] = await q(`
        MATCH (c:Character {id:$id})
        SET ${setFields.join(', ')}
        RETURN c.id AS id, c.name AS name, c.age AS age, c.bio AS bio, c.workSchedule AS workSchedule
      `, params);

      return updated ?? null;
    },

    updateCharacterBio: async (_: any, { characterId, bio }: { characterId: string; bio: string }) => {
      await q(`
        MATCH (c:Character {id:$characterId})
        SET c.bio = $bio
      `, { characterId, bio });

      const [updated] = await q(`
        MATCH (c:Character {id:$characterId})
        RETURN c.id AS id, c.name AS name, c.age AS age, c.bio AS bio
      `, { characterId });

      return updated ?? null;
    },

    createCharacterLongTermMemory: async (_: any, {
      characterId,
      content,
      relationshipIds,
      eventType,
      locationLotId,
      locationLotName,
      locationSpaceId,
      locationSpaceName,
      createdAt
    }: {
      characterId: string;
      content: string;
      relationshipIds?: string[];
      eventType?: string | null;
      locationLotId?: string | null;
      locationLotName?: string | null;
      locationSpaceId?: string | null;
      locationSpaceName?: string | null;
      createdAt?: string | null;
    }) => {
      const id = crypto.randomUUID();
      const memoryCreatedAt = createdAt ?? new Date().toISOString();

      await batch(async () => {
        await q(`
          CREATE (:Memory {
            id:$id,
            content:$content,
            createdAt:$createdAt,
            eventType:$eventType,
            locationLotId:$locationLotId,
            locationLotName:$locationLotName,
            locationSpaceId:$locationSpaceId,
            locationSpaceName:$locationSpaceName,
            relationshipIds:$relationshipIds
          })
        `, {
          id,
          content,
          createdAt: memoryCreatedAt,
          eventType: eventType ?? null,
          locationLotId: locationLotId ?? null,
          locationLotName: locationLotName ?? null,
          locationSpaceId: locationSpaceId ?? null,
          locationSpaceName: locationSpaceName ?? null,
          relationshipIds: relationshipIds ?? []
        });
        await q(`
          MATCH (c:Character {id:$characterId}), (m:Memory {id:$id})
          CREATE (c)-[:HAS_LONG_TERM_MEMORY]->(m)
        `, { characterId, id });
        await syncMemoryRelationships({ memoryId: id, relationshipIds });
      });

      const [memory] = await q(`
        MATCH (m:Memory {id:$id})
        RETURN
          m.id AS id,
          m.content AS content,
          m.createdAt AS createdAt,
          m.eventType AS eventType,
          m.locationLotId AS locationLotId,
          m.locationLotName AS locationLotName,
          m.locationSpaceId AS locationSpaceId,
          m.locationSpaceName AS locationSpaceName,
          m.relationshipIds AS relationshipIds
      `, { id });

      return memory;
    },

    updateCharacterLongTermMemory: async (_: any, {
      memoryId,
      content,
      relationshipIds,
      eventType,
      locationLotId,
      locationLotName,
      locationSpaceId,
      locationSpaceName
    }: {
      memoryId: string;
      content: string;
      relationshipIds?: string[];
      eventType?: string | null;
      locationLotId?: string | null;
      locationLotName?: string | null;
      locationSpaceId?: string | null;
      locationSpaceName?: string | null;
    }) => {
      const setFields = ["m.content = $content"];
      const params: Record<string, unknown> = { memoryId, content };

      if (eventType !== undefined) {
        setFields.push("m.eventType = $eventType");
        params.eventType = eventType;
      }
      if (locationLotId !== undefined) {
        setFields.push("m.locationLotId = $locationLotId");
        params.locationLotId = locationLotId;
      }
      if (locationLotName !== undefined) {
        setFields.push("m.locationLotName = $locationLotName");
        params.locationLotName = locationLotName;
      }
      if (locationSpaceId !== undefined) {
        setFields.push("m.locationSpaceId = $locationSpaceId");
        params.locationSpaceId = locationSpaceId;
      }
      if (locationSpaceName !== undefined) {
        setFields.push("m.locationSpaceName = $locationSpaceName");
        params.locationSpaceName = locationSpaceName;
      }
      if (relationshipIds !== undefined) {
        setFields.push("m.relationshipIds = $relationshipIds");
        params.relationshipIds = relationshipIds ?? [];
      }

      await q(`
        MATCH (m:Memory {id:$memoryId})
        SET ${setFields.join(", ")}
      `, params);
      if (relationshipIds !== undefined) {
        await syncMemoryRelationships({ memoryId, relationshipIds });
      }

      const [memory] = await q(`
        MATCH (m:Memory {id:$memoryId})
        RETURN
          m.id AS id,
          m.content AS content,
          m.createdAt AS createdAt,
          m.eventType AS eventType,
          m.locationLotId AS locationLotId,
          m.locationLotName AS locationLotName,
          m.locationSpaceId AS locationSpaceId,
          m.locationSpaceName AS locationSpaceName,
          m.relationshipIds AS relationshipIds
      `, { memoryId });

      return memory ?? null;
    },

    deleteCharacterLongTermMemory: async (_: any, { memoryId }: { memoryId: string }) => {
      await q(`
        MATCH (m:Memory {id:$memoryId})
        DETACH DELETE m
      `, { memoryId });

      return true;
    },

    moveCharacter: async (_: any, { input }: { input: { characterId: string, lotId: string } }) => {
      await batch(async () => {
        await q(`MATCH (c:Character {id:$cid})-[a:AT]->() DELETE a`, { cid: input.characterId });
        const now = new Date().toISOString();
        await q(`
          MATCH (c:Character {id:$cid}), (l:Lot {id:$lid})
          CREATE (c)-[:AT {at: $now}]->(l)
        `, { cid: input.characterId, lid: input.lotId, now });
      });
      return true;
    },
  },
};
