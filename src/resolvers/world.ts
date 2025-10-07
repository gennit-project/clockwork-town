import { q } from "../kuzuHelpers";

export const WorldResolvers = {
  Query: {
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
  },
};
