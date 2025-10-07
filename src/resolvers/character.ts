import { batch, q } from "../kuzuHelpers";

export const CharacterResolvers = {
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
