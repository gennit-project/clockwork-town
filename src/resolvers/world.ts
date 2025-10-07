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
  },
};
