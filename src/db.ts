import kuzu from "kuzu";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDefaultItemComfort } from "./resolvers/itemComfort";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(__dirname, "..", "data", "clockwork-town.kuzu");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new kuzu.Database(DB_PATH);
export const conn = new kuzu.Connection(db);

export async function applyDDL() {
  const ddlPath = path.join(__dirname, "kuzu.ddl.sql");
  let sql = fs.readFileSync(ddlPath, "utf8");

  // 1) drop all comments (both inline and full-line)
  sql = sql.replace(/--.*$/gm, "");

  // 2) split on semicolons that end statements
  const stmts = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => s.trim())
    .filter(Boolean);

  for (const s of stmts) {
    await conn.query(s);
  }
}

function isDuplicatePropertyError(error: unknown, propertyName: string): boolean {
  return error instanceof Error && error.message.includes(`already has property ${propertyName}`);
}

export async function migrateDatabase(): Promise<{
  addedItemRolesColumn: boolean;
  backfilledItemRoles: number;
  addedComfortColumn: boolean;
  backfilledComfort: number;
  addedWorkScheduleColumn: boolean;
  backfilledWorkSchedule: number;
  addedRelationshipColumns: string[];
  backfilledRelationships: number;
  addedMemoryColumns: string[];
  backfilledMemories: number;
}> {
  let addedItemRolesColumn = false;
  let addedComfortColumn = false;
  let addedWorkScheduleColumn = false;
  const addedRelationshipColumns: string[] = [];
  const addedMemoryColumns: string[] = [];

  try {
    await conn.query("ALTER TABLE Item ADD itemRoles STRING[]");
    addedItemRolesColumn = true;
  } catch (error) {
    if (!isDuplicatePropertyError(error, "itemRoles")) {
      throw error;
    }
  }

  const updatedRows = await conn.query(`
    MATCH (i:Item)
    WHERE i.itemRoles IS NULL
    SET i.itemRoles = []
    RETURN COUNT(i) AS count
  `);
  const [row] = await updatedRows.getAll() as Array<{ count?: number | string }>;
  const backfilledItemRoles = Number(row?.count ?? 0);

  try {
    await conn.query("ALTER TABLE Item ADD comfort DOUBLE");
    addedComfortColumn = true;
  } catch (error) {
    if (!isDuplicatePropertyError(error, "comfort")) {
      throw error;
    }
  }

  const itemRows = await conn.query(`
    MATCH (i:Item)
    RETURN i.id AS id, i.name AS name, i.itemRoles AS itemRoles, i.comfort AS comfort
  `);
  const items = await itemRows.getAll() as Array<{
    id?: string;
    name?: string;
    itemRoles?: string[] | null;
    comfort?: number | null;
  }>;
  let backfilledComfort = 0;

  for (const item of items) {
    if (item.comfort !== null && item.comfort !== undefined) {
      continue;
    }

    const escapedId = String(item.id).replace(/'/g, "\\'");
    const comfort = getDefaultItemComfort({
      name: item.name,
      itemRoles: item.itemRoles || []
    });

    await conn.query(`
      MATCH (i:Item {id:'${escapedId}'})
      SET i.comfort = ${comfort}
    `);
    backfilledComfort += 1;
  }

  try {
    await conn.query("ALTER TABLE Character ADD workSchedule STRING[]");
    addedWorkScheduleColumn = true;
  } catch (error) {
    if (!isDuplicatePropertyError(error, "workSchedule")) {
      throw error;
    }
  }

  const updatedCharacters = await conn.query(`
    MATCH (c:Character)
    WHERE c.workSchedule IS NULL
    SET c.workSchedule = []
    RETURN COUNT(c) AS count
  `);
  const [characterRow] = await updatedCharacters.getAll() as Array<{ count?: number | string }>;
  const backfilledWorkSchedule = Number(characterRow?.count ?? 0);

  for (const [propertyName, dataType] of [
    ["fromCharacterId", "STRING"],
    ["toCharacterId", "STRING"],
    ["shortTermScore", "DOUBLE"],
    ["longTermScore", "DOUBLE"],
    ["labels", "STRING[]"],
    ["lastSeenAt", "TIMESTAMP"],
    ["lastSpokeAt", "TIMESTAMP"],
    ["isDeceasedTarget", "BOOL"]
  ] as const) {
    try {
      await conn.query(`ALTER TABLE Relationship ADD ${propertyName} ${dataType}`);
      addedRelationshipColumns.push(propertyName);
    } catch (error) {
      if (!isDuplicatePropertyError(error, propertyName)) {
        throw error;
      }
    }
  }

  const updatedRelationships = await conn.query(`
    MATCH (rel:Relationship)
    OPTIONAL MATCH (rel)-[:FROM_CHARACTER]->(fromCharacter:Character)
    OPTIONAL MATCH (rel)-[:TO_CHARACTER]->(toCharacter:Character)
    SET
      rel.fromCharacterId = COALESCE(rel.fromCharacterId, fromCharacter.id),
      rel.toCharacterId = COALESCE(rel.toCharacterId, toCharacter.id),
      rel.shortTermScore = COALESCE(rel.shortTermScore, rel.shortTermCloseness, 0.0),
      rel.longTermScore = COALESCE(rel.longTermScore, rel.longTermCloseness, 0.0),
      rel.labels = COALESCE(rel.labels, []),
      rel.isDeceasedTarget = COALESCE(rel.isDeceasedTarget, false)
    RETURN COUNT(rel) AS count
  `);
  const [relationshipRow] = await updatedRelationships.getAll() as Array<{ count?: number | string }>;
  const backfilledRelationships = Number(relationshipRow?.count ?? 0);

  for (const [propertyName, dataType] of [
    ["eventType", "STRING"],
    ["locationLotId", "STRING"],
    ["locationLotName", "STRING"],
    ["locationSpaceId", "STRING"],
    ["locationSpaceName", "STRING"],
    ["relationshipIds", "STRING[]"]
  ] as const) {
    try {
      await conn.query(`ALTER TABLE Memory ADD ${propertyName} ${dataType}`);
      addedMemoryColumns.push(propertyName);
    } catch (error) {
      if (!isDuplicatePropertyError(error, propertyName)) {
        throw error;
      }
    }
  }

  const updatedMemories = await conn.query(`
    MATCH (memory:Memory)
    SET memory.relationshipIds = COALESCE(memory.relationshipIds, [])
    RETURN COUNT(memory) AS count
  `);
  const [memoryRow] = await updatedMemories.getAll() as Array<{ count?: number | string }>;
  const backfilledMemories = Number(memoryRow?.count ?? 0);

  return {
    addedItemRolesColumn,
    backfilledItemRoles,
    addedComfortColumn,
    backfilledComfort,
    addedWorkScheduleColumn,
    backfilledWorkSchedule,
    addedRelationshipColumns,
    backfilledRelationships,
    addedMemoryColumns,
    backfilledMemories
  };
}

async function runSetup({ includeMigrations }: { includeMigrations: boolean }) {
  await applyDDL();

  if (!includeMigrations) {
    return;
  }

  const migrationResult = await migrateDatabase();
  if (
    migrationResult.addedItemRolesColumn
    || migrationResult.backfilledItemRoles > 0
    || migrationResult.addedComfortColumn
    || migrationResult.backfilledComfort > 0
    || migrationResult.addedWorkScheduleColumn
    || migrationResult.backfilledWorkSchedule > 0
    || migrationResult.addedRelationshipColumns.length > 0
    || migrationResult.backfilledRelationships > 0
    || migrationResult.addedMemoryColumns.length > 0
    || migrationResult.backfilledMemories > 0
  ) {
    console.log(
      `Migrations applied. Added itemRoles column: ${migrationResult.addedItemRolesColumn}. Backfilled itemRoles: ${migrationResult.backfilledItemRoles}. Added comfort column: ${migrationResult.addedComfortColumn}. Backfilled comfort: ${migrationResult.backfilledComfort}. Added workSchedule column: ${migrationResult.addedWorkScheduleColumn}. Backfilled workSchedule: ${migrationResult.backfilledWorkSchedule}. Added relationship columns: ${migrationResult.addedRelationshipColumns.join(",") || "none"}. Backfilled relationships: ${migrationResult.backfilledRelationships}. Added memory columns: ${migrationResult.addedMemoryColumns.join(",") || "none"}. Backfilled memories: ${migrationResult.backfilledMemories}.`
    );
  } else {
    console.log("Migrations already up to date.");
  }
}

if (process.argv.includes("--ddl")) {
  runSetup({ includeMigrations: true })
    .then(() => {
      console.log("DDL applied.");
      process.exit(0);
    })
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}

if (process.argv.includes("--migrate")) {
  migrateDatabase()
    .then(result => {
      console.log(
        `Migration finished. Added itemRoles column: ${result.addedItemRolesColumn}. Backfilled itemRoles: ${result.backfilledItemRoles}. Added comfort column: ${result.addedComfortColumn}. Backfilled comfort: ${result.backfilledComfort}. Added workSchedule column: ${result.addedWorkScheduleColumn}. Backfilled workSchedule: ${result.backfilledWorkSchedule}. Added relationship columns: ${result.addedRelationshipColumns.join(",") || "none"}. Backfilled relationships: ${result.backfilledRelationships}. Added memory columns: ${result.addedMemoryColumns.join(",") || "none"}. Backfilled memories: ${result.backfilledMemories}.`
      );
      process.exit(0);
    })
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}
