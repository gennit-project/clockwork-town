import { batch, q } from "../kuzuHelpers";

// Helper functions to safely encode/decode template data with special characters
const encodeTemplateData = (data: any): string => {
  const jsonString = JSON.stringify(data);
  return Buffer.from(jsonString).toString('base64');
};

const decodeTemplateData = (encoded: string): any => {
  try {
    const jsonString = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(jsonString);
  } catch (e) {
    // Fallback for old data that might not be base64 encoded
    console.warn('Failed to decode base64 template data, attempting direct parse:', e);
    return JSON.parse(encoded);
  }
};

export const WorldResolvers = {
  Space: {
    items: async (parent: any) => {
      const items = await q(`
        MATCH (s:Space {id:$id})<-[:ON_SPACE]-(i:Item)
        RETURN i.id AS id, i.name AS name, i.description AS description,
               i.allowedActivities AS allowedActivities,
               i.satisfiesNeeds AS satisfiesNeeds,
               i.canBeUsedByHumans AS canBeUsedByHumans,
               i.canBeUsedByAnimals AS canBeUsedByAnimals,
               i.maxSimultaneousUsers AS maxSimultaneousUsers,
               i.count AS count
      `, { id: parent.id });
      return items;
    },
    characters: async (parent: any) => {
      const characters = await q(`
        MATCH (s:Space {id:$id})<-[:AT]-(c:Character)
        RETURN c.id AS id, c.name AS name
      `, { id: parent.id });
      return characters;
    }
  },
  Region: {
    lots: async (parent: any) => {
      const lots = await q(`
        MATCH (r:Region {id:$id})-[:HAS_LOT]->(l:Lot)
        RETURN l.id AS id, l.name AS name, l.lotType AS lotType
      `, { id: parent.id });
      return lots;
    },
    naturalAreas: async (parent: any) => {
      // TODO: Implement when natural areas are added
      return [];
    }
  },
  Item: {
    allowedActivities: (parent: any) => {
      return parent.allowedActivities || [];
    },
    satisfiesNeeds: (parent: any) => {
      return parent.satisfiesNeeds || [];
    },
    activeUsers: async (parent: any) => {
      // Query characters currently USING this item
      const users = await q(`
        MATCH (c:Character)-[u:USING]->(i:Item {id:$id})
        RETURN c.id AS id, c.name AS name, u.since AS since
        ORDER BY u.since ASC
      `, { id: parent.id });
      return users;
    },
    activeAnimalUsers: async (parent: any) => {
      // TODO: Add when animal USING edges are implemented
      return [];
    }
  },
  Lot: {
    indoorRooms: async (parent: any) => {
      const rooms = await q(`
        MATCH (l:Lot {id:$id})-[:HAS_SPACE]->(s:Space)
        WHERE s.isIndoor = true
        RETURN s.id AS id, s.name AS name, s.description AS description, s.isIndoor AS isIndoor
      `, { id: parent.id });
      return rooms;
    },
    outdoorAreas: async (parent: any) => {
      const areas = await q(`
        MATCH (l:Lot {id:$id})-[:HAS_SPACE]->(s:Space)
        WHERE s.isIndoor = false
        RETURN s.id AS id, s.name AS name, s.description AS description, s.isIndoor AS isIndoor
      `, { id: parent.id });
      return areas;
    },
    items: async (parent: any) => {
      const items = await q(`
        MATCH (l:Lot {id:$id})<-[:ON_LOT]-(i:Item)
        RETURN i.id AS id, i.name AS name, i.description AS description,
               i.allowedActivities AS allowedActivities,
               i.satisfiesNeeds AS satisfiesNeeds,
               i.canBeUsedByHumans AS canBeUsedByHumans,
               i.canBeUsedByAnimals AS canBeUsedByAnimals,
               i.maxSimultaneousUsers AS maxSimultaneousUsers,
               i.count AS count
      `, { id: parent.id });
      return items;
    }
  },
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
        RETURN i.id AS id, i.name AS name, i.description AS description,
               i.allowedActivities AS allowedActivities,
               i.satisfiesNeeds AS satisfiesNeeds,
               i.canBeUsedByHumans AS canBeUsedByHumans,
               i.canBeUsedByAnimals AS canBeUsedByAnimals,
               i.maxSimultaneousUsers AS maxSimultaneousUsers,
               i.count AS count
      `, { id });

      return { ...space, items };
    },
    lotTemplates: async (_: any, { tags }: { tags?: string[] }) => {
      const transformSpaces = (spaces: any[]) => spaces.map((space: any) => ({
        name: space.spaceName,
        description: space.spaceDescription,
        items: (space.items || []).map((item: any) => ({
          name: item.itemName,
          description: item.itemDescription
        }))
      }));

      if (tags && tags.length > 0) {
        // Filter by tags - return templates that have ALL the requested tags
        const templates = await q(`
          MATCH (t:LotTemplate)
          RETURN t.id AS id, t.name AS name, t.lotType AS lotType,
                 t.description AS description, t.tags AS tags,
                 t.indoorRooms AS indoorRooms, t.outdoorAreas AS outdoorAreas
        `);

        // Filter in memory to check if template has all requested tags
        return templates.filter((t: any) =>
          tags.every(tag => t.tags?.includes(tag))
        ).map((t: any) => ({
          ...t,
          indoorRooms: transformSpaces(JSON.parse(t.indoorRooms || '[]')),
          outdoorAreas: transformSpaces(JSON.parse(t.outdoorAreas || '[]'))
        }));
      }

      // No tag filter - return all templates
      const templates = await q(`
        MATCH (t:LotTemplate)
        RETURN t.id AS id, t.name AS name, t.lotType AS lotType,
               t.description AS description, t.tags AS tags,
               t.indoorRooms AS indoorRooms, t.outdoorAreas AS outdoorAreas
      `);

      return templates.map((t: any) => ({
        ...t,
        indoorRooms: transformSpaces(JSON.parse(t.indoorRooms || '[]')),
        outdoorAreas: transformSpaces(JSON.parse(t.outdoorAreas || '[]'))
      }));
    },
    lotTemplate: async (_: any, { id }: { id: string }) => {
      const transformSpaces = (spaces: any[]) => spaces.map((space: any) => ({
        name: space.spaceName,
        description: space.spaceDescription,
        items: (space.items || []).map((item: any) => ({
          name: item.itemName,
          description: item.itemDescription
        }))
      }));

      const [template] = await q(`
        MATCH (t:LotTemplate {id:$id})
        RETURN t.id AS id, t.name AS name, t.lotType AS lotType,
               t.description AS description, t.tags AS tags,
               t.indoorRooms AS indoorRooms, t.outdoorAreas AS outdoorAreas
      `, { id });

      if (!template) return null;

      return {
        ...template,
        indoorRooms: transformSpaces(JSON.parse(template.indoorRooms || '[]')),
        outdoorAreas: transformSpaces(JSON.parse(template.outdoorAreas || '[]'))
      };
    },
    householdTemplates: async (_: any, { tags }: { tags?: string[] }) => {
      if (tags && tags.length > 0) {
        const templates = await q(`
          MATCH (t:HouseholdTemplate)
          RETURN t.id AS id, t.name AS name, t.description AS description,
                 t.tags AS tags, t.characters AS characters, t.animals AS animals
        `);

        return templates.filter((t: any) =>
          tags.every(tag => t.tags?.includes(tag))
        ).map((t: any) => ({
          ...t,
          characters: decodeTemplateData(t.characters || '[]'),
          animals: decodeTemplateData(t.animals || '[]')
        }));
      }

      const templates = await q(`
        MATCH (t:HouseholdTemplate)
        RETURN t.id AS id, t.name AS name, t.description AS description,
               t.tags AS tags, t.characters AS characters, t.animals AS animals
      `);

      return templates.map((t: any) => ({
        ...t,
        characters: decodeTemplateData(t.characters || '[]'),
        animals: decodeTemplateData(t.animals || '[]')
      }));
    },
    householdTemplate: async (_: any, { id }: { id: string }) => {
      const [template] = await q(`
        MATCH (t:HouseholdTemplate {id:$id})
        RETURN t.id AS id, t.name AS name, t.description AS description,
               t.tags AS tags, t.characters AS characters, t.animals AS animals
      `, { id });

      if (!template) return null;

      return {
        ...template,
        characters: decodeTemplateData(template.characters || '[]'),
        animals: decodeTemplateData(template.animals || '[]')
      };
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

    createLotWithSpacesAndItems: async (_: any, { regionId, input }: {
      regionId: string;
      input: {
        lotName: string;
        lotType: string;
        lotDescription?: string;
        indoorRooms?: Array<{
          spaceName: string;
          spaceDescription: string;
          items?: Array<{ itemName: string; itemDescription: string }>;
        }>;
        outdoorSpaces?: Array<{
          spaceName: string;
          spaceDescription: string;
          items?: Array<{ itemName: string; itemDescription: string }>;
        }>;
      }
    }) => {
      const lotId = crypto.randomUUID();
      const { lotName, lotType, indoorRooms = [], outdoorSpaces = [] } = input;

      await batch(async () => {
        // Create the lot
        await q(`CREATE (:Lot {id:$id, name:$name, lotType:$lotType})`, {
          id: lotId,
          name: lotName,
          lotType
        });

        // Link lot to region
        await q(`
          MATCH (r:Region {id:$regionId}), (l:Lot {id:$lotId})
          CREATE (r)-[:HAS_LOT]->(l)
        `, { regionId, lotId });

        // Create indoor rooms
        for (const room of indoorRooms) {
          const spaceId = crypto.randomUUID();

          // Create space
          await q(`CREATE (:Space {
            id: $id,
            name: $name,
            description: $description,
            isIndoor: true
          })`, {
            id: spaceId,
            name: room.spaceName,
            description: room.spaceDescription
          });

          // Link space to lot
          await q(`
            MATCH (l:Lot {id:$lotId}), (s:Space {id:$spaceId})
            CREATE (l)-[:HAS_SPACE]->(s)
          `, { lotId, spaceId });

          // Create items in this space
          if (room.items && room.items.length > 0) {
            for (const item of room.items) {
              const itemId = crypto.randomUUID();

              await q(`CREATE (:Item {
                id: $id,
                name: $name,
                description: $description,
                canBeUsedByHumans: true,
                canBeUsedByAnimals: false,
                canStoreItems: false,
                cost: 0,
                count: 1,
                satisfiesNeeds: [],
                allowedActivities: []
              })`, {
                id: itemId,
                name: item.itemName,
                description: item.itemDescription
              });

              // Link item to space
              await q(`
                MATCH (i:Item {id:$itemId}), (s:Space {id:$spaceId})
                CREATE (i)-[:ON_SPACE]->(s)
              `, { itemId, spaceId });
            }
          }
        }

        // Create outdoor spaces
        for (const space of outdoorSpaces) {
          const spaceId = crypto.randomUUID();

          // Create space
          await q(`CREATE (:Space {
            id: $id,
            name: $name,
            description: $description,
            isIndoor: false
          })`, {
            id: spaceId,
            name: space.spaceName,
            description: space.spaceDescription
          });

          // Link space to lot
          await q(`
            MATCH (l:Lot {id:$lotId}), (s:Space {id:$spaceId})
            CREATE (l)-[:HAS_SPACE]->(s)
          `, { lotId, spaceId });

          // Create items in this space
          if (space.items && space.items.length > 0) {
            for (const item of space.items) {
              const itemId = crypto.randomUUID();

              await q(`CREATE (:Item {
                id: $id,
                name: $name,
                description: $description,
                canBeUsedByHumans: true,
                canBeUsedByAnimals: false,
                canStoreItems: false,
                cost: 0,
                count: 1,
                satisfiesNeeds: [],
                allowedActivities: []
              })`, {
                id: itemId,
                name: item.itemName,
                description: item.itemDescription
              });

              // Link item to space
              await q(`
                MATCH (i:Item {id:$itemId}), (s:Space {id:$spaceId})
                CREATE (i)-[:ON_SPACE]->(s)
              `, { itemId, spaceId });
            }
          }
        }
      });

      // Return the created lot with spaces
      const [lot] = await q(`
        MATCH (l:Lot {id:$id})
        RETURN l.id AS id, l.name AS name, l.lotType AS lotType
      `, { id: lotId });

      if (!lot) return null;

      const indoorRoomsData = await q(`
        MATCH (l:Lot {id:$id})-[:HAS_SPACE]->(s:Space)
        WHERE s.isIndoor = true
        RETURN s.id AS id, s.name AS name, s.description AS description
      `, { id: lotId });

      const outdoorAreasData = await q(`
        MATCH (l:Lot {id:$id})-[:HAS_SPACE]->(s:Space)
        WHERE s.isIndoor = false
        RETURN s.id AS id, s.name AS name, s.description AS description
      `, { id: lotId });

      return { ...lot, indoorRooms: indoorRoomsData, outdoorAreas: outdoorAreasData };
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
          count: 1,
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
        RETURN i.id AS id, i.name AS name, i.description AS description,
               i.allowedActivities AS allowedActivities,
               i.satisfiesNeeds AS satisfiesNeeds,
               i.canBeUsedByHumans AS canBeUsedByHumans,
               i.canBeUsedByAnimals AS canBeUsedByAnimals,
               i.count AS count
      `, { id });
      return created;
    },

    createManyItems: async (_: any, { spaceId, items }: {
      spaceId: string;
      items: Array<{ itemName: string; itemDescription: string; itemCount: number }>;
    }) => {
      const createdItems: Array<{ id: string; name: string; description: string; count: number }> = [];

      await batch(async () => {
        for (const item of items) {
          const itemId = crypto.randomUUID();

          // Create item with basic properties
          await q(`CREATE (:Item {
            id: $id,
            name: $name,
            description: $description,
            canBeUsedByHumans: true,
            canBeUsedByAnimals: false,
            canStoreItems: false,
            cost: 0,
            count: $count,
            satisfiesNeeds: [],
            allowedActivities: []
          })`, { id: itemId, name: item.itemName, description: item.itemDescription, count: item.itemCount });

          // Link to space
          await q(`
            MATCH (i:Item {id:$id}), (s:Space {id:$spaceId})
            CREATE (i)-[:ON_SPACE]->(s)
          `, { id: itemId, spaceId });

          createdItems.push({ id: itemId, name: item.itemName, description: item.itemDescription, count: item.itemCount });
        }
      });

      return createdItems;
    },

    updateItem: async (_: any, { input }: {
      input: {
        id: string;
        name?: string;
        description?: string;
        allowedActivities?: string[];
        canBeUsedByHumans?: boolean;
        canBeUsedByAnimals?: boolean;
        minimumAgeToUse?: number;
        maxSimultaneousUsers?: number;
      }
    }) => {
      const { id, ...updates } = input;

      // Build SET clause dynamically for only provided fields
      const setFields: string[] = [];
      const params: any = { id };

      if (updates.name !== undefined) {
        setFields.push('i.name = $name');
        params.name = updates.name;
      }
      if (updates.description !== undefined) {
        setFields.push('i.description = $description');
        params.description = updates.description;
      }
      if (updates.allowedActivities !== undefined) {
        setFields.push('i.allowedActivities = $allowedActivities');
        params.allowedActivities = updates.allowedActivities;
      }
      if (updates.canBeUsedByHumans !== undefined) {
        setFields.push('i.canBeUsedByHumans = $canBeUsedByHumans');
        params.canBeUsedByHumans = updates.canBeUsedByHumans;
      }
      if (updates.canBeUsedByAnimals !== undefined) {
        setFields.push('i.canBeUsedByAnimals = $canBeUsedByAnimals');
        params.canBeUsedByAnimals = updates.canBeUsedByAnimals;
      }
      if (updates.minimumAgeToUse !== undefined) {
        setFields.push('i.minimumAgeToUse = $minimumAgeToUse');
        params.minimumAgeToUse = updates.minimumAgeToUse;
      }
      if (updates.maxSimultaneousUsers !== undefined) {
        setFields.push('i.maxSimultaneousUsers = $maxSimultaneousUsers');
        params.maxSimultaneousUsers = updates.maxSimultaneousUsers;
      }

      if (setFields.length === 0) {
        throw new Error('No fields to update');
      }

      const [item] = await q(`
        MATCH (i:Item {id:$id})
        SET ${setFields.join(', ')}
        RETURN i.id AS id, i.name AS name, i.description AS description,
               i.allowedActivities AS allowedActivities,
               i.canBeUsedByHumans AS canBeUsedByHumans,
               i.canBeUsedByAnimals AS canBeUsedByAnimals,
               i.minimumAgeToUse AS minimumAgeToUse,
               i.maxSimultaneousUsers AS maxSimultaneousUsers,
               i.satisfiesNeeds AS satisfiesNeeds,
               i.canStoreItems AS canStoreItems,
               i.cost AS cost,
               i.count AS count
      `, params);

      return item;
    },

    deleteItem: async (_: any, { id }: { id: string }) => {
      await q(`MATCH (i:Item {id:$id}) DETACH DELETE i`, { id });
      return true;
    },

    createLotTemplate: async (_: any, { input, tags }: {
      tags: string[];
      input: {
        lotName: string;
        lotType: string;
        lotDescription?: string;
        indoorRooms?: Array<{
          spaceName: string;
          spaceDescription: string;
          items?: Array<{ itemName: string; itemDescription: string }>;
        }>;
        outdoorSpaces?: Array<{
          spaceName: string;
          spaceDescription: string;
          items?: Array<{ itemName: string; itemDescription: string }>;
        }>;
      }
    }) => {
      const templateId = crypto.randomUUID();
      const { lotName, lotType, lotDescription, indoorRooms = [], outdoorSpaces = [] } = input;

      // Serialize the spaces data to JSON strings
      const indoorRoomsJson = JSON.stringify(indoorRooms);
      const outdoorAreasJson = JSON.stringify(outdoorSpaces);

      await q(`CREATE (:LotTemplate {
        id: $id,
        name: $name,
        lotType: $lotType,
        description: $description,
        tags: $tags,
        indoorRooms: $indoorRooms,
        outdoorAreas: $outdoorAreas
      })`, {
        id: templateId,
        name: lotName,
        lotType,
        description: lotDescription || '',
        tags,
        indoorRooms: indoorRoomsJson,
        outdoorAreas: outdoorAreasJson
      });

      const transformSpaces = (spaces: any[]) => spaces.map((space: any) => ({
        name: space.spaceName,
        description: space.spaceDescription,
        items: (space.items || []).map((item: any) => ({
          name: item.itemName,
          description: item.itemDescription
        }))
      }));

      const [created] = await q(`
        MATCH (t:LotTemplate {id:$id})
        RETURN t.id AS id, t.name AS name, t.lotType AS lotType,
               t.description AS description, t.tags AS tags,
               t.indoorRooms AS indoorRooms, t.outdoorAreas AS outdoorAreas
      `, { id: templateId });

      return {
        ...created,
        indoorRooms: transformSpaces(JSON.parse(created.indoorRooms || '[]')),
        outdoorAreas: transformSpaces(JSON.parse(created.outdoorAreas || '[]'))
      };
    },

    updateLotTemplate: async (_: any, { id, input, tags }: {
      id: string;
      tags: string[];
      input: {
        lotName: string;
        lotType: string;
        lotDescription?: string;
        indoorRooms?: Array<{
          spaceName: string;
          spaceDescription: string;
          items?: Array<{ itemName: string; itemDescription: string }>;
        }>;
        outdoorSpaces?: Array<{
          spaceName: string;
          spaceDescription: string;
          items?: Array<{ itemName: string; itemDescription: string }>;
        }>;
      }
    }) => {
      const { lotName, lotType, lotDescription, indoorRooms = [], outdoorSpaces = [] } = input;

      // Serialize the spaces data to JSON strings
      const indoorRoomsJson = JSON.stringify(indoorRooms);
      const outdoorAreasJson = JSON.stringify(outdoorSpaces);

      await q(`
        MATCH (t:LotTemplate {id:$id})
        SET t.name = $name,
            t.lotType = $lotType,
            t.description = $description,
            t.tags = $tags,
            t.indoorRooms = $indoorRooms,
            t.outdoorAreas = $outdoorAreas
      `, {
        id,
        name: lotName,
        lotType,
        description: lotDescription || '',
        tags,
        indoorRooms: indoorRoomsJson,
        outdoorAreas: outdoorAreasJson
      });

      const transformSpaces = (spaces: any[]) => spaces.map((space: any) => ({
        name: space.spaceName,
        description: space.spaceDescription,
        items: (space.items || []).map((item: any) => ({
          name: item.itemName,
          description: item.itemDescription
        }))
      }));

      const [updated] = await q(`
        MATCH (t:LotTemplate {id:$id})
        RETURN t.id AS id, t.name AS name, t.lotType AS lotType,
               t.description AS description, t.tags AS tags,
               t.indoorRooms AS indoorRooms, t.outdoorAreas AS outdoorAreas
      `, { id });

      return {
        ...updated,
        indoorRooms: transformSpaces(JSON.parse(updated.indoorRooms || '[]')),
        outdoorAreas: transformSpaces(JSON.parse(updated.outdoorAreas || '[]'))
      };
    },

    deleteLotTemplate: async (_: any, { id }: { id: string }) => {
      await q(`MATCH (t:LotTemplate {id:$id}) DELETE t`, { id });
      return true;
    },

    createHouseholdTemplate: async (_: any, { input, tags }: {
      tags: string[];
      input: {
        householdName: string;
        householdDescription?: string;
        characters: Array<{
          characterName: string;
          characterAge: number;
          characterBio?: string;
        }>;
        animals?: Array<{
          animalName: string;
          animalAge: number;
          animalTraits: string[];
        }>;
      }
    }) => {
      const templateId = crypto.randomUUID();
      const { householdName, householdDescription, characters, animals = [] } = input;

      // Transform characters and animals to match template schema
      const charactersData = characters.map(c => ({
        name: c.characterName,
        age: c.characterAge,
        bio: c.characterBio || ''
      }));

      const animalsData = animals.map(a => ({
        name: a.animalName,
        age: a.animalAge,
        traits: a.animalTraits
      }));

      const charactersEncoded = encodeTemplateData(charactersData);
      const animalsEncoded = encodeTemplateData(animalsData);

      await q(`CREATE (:HouseholdTemplate {
        id: $id,
        name: $name,
        description: $description,
        tags: $tags,
        characters: $characters,
        animals: $animals
      })`, {
        id: templateId,
        name: householdName,
        description: householdDescription || '',
        tags,
        characters: charactersEncoded,
        animals: animalsEncoded
      });

      const [created] = await q(`
        MATCH (t:HouseholdTemplate {id:$id})
        RETURN t.id AS id, t.name AS name, t.description AS description,
               t.tags AS tags, t.characters AS characters, t.animals AS animals
      `, { id: templateId });

      return {
        ...created,
        characters: decodeTemplateData(created.characters || '[]'),
        animals: decodeTemplateData(created.animals || '[]')
      };
    },

    updateHouseholdTemplate: async (_: any, { id, input, tags }: {
      id: string;
      tags: string[];
      input: {
        householdName: string;
        householdDescription?: string;
        characters: Array<{
          characterName: string;
          characterAge: number;
          characterBio?: string;
        }>;
        animals?: Array<{
          animalName: string;
          animalAge: number;
          animalTraits: string[];
        }>;
      }
    }) => {
      const { householdName, householdDescription, characters, animals = [] } = input;

      // Transform characters and animals to match template schema
      const charactersData = characters.map(c => ({
        name: c.characterName,
        age: c.characterAge,
        bio: c.characterBio || ''
      }));

      const animalsData = animals.map(a => ({
        name: a.animalName,
        age: a.animalAge,
        traits: a.animalTraits
      }));

      const charactersEncoded = encodeTemplateData(charactersData);
      const animalsEncoded = encodeTemplateData(animalsData);

      await q(`
        MATCH (t:HouseholdTemplate {id:$id})
        SET t.name = $name,
            t.description = $description,
            t.tags = $tags,
            t.characters = $characters,
            t.animals = $animals
      `, {
        id,
        name: householdName,
        description: householdDescription || '',
        tags,
        characters: charactersEncoded,
        animals: animalsEncoded
      });

      const [updated] = await q(`
        MATCH (t:HouseholdTemplate {id:$id})
        RETURN t.id AS id, t.name AS name, t.description AS description,
               t.tags AS tags, t.characters AS characters, t.animals AS animals
      `, { id });

      return {
        ...updated,
        characters: decodeTemplateData(updated.characters || '[]'),
        animals: decodeTemplateData(updated.animals || '[]')
      };
    },

    deleteHouseholdTemplate: async (_: any, { id }: { id: string }) => {
      await q(`MATCH (t:HouseholdTemplate {id:$id}) DELETE t`, { id });
      return true;
    },

    /**
     * Export a world with all its data for backup
     * Returns a JSON object with complete world structure
     */
    exportWorld: async (_: any, { worldId }: { worldId: string }) => {
      console.log(`📦 Exporting world ${worldId}...`);

      // 1. Get world data
      const [world] = await q(`
        MATCH (w:World {id:$worldId})
        RETURN w.id AS id, w.name AS name, w.createdAt AS createdAt
      `, { worldId });

      if (!world) {
        throw new Error(`World ${worldId} not found`);
      }

      // 2. Get all regions
      const regions = await q(`
        MATCH (w:World {id:$worldId})-[:HAS_REGION]->(r:Region)
        RETURN r.id AS id, r.name AS name, r.kind AS kind
      `, { worldId });

      // 3. Get all lots with their regions
      const lots = await q(`
        MATCH (w:World {id:$worldId})-[:HAS_REGION]->(r:Region)-[:HAS_LOT]->(l:Lot)
        RETURN l.id AS id, l.name AS name, l.lotType AS lotType, r.id AS regionId
      `, { worldId });

      // 4. Get all spaces with their lots
      const spaces = await q(`
        MATCH (w:World {id:$worldId})-[:HAS_REGION]->(:Region)-[:HAS_LOT]->(l:Lot)-[:HAS_SPACE]->(s:Space)
        RETURN s.id AS id, s.name AS name, s.description AS description,
               s.isIndoor AS isIndoor, l.id AS lotId
      `, { worldId });

      // 5. Get all items with their spaces
      const items = await q(`
        MATCH (w:World {id:$worldId})-[:HAS_REGION]->(:Region)-[:HAS_LOT]->(:Lot)-[:HAS_SPACE]->(s:Space)<-[:ON_SPACE]-(i:Item)
        RETURN i.id AS id, i.name AS name, i.description AS description,
               i.canBeUsedByHumans AS canBeUsedByHumans,
               i.canBeUsedByAnimals AS canBeUsedByAnimals,
               i.minimumAgeToUse AS minimumAgeToUse,
               i.maxSimultaneousUsers AS maxSimultaneousUsers,
               i.allowedActivities AS allowedActivities,
               i.satisfiesNeeds AS satisfiesNeeds,
               i.canStoreItems AS canStoreItems,
               i.cost AS cost,
               i.count AS count,
               s.id AS spaceId
      `, { worldId });

      // 6. Get all households
      const households = await q(`
        MATCH (w:World {id:$worldId})-[:HAS_REGION]->(r:Region)-[:HAS_LOT]->(l:Lot)<-[:HOME]-(h:Household)
        RETURN h.id AS id, h.name AS name, l.id AS lotId, r.id AS regionId
      `, { worldId });

      // 7. Get all characters with their household relationships
      const characters = await q(`
        MATCH (w:World {id:$worldId})-[:HAS_REGION]->(:Region)-[:HAS_LOT]->(:Lot)<-[:HOME]-(:Household)<-[:IN_HOUSEHOLD]-(c:Character)
        OPTIONAL MATCH (c)-[:IN_HOUSEHOLD]->(h:Household)
        OPTIONAL MATCH (c)-[:HOME]->(home:Lot)
        OPTIONAL MATCH (c)-[:AT]->(location:Lot)
        RETURN c.id AS id, c.name AS name, c.age AS age, c.bio AS bio,
               h.id AS householdId, home.id AS homeLotId, location.id AS locationId
      `, { worldId });

      // 8. Get all animals
      const animals = await q(`
        MATCH (w:World {id:$worldId})-[:HAS_REGION]->(:Region)-[:HAS_LOT]->(:Lot)<-[:HOME]-(:Household)<-[:IN_HOUSEHOLD]-(a:Animal)
        OPTIONAL MATCH (a)-[:IN_HOUSEHOLD]->(h:Household)
        OPTIONAL MATCH (a)<-[:OWNS_PET]-(owner:Character)
        RETURN a.id AS id, a.name AS name, a.age AS age, a.traits AS traits, a.bio AS bio,
               h.id AS householdId, owner.id AS ownerId
      `, { worldId });

      // 9. Assemble the export data
      const exportData = {
        world,
        regions,
        lots,
        spaces,
        items,
        households,
        characters,
        animals,
        exportedAt: new Date().toISOString()
      };

      console.log(`✅ Exported world ${worldId}: ${regions.length} regions, ${lots.length} lots, ${characters.length} characters`);
      return exportData;
    },

    /**
     * Import a world from backup data
     * Creates a new world with all its data
     */
    importWorld: async (_: any, { data }: { data: any }) => {
      console.log('📥 Importing world from backup...');

      const importData = data;
      const oldWorldId = importData.world.id;
      const newWorldId = crypto.randomUUID();

      // ID mappings (old ID -> new ID)
      const idMap = new Map<string, string>();
      idMap.set(oldWorldId, newWorldId);

      await batch(async () => {
        // 1. Create world
        const worldName = `${importData.world.name} (Restored)`;
        const createdAt = new Date().toISOString();
        await q(`CREATE (:World {id:$id, name:$name, createdAt:$createdAt})`, {
          id: newWorldId,
          name: worldName,
          createdAt
        });
        console.log(`  ✓ Created world: ${worldName}`);

        // 2. Create regions
        for (const region of importData.regions) {
          const newRegionId = crypto.randomUUID();
          idMap.set(region.id, newRegionId);

          await q(`CREATE (:Region {id:$id, name:$name, worldId:$worldId, kind:$kind})`, {
            id: newRegionId,
            name: region.name,
            worldId: newWorldId,
            kind: region.kind
          });

          await q(`
            MATCH (w:World {id:$worldId}), (r:Region {id:$regionId})
            CREATE (w)-[:HAS_REGION]->(r)
          `, { worldId: newWorldId, regionId: newRegionId });
        }
        console.log(`  ✓ Created ${importData.regions.length} regions`);

        // 3. Create lots
        for (const lot of importData.lots) {
          const newLotId = crypto.randomUUID();
          idMap.set(lot.id, newLotId);
          const newRegionId = idMap.get(lot.regionId);

          await q(`CREATE (:Lot {id:$id, name:$name, lotType:$lotType})`, {
            id: newLotId,
            name: lot.name,
            lotType: lot.lotType
          });

          await q(`
            MATCH (r:Region {id:$regionId}), (l:Lot {id:$lotId})
            CREATE (r)-[:HAS_LOT]->(l)
          `, { regionId: newRegionId, lotId: newLotId });
        }
        console.log(`  ✓ Created ${importData.lots.length} lots`);

        // 4. Create spaces
        for (const space of importData.spaces) {
          const newSpaceId = crypto.randomUUID();
          idMap.set(space.id, newSpaceId);
          const newLotId = idMap.get(space.lotId);

          await q(`CREATE (:Space {id:$id, name:$name, description:$description, isIndoor:$isIndoor})`, {
            id: newSpaceId,
            name: space.name,
            description: space.description,
            isIndoor: space.isIndoor
          });

          await q(`
            MATCH (l:Lot {id:$lotId}), (s:Space {id:$spaceId})
            CREATE (l)-[:HAS_SPACE]->(s)
          `, { lotId: newLotId, spaceId: newSpaceId });
        }
        console.log(`  ✓ Created ${importData.spaces.length} spaces`);

        // 5. Create items
        for (const item of importData.items) {
          const newItemId = crypto.randomUUID();
          idMap.set(item.id, newItemId);
          const newSpaceId = idMap.get(item.spaceId);

          await q(`CREATE (:Item {
            id: $id,
            name: $name,
            description: $description,
            canBeUsedByHumans: $canBeUsedByHumans,
            canBeUsedByAnimals: $canBeUsedByAnimals,
            minimumAgeToUse: $minimumAgeToUse,
            maxSimultaneousUsers: $maxSimultaneousUsers,
            allowedActivities: $allowedActivities,
            satisfiesNeeds: $satisfiesNeeds,
            canStoreItems: $canStoreItems,
            cost: $cost,
            count: $count
          })`, {
            id: newItemId,
            name: item.name,
            description: item.description,
            canBeUsedByHumans: item.canBeUsedByHumans || true,
            canBeUsedByAnimals: item.canBeUsedByAnimals || false,
            minimumAgeToUse: item.minimumAgeToUse || 0,
            maxSimultaneousUsers: item.maxSimultaneousUsers || 1,
            allowedActivities: item.allowedActivities || [],
            satisfiesNeeds: item.satisfiesNeeds || [],
            canStoreItems: item.canStoreItems || false,
            cost: item.cost || 0,
            count: item.count || 1
          });

          await q(`
            MATCH (i:Item {id:$itemId}), (s:Space {id:$spaceId})
            CREATE (i)-[:ON_SPACE]->(s)
          `, { itemId: newItemId, spaceId: newSpaceId });
        }
        console.log(`  ✓ Created ${importData.items.length} items`);

        // 6. Create households
        for (const household of importData.households) {
          const newHouseholdId = crypto.randomUUID();
          idMap.set(household.id, newHouseholdId);
          const newLotId = idMap.get(household.lotId);

          await q(`CREATE (:Household {id:$id, name:$name})`, {
            id: newHouseholdId,
            name: household.name
          });

          await q(`
            MATCH (h:Household {id:$householdId}), (l:Lot {id:$lotId})
            CREATE (h)-[:HOME]->(l)
          `, { householdId: newHouseholdId, lotId: newLotId });
        }
        console.log(`  ✓ Created ${importData.households.length} households`);

        // 7. Create characters
        for (const char of importData.characters) {
          const newCharId = crypto.randomUUID();
          idMap.set(char.id, newCharId);
          const newHouseholdId = idMap.get(char.householdId);
          const newHomeLotId = idMap.get(char.homeLotId);
          const newLocationId = idMap.get(char.locationId);

          await q(`CREATE (:Character {id:$id, name:$name, age:$age, bio:$bio})`, {
            id: newCharId,
            name: char.name,
            age: char.age,
            bio: char.bio || ''
          });

          // Link to household
          if (newHouseholdId) {
            await q(`
              MATCH (c:Character {id:$charId}), (h:Household {id:$householdId})
              CREATE (c)-[:IN_HOUSEHOLD]->(h)
            `, { charId: newCharId, householdId: newHouseholdId });
          }

          // Link to home lot
          if (newHomeLotId) {
            await q(`
              MATCH (c:Character {id:$charId}), (l:Lot {id:$lotId})
              CREATE (c)-[:HOME]->(l)
            `, { charId: newCharId, lotId: newHomeLotId });
          }

          // Link to current location
          if (newLocationId) {
            await q(`
              MATCH (c:Character {id:$charId}), (l:Lot {id:$lotId})
              CREATE (c)-[:AT {at: $at}]->(l)
            `, { charId: newCharId, lotId: newLocationId, at: new Date().toISOString() });
          }
        }
        console.log(`  ✓ Created ${importData.characters.length} characters`);

        // 8. Create animals
        for (const animal of importData.animals) {
          const newAnimalId = crypto.randomUUID();
          idMap.set(animal.id, newAnimalId);
          const newHouseholdId = idMap.get(animal.householdId);
          const newOwnerId = idMap.get(animal.ownerId);

          await q(`CREATE (:Animal {id:$id, name:$name, age:$age, traits:$traits, bio:$bio})`, {
            id: newAnimalId,
            name: animal.name,
            age: animal.age,
            traits: animal.traits || [],
            bio: animal.bio || ''
          });

          // Link to household
          if (newHouseholdId) {
            await q(`
              MATCH (a:Animal {id:$animalId}), (h:Household {id:$householdId})
              CREATE (a)-[:IN_HOUSEHOLD]->(h)
            `, { animalId: newAnimalId, householdId: newHouseholdId });
          }

          // Link to owner
          if (newOwnerId) {
            await q(`
              MATCH (a:Animal {id:$animalId}), (c:Character {id:$ownerId})
              CREATE (c)-[:OWNS_PET]->(a)
            `, { animalId: newAnimalId, ownerId: newOwnerId });
          }
        }
        console.log(`  ✓ Created ${importData.animals.length} animals`);
      });

      console.log(`✅ World imported successfully! New world ID: ${newWorldId}`);

      return {
        worldId: newWorldId,
        success: true,
        message: `World "${importData.world.name}" restored successfully`
      };
    },
  },
};
