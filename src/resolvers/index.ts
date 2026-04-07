import { WorldResolvers } from "./world";
import { CharacterResolvers } from "./character";
import { ActivityResolvers } from "./activity";
import { RelationshipResolvers } from "./relationship";
import { HouseholdResolvers } from "./household";

export const resolvers = {
  Query: {
    ...WorldResolvers.Query,
    ...CharacterResolvers.Query,
    ...ActivityResolvers.Query,
    ...RelationshipResolvers.Query,
    ...HouseholdResolvers.Query,
  },
  Mutation: {
    ...WorldResolvers.Mutation,
    ...CharacterResolvers.Mutation,
    ...ActivityResolvers.Mutation,
    ...RelationshipResolvers.Mutation,
    ...HouseholdResolvers.Mutation,
  },
  Character: {
    ...CharacterResolvers.Character,
    ...RelationshipResolvers.Character,
  },
  Relationship: RelationshipResolvers.Relationship,
  Memory: RelationshipResolvers.Memory,
  Space: WorldResolvers.Space,
  Region: WorldResolvers.Region,
  Lot: WorldResolvers.Lot,
  Item: WorldResolvers.Item,
};
