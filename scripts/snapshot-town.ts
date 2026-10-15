/**
 * Snapshot a seeded town to a JSON fixture for the headless town-week harness.
 *
 * Run `npm run seed`, start the backend (PORT=4001 npm run dev), then:
 *   BACKEND=http://localhost:4001/graphql npm run snapshot:town
 *
 * It asks the backend the same questions the frontend's town loader asks and writes the answers
 * to frontend/src/stores/__tests__/fixtures/desert-willow.json. The harness replays them through
 * the real loader, so the simulated town matches what the app loads.
 */
import fs from "node:fs";
import path from "node:path";
import { queries } from "../frontend/src/graphql";

const endpoint = process.env.BACKEND ?? "http://localhost:4001/graphql";
const WORLD_ID = process.env.WORLD_ID ?? "world-desert-willow";
const REGION_ID = process.env.REGION_ID ?? "region-desert-willow";

async function ask<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables })
    });
  } catch {
    console.error(`Could not reach the backend at ${endpoint}. Start it first (PORT=4001 npm run dev).`);
    process.exit(1);
  }
  const body = (await response.json()) as { data?: T; errors?: unknown };
  if (!body.data) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

const lots = await ask<{ lots: Array<{ id: string }> }>(queries.getLots, { regionId: REGION_ID });
const households = await ask<unknown>(queries.getHouseholds, { regionId: REGION_ID });
const region = await ask<{ region: { characters: Array<{ id: string }> } }>(queries.getRegion, { id: REGION_ID });

const spaces: Record<string, unknown> = {};
for (const lot of lots.lots) spaces[lot.id] = await ask(queries.getSpacesWithItems, { lotId: lot.id });
const characters: Record<string, unknown> = {};
for (const character of region.region.characters) characters[character.id] = await ask(queries.getCharacter, { id: character.id });

const out = path.join(import.meta.dirname, "..", "frontend", "src", "stores", "__tests__", "fixtures", "desert-willow.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ worldId: WORLD_ID, regionId: REGION_ID, lots, households, region, spaces, characters }, null, 1));
console.log(`Wrote ${out}: ${lots.lots.length} lots, ${region.region.characters.length} residents.`);
