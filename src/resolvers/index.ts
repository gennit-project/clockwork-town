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
    ...HouseholdResolvers.Query,
  },
  Mutation: {
    ...WorldResolvers.Mutation,
    ...CharacterResolvers.Mutation,
    ...ActivityResolvers.Mutation,
    ...HouseholdResolvers.Mutation,
  }
};
