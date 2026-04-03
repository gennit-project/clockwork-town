import { batch, q } from "../kuzuHelpers";

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
        RETURN m.id AS id, m.content AS content, m.createdAt AS createdAt
        ORDER BY m.createdAt DESC
      `, { cid: parent.id });
    },
    shortTermMemories: async (parent: { id: string }) => {
      return q(`
        MATCH (c:Character {id:$cid})-[:HAS_SHORT_TERM_MEMORY]->(m:Memory)
        RETURN m.id AS id, m.content AS content, m.createdAt AS createdAt
        ORDER BY m.createdAt DESC
      `, { cid: parent.id });
    },
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
      traitIds: string[], valueIds: string[], homeLotId: string, householdId: string
    }}) => {
      const { id, name, age, bio, traitIds, valueIds, homeLotId, householdId } = input;
      await batch(async () => {
        await q(`CREATE (:Character {id:$id, name:$name, age:$age, bio:$bio})`, { id, name, age, bio: bio ?? null });
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
        RETURN c.id AS id, c.name AS name, c.age AS age, c.bio AS bio
      `, { id });
      return created;
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

    createCharacterLongTermMemory: async (_: any, { characterId, content }: { characterId: string; content: string }) => {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      await batch(async () => {
        await q(`CREATE (:Memory {id:$id, content:$content, createdAt:$createdAt})`, { id, content, createdAt });
        await q(`
          MATCH (c:Character {id:$characterId}), (m:Memory {id:$id})
          CREATE (c)-[:HAS_LONG_TERM_MEMORY]->(m)
        `, { characterId, id });
      });

      const [memory] = await q(`
        MATCH (m:Memory {id:$id})
        RETURN m.id AS id, m.content AS content, m.createdAt AS createdAt
      `, { id });

      return memory;
    },

    updateCharacterLongTermMemory: async (_: any, { memoryId, content }: { memoryId: string; content: string }) => {
      await q(`
        MATCH (m:Memory {id:$memoryId})
        SET m.content = $content
      `, { memoryId, content });

      const [memory] = await q(`
        MATCH (m:Memory {id:$memoryId})
        RETURN m.id AS id, m.content AS content, m.createdAt AS createdAt
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
