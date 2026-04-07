import kuzu from "kuzu";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

export async function migrateDatabase(): Promise<{ addedItemRolesColumn: boolean; backfilledItemRoles: number }> {
  let addedItemRolesColumn = false;

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

  return {
    addedItemRolesColumn,
    backfilledItemRoles
  };
}

async function runSetup({ includeMigrations }: { includeMigrations: boolean }) {
  await applyDDL();

  if (!includeMigrations) {
    return;
  }

  const migrationResult = await migrateDatabase();
  if (migrationResult.addedItemRolesColumn || migrationResult.backfilledItemRoles > 0) {
    console.log(
      `Migrations applied. Added itemRoles column: ${migrationResult.addedItemRolesColumn}. Backfilled items: ${migrationResult.backfilledItemRoles}.`
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
        `Migration finished. Added itemRoles column: ${result.addedItemRolesColumn}. Backfilled items: ${result.backfilledItemRoles}.`
      );
      process.exit(0);
    })
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}
