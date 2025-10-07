import { batch, q } from "../kuzuHelpers";

export const ActivityResolvers = {
  Query: {},
  Mutation: {
    startActivity: async (_: any, { input }: { input: { characterId: string, activityTypeId: string, note?: string } }) =>
      batch(async () => {
        // stop old activity instances (optional – or mark stopped)
        await q(`
          MATCH (:Character {id:$cid})-[:PERFORMS]->(a:Activity)
          SET a.status = 'stopped'
        `, { cid: input.characterId });

        // create new activity
        const aid = crypto.randomUUID?.() ?? String(Math.random());
        await q(`CREATE (:Activity {id:$aid, startedAt: NOW(), status: 'active', note:$note})`, { aid, note: input.note ?? null });

        await q(`
          MATCH (c:Character {id:$cid}), (t:ActivityType {id:$tid}), (a:Activity {id:$aid})
          CREATE (c)-[:PERFORMS]->(a), (a)-[:INSTANCE_OF]->(t)
        `, { cid: input.characterId, tid: input.activityTypeId, aid });

        return true;
      }),

    stopAllActivities: async (_: any, { characterId }: { characterId: string }) => {
      await q(`
        MATCH (:Character {id:$cid})-[:PERFORMS]->(a:Activity)
        SET a.status = 'stopped'
      `, { cid: characterId });
      return true;
    },
  }
};
