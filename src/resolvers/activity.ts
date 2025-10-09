import { batch, q } from "../kuzuHelpers";

export const ActivityResolvers = {
  Query: {},
  Mutation: {
    startActivity: async (_: any, { input }: { input: { characterId: string, activityTypeId?: string, actionName?: string, note?: string } }) =>
      batch(async () => {
        let activityType: any;
        let activityTypeId: string;

        // If actionName is provided, look up or create ActivityType by name
        if (input.actionName) {
          const [existing] = await q(`
            MATCH (t:ActivityType {name:$name})
            RETURN t.id AS id, t.name AS name
          `, { name: input.actionName });

          if (existing) {
            activityType = existing;
            activityTypeId = existing.id;
          } else {
            // Create new ActivityType
            activityTypeId = crypto.randomUUID?.() ?? String(Math.random());
            await q(`CREATE (:ActivityType {
              id: $id,
              name: $name,
              description: $description,
              defaultDurationMinutes: 60
            })`, {
              id: activityTypeId,
              name: input.actionName,
              description: `Activity: ${input.actionName}`
            });
            activityType = { id: activityTypeId, name: input.actionName };
          }
        } else if (input.activityTypeId) {
          // Use provided activityTypeId
          const [existing] = await q(`
            MATCH (t:ActivityType {id:$tid})
            RETURN t.id AS id, t.name AS name
          `, { tid: input.activityTypeId });

          if (!existing) {
            throw new Error('Activity type not found');
          }
          activityType = existing;
          activityTypeId = input.activityTypeId;
        } else {
          throw new Error('Either activityTypeId or actionName must be provided');
        }

        // Stop old activity instances and remove old USING edges
        await q(`
          MATCH (c:Character {id:$cid})-[:PERFORMS]->(a:Activity)
          SET a.status = 'stopped'
        `, { cid: input.characterId });

        await q(`
          MATCH (c:Character {id:$cid})-[u:USING]->(:Item)
          DELETE u
        `, { cid: input.characterId });

        // Find character's current lot
        const [currentLot] = await q(`
          MATCH (c:Character {id:$cid})-[:AT]->(l:Lot)
          RETURN l.id AS lotId
        `, { cid: input.characterId });

        if (!currentLot?.lotId) {
          throw new Error('Character has no current location');
        }

        // Find items across ALL spaces in the lot that allow this activity
        const items = await q(`
          MATCH (l:Lot {id:$lotId})-[:HAS_SPACE]->(s:Space)<-[:ON_SPACE]-(i:Item)
          WHERE $activityName IN i.allowedActivities
          RETURN i.id AS id, i.name AS name, i.maxSimultaneousUsers AS maxUsers
        `, { lotId: currentLot.lotId, activityName: activityType.name });

        if (items.length === 0) {
          throw new Error(`No items available for ${activityType.name} at this location`);
        }

        let selectedItem: any = null;

        // For each item, check if it has available slots
        for (const item of items) {
          const [usage] = await q(`
            MATCH (c:Character)-[:USING]->(i:Item {id:$itemId})
            RETURN count(c) AS currentUsers
          `, { itemId: item.id });

          const currentUsers = usage?.currentUsers || 0;
          const maxUsers = item.maxUsers || 999; // Default to unlimited if not set

          if (currentUsers < maxUsers) {
            selectedItem = item;
            break;
          }
        }

        if (!selectedItem) {
          throw new Error(`All ${activityType.name} items are currently in use`);
        }

        // Create new activity
        const aid = crypto.randomUUID?.() ?? String(Math.random());
        const startedAt = new Date().toISOString();
        await q(`CREATE (:Activity {id:$aid, startedAt:$startedAt, status: 'active', note:$note})`, { aid, startedAt, note: input.note ?? null });

        await q(`
          MATCH (c:Character {id:$cid}), (t:ActivityType {id:$tid}), (a:Activity {id:$aid})
          CREATE (c)-[:PERFORMS]->(a), (a)-[:INSTANCE_OF]->(t)
        `, { cid: input.characterId, tid: activityTypeId, aid });

        // Create USING edge (required - we validated item availability above)
        await q(`
          MATCH (c:Character {id:$cid}), (i:Item {id:$itemId})
          CREATE (c)-[:USING {since: $since}]->(i)
        `, { cid: input.characterId, itemId: selectedItem.id, since: startedAt });

        return true;
      }),

    stopAllActivities: async (_: any, { characterId }: { characterId: string }) => {
      await batch(async () => {
        await q(`
          MATCH (:Character {id:$cid})-[:PERFORMS]->(a:Activity)
          SET a.status = 'stopped'
        `, { cid: characterId });

        // Remove USING edges when stopping activities
        await q(`
          MATCH (c:Character {id:$cid})-[u:USING]->(:Item)
          DELETE u
        `, { cid: characterId });
      });
      return true;
    },
  }
};
