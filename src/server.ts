import { createYoga } from "graphql-yoga";
import { createServer } from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import fs from "node:fs";
import path from "node:path";
import { applyDDL } from "./db";
import { resolvers } from "./resolvers";

const schemaPath = path.join(process.cwd(), "src", "schema.graphql");

async function main() {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.graphql not found at ${schemaPath}`);
  }

  await applyDDL();

  const typeDefs = fs.readFileSync(schemaPath, "utf8");
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const yoga = createYoga({
    schema,
    graphqlEndpoint: "/graphql",
  });

  const server = createServer(yoga);
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  server.listen(port, () => {
    console.log(`🚀 GraphQL Yoga running at http://localhost:${port}/graphql`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
