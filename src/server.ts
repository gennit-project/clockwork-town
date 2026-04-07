import { createYoga } from "graphql-yoga";
import { createServer } from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyDDL, migrateDatabase } from "./db";
import { resolvers } from "./resolvers";
import { backfillMissingItemAffordances } from "./resolvers/itemAffordanceInference";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(process.cwd(), "src", "schema.graphql");

async function main() {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.graphql not found at ${schemaPath}`);
  }

  await applyDDL();
  const migrationResult = await migrateDatabase();
  const repairedItems = await backfillMissingItemAffordances();

  const typeDefs = fs.readFileSync(schemaPath, "utf8");
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const yoga = createYoga({
    schema,
    graphqlEndpoint: "/graphql",
  });

  const distPath = path.join(__dirname, "..", "dist");
  const hasBuiltFrontend = fs.existsSync(distPath);

  const server = createServer(async (req, res) => {
    const requestUrl = req.url ?? "/";

    // Handle GraphQL requests
    if (requestUrl.startsWith("/graphql")) {
      return yoga(req, res);
    }

    // Serve frontend if built
    if (hasBuiltFrontend) {
      const filePath = requestUrl === "/" || requestUrl === ""
        ? path.join(distPath, "index.html")
        : path.join(distPath, requestUrl);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const contentTypes: Record<string, string> = {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".svg": "image/svg+xml",
        };
        res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain" });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      // SPA fallback
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(path.join(distPath, "index.html")).pipe(res);
      return;
    }

    // No frontend built
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("GraphQL API is running. Build the frontend with: npm run build:frontend");
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`   GraphQL endpoint: http://localhost:${port}/graphql`);
    if (repairedItems > 0) {
      console.log(`   Repaired affordances for ${repairedItems} existing items`);
    }
    if (
      migrationResult.addedItemRolesColumn
      || migrationResult.backfilledItemRoles > 0
      || migrationResult.addedComfortColumn
      || migrationResult.backfilledComfort > 0
    ) {
      console.log(
        `   Migrated item fields: itemRoles added=${migrationResult.addedItemRolesColumn}, itemRoles backfilled=${migrationResult.backfilledItemRoles}, comfort added=${migrationResult.addedComfortColumn}, comfort backfilled=${migrationResult.backfilledComfort}`
      );
    }
    if (hasBuiltFrontend) {
      console.log(`   Frontend: http://localhost:${port}`);
    } else {
      console.log(`   Run 'npm run build:frontend' to build the frontend`);
    }
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
