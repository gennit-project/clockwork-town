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
}> {
  let addedItemRolesColumn = false;
  let addedComfortColumn = false;

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
  const [row] = await updatedRows.getAll();
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
  const items = await itemRows.getAll();
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

  return {
    addedItemRolesColumn,
    backfilledItemRoles,
    addedComfortColumn,
    backfilledComfort
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
  ) {
    console.log(
      `Migrations applied. Added itemRoles column: ${migrationResult.addedItemRolesColumn}. Backfilled itemRoles: ${migrationResult.backfilledItemRoles}. Added comfort column: ${migrationResult.addedComfortColumn}. Backfilled comfort: ${migrationResult.backfilledComfort}.`
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
        `Migration finished. Added itemRoles column: ${result.addedItemRolesColumn}. Backfilled itemRoles: ${result.backfilledItemRoles}. Added comfort column: ${result.addedComfortColumn}. Backfilled comfort: ${result.backfilledComfort}.`
      );
      process.exit(0);
    })
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}
