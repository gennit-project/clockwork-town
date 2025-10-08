import { batch, q } from "../kuzuHelpers";

export const WorldResolvers = {
  Query: {
    worlds: () =>
      q(`
        MATCH (w:World)
        RETURN w.id AS id, w.name AS name, w.createdAt AS createdAt
        ORDER BY w.createdAt DESC
      `),
    world: async (_: any, { id }: { id: string }) => {
      const [w] = await q(`
        MATCH (w:World {id:$id})
        RETURN w.id AS id, w.name AS name, w.createdAt AS createdAt
      `, { id });
      return w ?? null;
    },
    regions: (_: any, { worldId }: { worldId: string }) =>
      q(`
        MATCH (w:World {id:$worldId})-[:HAS_REGION]->(r:Region)
        RETURN r.id AS id, r.name AS name, r.worldId AS worldId, r.kind AS kind
      `, { worldId }),
    region: async (_: any, { id }: { id: string }) => {
      const [region] = await q(`
        MATCH (r:Region {id:$id})
        RETURN r.id AS id, r.name AS name, r.worldId AS worldId, r.kind AS kind
      `, { id });
      if (!region) return null;

      // Get characters in the region (via lots and AT edges)
      const characters = await q(`
        MATCH (r:Region {id:$id})-[:HAS_LOT]->(l:Lot)<-[:AT]-(c:Character)
        RETURN DISTINCT c.id AS id, c.name AS name, c.age AS age, c.bio AS bio
      `, { id });

      // Get animals in the region (via lots and ANIMAL_AT edges)
      const animals = await q(`
        MATCH (r:Region {id:$id})-[:HAS_LOT]->(l:Lot)<-[:ANIMAL_AT]-(a:Animal)
        RETURN DISTINCT a.id AS id, a.name AS name, a.age AS age, a.traits AS traits, a.bio AS bio
      `, { id });

      return { ...region, characters, animals };
    },
    lots: (_: any, { regionId }: { regionId: string }) =>
      q(`
        MATCH (r:Region {id:$regionId})-[:HAS_LOT]->(l:Lot)
        RETURN l.id AS id, l.name AS name, l.lotType AS lotType
      `, { regionId }),
    lot: async (_: any, { id }: { id: string }) => {
      const [lot] = await q(`
        MATCH (l:Lot {id:$id})
        RETURN l.id AS id, l.name AS name, l.lotType AS lotType
      `, { id });
      if (!lot) return null;

      const indoorRooms = await q(`
        MATCH (l:Lot {id:$id})-[:HAS_SPACE]->(s:Space)
        WHERE s.isIndoor = true
        RETURN s.id AS id, s.name AS name, s.description AS description
      `, { id });

      const outdoorAreas = await q(`
        MATCH (l:Lot {id:$id})-[:HAS_SPACE]->(s:Space)
        WHERE s.isIndoor = false
        RETURN s.id AS id, s.name AS name, s.description AS description
      `, { id });

      return { ...lot, indoorRooms, outdoorAreas };
    },
    space: async (_: any, { id }: { id: string }) => {
      const [space] = await q(`
        MATCH (s:Space {id:$id})
        RETURN s.id AS id, s.name AS name, s.description AS description, s.isIndoor AS isIndoor
      `, { id });
      if (!space) return null;

      const items = await q(`
        MATCH (s:Space {id:$id})<-[:ON_SPACE]-(i:Item)
        RETURN i.id AS id, i.name AS name, i.description AS description
      `, { id });

      return { ...space, items };
    },
  },
  Mutation: {
    createWorld: async (_: any, { input }: { input: { id: string; name: string } }) => {
      const { id, name } = input;
      const createdAt = new Date().toISOString();
      await q(`CREATE (:World {id:$id, name:$name, createdAt:$createdAt})`, { id, name, createdAt });
      const [created] = await q(`
        MATCH (w:World {id:$id})
        RETURN w.id AS id, w.name AS name, w.createdAt AS createdAt
      `, { id });
      return created;
    },

    updateWorld: async (_: any, { id, name }: { id: string; name: string }) => {
      await q(`MATCH (w:World {id:$id}) SET w.name = $name`, { id, name });
      const [updated] = await q(`
        MATCH (w:World {id:$id})
        RETURN w.id AS id, w.name AS name, w.createdAt AS createdAt
      `, { id });
      return updated;
    },

    deleteWorld: async (_: any, { id }: { id: string }) => {
      await q(`MATCH (w:World {id:$id}) DETACH DELETE w`, { id });
      return true;
    },

    createRegion: async (_: any, { input }: { input: { id: string; worldId: string; name: string; kind: string } }) => {
      const { id, worldId, name, kind } = input;
      await batch(async () => {
        await q(`CREATE (:Region {id:$id, name:$name, worldId:$worldId, kind:$kind})`, { id, name, worldId, kind });
        await q(`
          MATCH (w:World {id:$worldId}), (r:Region {id:$id})
          CREATE (w)-[:HAS_REGION]->(r)
        `, { worldId, id });
      });
      const [created] = await q(`
        MATCH (r:Region {id:$id})
        RETURN r.id AS id, r.name AS name, r.worldId AS worldId, r.kind AS kind
      `, { id });
      return created;
    },

    updateRegion: async (_: any, { id, name, kind }: { id: string; name: string; kind: string }) => {
      await q(`MATCH (r:Region {id:$id}) SET r.name = $name, r.kind = $kind`, { id, name, kind });
      const [updated] = await q(`
        MATCH (r:Region {id:$id})
        RETURN r.id AS id, r.name AS name, r.worldId AS worldId, r.kind AS kind
      `, { id });
      return updated;
    },

    deleteRegion: async (_: any, { id }: { id: string }) => {
      await q(`MATCH (r:Region {id:$id}) DETACH DELETE r`, { id });
      return true;
    },

    createLot: async (_: any, { input }: { input: { id: string; regionId: string; name: string; lotType: string } }) => {
      const { id, regionId, name, lotType } = input;
      await batch(async () => {
        await q(`CREATE (:Lot {id:$id, name:$name, lotType:$lotType})`, { id, name, lotType });
        await q(`
          MATCH (r:Region {id:$regionId}), (l:Lot {id:$id})
          CREATE (r)-[:HAS_LOT]->(l)
        `, { regionId, id });
      });
      const [created] = await q(`
        MATCH (l:Lot {id:$id})
        RETURN l.id AS id, l.name AS name, l.lotType AS lotType
      `, { id });
      return created;
    },

    updateLot: async (_: any, { id, name, lotType }: { id: string; name: string; lotType: string }) => {
      await q(`MATCH (l:Lot {id:$id}) SET l.name = $name, l.lotType = $lotType`, { id, name, lotType });
      const [updated] = await q(`
        MATCH (l:Lot {id:$id})
        RETURN l.id AS id, l.name AS name, l.lotType AS lotType
      `, { id });
      return updated;
    },

    deleteLot: async (_: any, { id }: { id: string }) => {
      await q(`MATCH (l:Lot {id:$id}) DETACH DELETE l`, { id });
      return true;
    },

    createSpace: async (_: any, { input }: { input: { id: string; lotId: string; name: string; description: string; isIndoor: boolean } }) => {
      const { id, lotId, name, description, isIndoor } = input;
      await batch(async () => {
        await q(`CREATE (:Space {id:$id, name:$name, description:$description, isIndoor:$isIndoor})`, {
          id, name, description, isIndoor
        });
        await q(`
          MATCH (l:Lot {id:$lotId}), (s:Space {id:$id})
          CREATE (l)-[:HAS_SPACE]->(s)
        `, { lotId, id });
      });
      const [created] = await q(`
        MATCH (s:Space {id:$id})
        RETURN s.id AS id, s.name AS name, s.description AS description
      `, { id });
      return created;
    },

    updateSpace: async (_: any, { id, name, description }: { id: string; name: string; description: string }) => {
      await q(`MATCH (s:Space {id:$id}) SET s.name = $name, s.description = $description`, { id, name, description });
      const [updated] = await q(`
        MATCH (s:Space {id:$id})
        RETURN s.id AS id, s.name AS name, s.description AS description
      `, { id });
      return updated;
    },

    deleteSpace: async (_: any, { id }: { id: string }) => {
      await q(`MATCH (s:Space {id:$id}) DETACH DELETE s`, { id });
      return true;
    },

    createItem: async (_: any, { input }: { input: { id: string; spaceId: string; name: string; description: string } }) => {
      const { id, spaceId, name, description } = input;
      await batch(async () => {
        // Create item with basic properties (other fields can be null/default)
        await q(`CREATE (:Item {
          id: $id,
          name: $name,
          description: $description,
          canBeUsedByHumans: true,
          canBeUsedByAnimals: false,
          canStoreItems: false,
          cost: 0,
          satisfiesNeeds: [],
          allowedActivities: []
        })`, { id, name, description });

        // Link to space
        await q(`
          MATCH (i:Item {id:$id}), (s:Space {id:$spaceId})
          CREATE (i)-[:ON_SPACE]->(s)
        `, { id, spaceId });
      });

      const [created] = await q(`
        MATCH (i:Item {id:$id})
        RETURN i.id AS id, i.name AS name, i.description AS description
      `, { id });
      return created;
    },

    deleteItem: async (_: any, { id }: { id: string }) => {
      await q(`MATCH (i:Item {id:$id}) DETACH DELETE i`, { id });
      return true;
    },
  },
};
