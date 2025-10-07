import { batch, q } from "../kuzuHelpers";

export const HouseholdResolvers = {
  Query: {
    households: async (_: any, { regionId }: { regionId: string }) => {
      const households = await q(`
        MATCH (r:Region {id:$regionId})-[:HAS_LOT]->(l:Lot)<-[:HOUSEHOLD_AT]-(h:Household)
        RETURN h.id AS id, h.name AS name, l.id AS lotId, l.name AS lotName
      `, { regionId });

      // Get character count for each household
      const householdsWithChars = await Promise.all(
        households.map(async (h: any) => {
          const chars = await q(`
            MATCH (h:Household {id:$hid})<-[:IN_HOUSEHOLD]-(c:Character)
            RETURN c.id AS id, c.name AS name, c.age AS age
          `, { hid: h.id });
          return { ...h, characters: chars };
        })
      );

      return householdsWithChars;
    },

    household: async (_: any, { id }: { id: string }) => {
      const [h] = await q(`
        MATCH (h:Household {id:$id})
        OPTIONAL MATCH (h)-[:HOUSEHOLD_AT]->(l:Lot)
        RETURN h.id AS id, h.name AS name, l.id AS lotId, l.name AS lotName
      `, { id });

      if (!h) return null;

      const characters = await q(`
        MATCH (h:Household {id:$id})<-[:IN_HOUSEHOLD]-(c:Character)
        RETURN c.id AS id, c.name AS name, c.age AS age, c.bio AS bio
      `, { id });

      const animals = await q(`
        MATCH (h:Household {id:$id})<-[:ANIMAL_IN_HOUSEHOLD]-(an:Animal)
        RETURN an.id AS id, an.name AS name, an.age AS age, an.traits AS traits
      `, { id });

      return { ...h, characters, animals };
    },
  },

  Mutation: {
    createHousehold: async (_: any, { input, characters, animals }: {
      input: { id: string; name: string; regionId: string; lotId: string };
      characters: Array<{ id: string; name: string; age: number; bio?: string }>;
      animals?: Array<{ id: string; name: string; age: number; traits: string[]; ownerId: string }>
    }) => {
      const { id, name, lotId } = input;

      await batch(async () => {
        // Create household
        await q(`CREATE (:Household {id:$id, name:$name})`, { id, name });

        // Link to lot
        await q(`
          MATCH (h:Household {id:$hid}), (l:Lot {id:$lid})
          CREATE (h)-[:HOUSEHOLD_AT]->(l)
        `, { hid: id, lid: lotId });

        // Create and link characters
        for (const char of characters) {
          await q(`CREATE (:Character {id:$cid, name:$cname, age:$age, bio:$bio})`, {
            cid: char.id,
            cname: char.name,
            age: char.age,
            bio: char.bio || null
          });

          await q(`
            MATCH (c:Character {id:$cid}), (h:Household {id:$hid}), (l:Lot {id:$lid})
            CREATE (c)-[:IN_HOUSEHOLD]->(h), (c)-[:HOME]->(l)
          `, { cid: char.id, hid: id, lid: lotId });

          // Set current location
          const now = new Date().toISOString();
          await q(`
            MATCH (c:Character {id:$cid}), (l:Lot {id:$lid})
            CREATE (c)-[:AT {at: $now}]->(l)
          `, { cid: char.id, lid: lotId, now });
        }

        // Create and link animals
        if (animals && animals.length > 0) {
          for (const animal of animals) {
            await q(`CREATE (:Animal {id:$aid, name:$aname, age:$age, traits:$traits})`, {
              aid: animal.id,
              aname: animal.name,
              age: animal.age,
              traits: animal.traits
            });

            await q(`
              MATCH (an:Animal {id:$aid}), (h:Household {id:$hid})
              CREATE (an)-[:ANIMAL_IN_HOUSEHOLD]->(h)
            `, { aid: animal.id, hid: id });

            await q(`
              MATCH (an:Animal {id:$aid}), (l:Lot {id:$lid})
              CREATE (an)-[:ANIMAL_HOME]->(l)
            `, { aid: animal.id, lid: lotId });

            await q(`
              MATCH (an:Animal {id:$aid}), (c:Character {id:$cid})
              CREATE (c)-[:OWNS_ANIMAL]->(an)
            `, { aid: animal.id, cid: animal.ownerId });

            // Set current location for animal
            const now = new Date().toISOString();
            await q(`
              MATCH (an:Animal {id:$aid}), (l:Lot {id:$lid})
              CREATE (an)-[:ANIMAL_AT {at: $now}]->(l)
            `, { aid: animal.id, lid: lotId, now });
          }
        }
      });

      return await HouseholdResolvers.Query.household(null, { id });
    },

    updateHousehold: async (_: any, { id, name, lotId, characters, animals }: {
      id: string;
      name: string;
      lotId: string;
      characters?: Array<{ id: string; name: string; age: number; bio?: string }>;
      animals?: Array<{ id: string; name: string; age: number; traits: string[]; ownerId: string }>
    }) => {
      // Update household and lot in one batch
      await batch(async () => {
        await q(`MATCH (h:Household {id:$id}) SET h.name = $name`, { id, name });
        await q(`MATCH (h:Household {id:$id})-[r:HOUSEHOLD_AT]->() DELETE r`, { id });
        await q(`
          MATCH (h:Household {id:$hid}), (l:Lot {id:$lid})
          CREATE (h)-[:HOUSEHOLD_AT]->(l)
        `, { hid: id, lid: lotId });
      });

      // Update characters in a separate batch
      if (characters && characters.length > 0) {
        await batch(async () => {
          const existingChars = await q(`
            MATCH (h:Household {id:$hid})<-[:IN_HOUSEHOLD]-(c:Character)
            RETURN c.id AS id
          `, { hid: id });

          const existingCharIds = new Set(existingChars.map((c: any) => c.id));
          const newCharIds = new Set(characters.map(c => c.id));

          for (const char of existingChars) {
            if (!newCharIds.has(char.id)) {
              await q(`MATCH (c:Character {id:$cid}) DETACH DELETE c`, { cid: char.id });
            }
          }

          for (const char of characters) {
            if (existingCharIds.has(char.id)) {
              await q(`
                MATCH (c:Character {id:$cid})
                SET c.name = $cname, c.age = $age, c.bio = $bio
              `, {
                cid: char.id,
                cname: char.name,
                age: char.age,
                bio: char.bio || null
              });
            } else {
              await q(`CREATE (:Character {id:$cid, name:$cname, age:$age, bio:$bio})`, {
                cid: char.id,
                cname: char.name,
                age: char.age,
                bio: char.bio || null
              });

              await q(`
                MATCH (c:Character {id:$cid}), (h:Household {id:$hid})
                CREATE (c)-[:IN_HOUSEHOLD]->(h)
              `, { cid: char.id, hid: id });

              await q(`
                MATCH (c:Character {id:$cid}), (l:Lot {id:$lid})
                CREATE (c)-[:HOME]->(l)
              `, { cid: char.id, lid: lotId });

              const now = new Date().toISOString();
              await q(`
                MATCH (c:Character {id:$cid}), (l:Lot {id:$lid})
                CREATE (c)-[:AT {at: $now}]->(l)
              `, { cid: char.id, lid: lotId, now });
            }
          }

          const allChars = await q(`
            MATCH (h:Household {id:$hid})<-[:IN_HOUSEHOLD]-(c:Character)
            RETURN c.id AS id
          `, { hid: id });

          for (const char of allChars) {
            await q(`MATCH (c:Character {id:$cid})-[r:HOME]->() DELETE r`, { cid: char.id });
            await q(`
              MATCH (c:Character {id:$cid}), (l:Lot {id:$lid})
              CREATE (c)-[:HOME]->(l)
            `, { cid: char.id, lid: lotId });

            await q(`MATCH (c:Character {id:$cid})-[r:AT]->() DELETE r`, { cid: char.id });
            const now = new Date().toISOString();
            await q(`
              MATCH (c:Character {id:$cid}), (l:Lot {id:$lid})
              CREATE (c)-[:AT {at: $now}]->(l)
            `, { cid: char.id, lid: lotId, now });
          }
        });
      }

      // Update animals in a completely separate batch
      if (animals && animals.length > 0) {
        await batch(async () => {
          const existingAnimals = await q(`
            MATCH (h:Household {id:$hid})<-[:ANIMAL_IN_HOUSEHOLD]-(an:Animal)
            RETURN an.id AS id
          `, { hid: id });

          const existingAnimalIds = new Set(existingAnimals.map((an: any) => an.id));
          const newAnimalIds = new Set(animals.map(an => an.id));

          for (const animal of existingAnimals) {
            if (!newAnimalIds.has(animal.id)) {
              await q(`MATCH (an:Animal {id:$aid}) DETACH DELETE an`, { aid: animal.id });
            }
          }

          for (const animal of animals) {
            if (existingAnimalIds.has(animal.id)) {
              await q(`
                MATCH (an:Animal {id:$aid})
                SET an.name = $aname, an.age = $age, an.traits = $traits
              `, {
                aid: animal.id,
                aname: animal.name,
                age: animal.age,
                traits: animal.traits
              });

              await q(`MATCH (an:Animal {id:$aid})<-[r:OWNS_ANIMAL]-() DELETE r`, { aid: animal.id });
              await q(`
                MATCH (an:Animal {id:$aid}), (ch:Character {id:$cid})
                CREATE (ch)-[:OWNS_ANIMAL]->(an)
              `, { aid: animal.id, cid: animal.ownerId });
            } else {
              await q(`CREATE (:Animal {id:$aid, name:$aname, age:$age, traits:$traits})`, {
                aid: animal.id,
                aname: animal.name,
                age: animal.age,
                traits: animal.traits
              });

              await q(`
                MATCH (an:Animal {id:$aid}), (h:Household {id:$hid})
                CREATE (an)-[:ANIMAL_IN_HOUSEHOLD]->(h)
              `, { aid: animal.id, hid: id });

              await q(`
                MATCH (an:Animal {id:$aid}), (l:Lot {id:$lid})
                CREATE (an)-[:ANIMAL_HOME]->(l)
              `, { aid: animal.id, lid: lotId });

              await q(`
                MATCH (an:Animal {id:$aid}), (ch:Character {id:$cid})
                CREATE (ch)-[:OWNS_ANIMAL]->(an)
              `, { aid: animal.id, cid: animal.ownerId });

              const now = new Date().toISOString();
              await q(`
                MATCH (an:Animal {id:$aid}), (l:Lot {id:$lid})
                CREATE (an)-[:ANIMAL_AT {at: $now}]->(l)
              `, { aid: animal.id, lid: lotId, now });
            }
          }

          const allAnimals = await q(`
            MATCH (h:Household {id:$hid})<-[:ANIMAL_IN_HOUSEHOLD]-(an:Animal)
            RETURN an.id AS id
          `, { hid: id });

          for (const animal of allAnimals) {
            await q(`MATCH (an:Animal {id:$aid})-[r:ANIMAL_HOME]->() DELETE r`, { aid: animal.id });
            await q(`
              MATCH (an:Animal {id:$aid}), (l:Lot {id:$lid})
              CREATE (an)-[:ANIMAL_HOME]->(l)
            `, { aid: animal.id, lid: lotId });

            await q(`MATCH (an:Animal {id:$aid})-[r:ANIMAL_AT]->() DELETE r`, { aid: animal.id });
            const now = new Date().toISOString();
            await q(`
              MATCH (an:Animal {id:$aid}), (l:Lot {id:$lid})
              CREATE (an)-[:ANIMAL_AT {at: $now}]->(l)
            `, { aid: animal.id, lid: lotId, now });
          }
        });
      }

      return await HouseholdResolvers.Query.household(null, { id });
    },

    deleteHousehold: async (_: any, { id }: { id: string }) => {
      await batch(async () => {
        // Delete characters in household
        await q(`
          MATCH (h:Household {id:$id})<-[:IN_HOUSEHOLD]-(c:Character)
          DETACH DELETE c
        `, { id });

        // Delete household
        await q(`MATCH (h:Household {id:$id}) DETACH DELETE h`, { id });
      });

      return true;
    },
  },
};
