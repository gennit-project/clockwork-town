import { q } from "../kuzuHelpers";

export const RelationshipResolvers = {
  Character: {
    knownCharacters: async (parent: { id: string }) => {
      return q(`
        MATCH (rel:Relationship)-[:FROM_CHARACTER]->(:Character {id:$cid})
        MATCH (rel)-[:TO_CHARACTER]->(tc:Character)
        RETURN
          rel.id AS id,
          rel.relationshipType AS relationshipType,
          rel.relationshipDepth AS relationshipDepth,
          rel.longTermCloseness AS longTermCloseness,
          rel.shortTermCloseness AS shortTermCloseness
      `, { cid: parent.id });
    },
    knownAnimals: async (parent: { id: string }) => {
      return q(`
        MATCH (rel:Relationship)-[:FROM_CHARACTER]->(:Character {id:$cid})
        MATCH (rel)-[:TO_ANIMAL]->(ta:Animal)
        RETURN
          rel.id AS id,
          rel.relationshipType AS relationshipType,
          rel.relationshipDepth AS relationshipDepth,
          rel.longTermCloseness AS longTermCloseness,
          rel.shortTermCloseness AS shortTermCloseness
      `, { cid: parent.id });
    }
  }
};
