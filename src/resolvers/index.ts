import { WorldResolvers } from "./world";
import { CharacterResolvers } from "./character";
import { ActivityResolvers } from "./activity";
import { RelationshipResolvers } from "./relationship";

export const resolvers = {
  Query: {
    ...WorldResolvers.Query,
    ...CharacterResolvers.Query,
    ...ActivityResolvers.Query,
  },
  Mutation: {
    ...WorldResolvers.Mutation,
    ...CharacterResolvers.Mutation,
    ...ActivityResolvers.Mutation,
  }
};
