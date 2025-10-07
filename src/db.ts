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

if (process.argv.includes("--ddl")) {
  applyDDL()
    .then(() => {
      console.log("DDL applied.");
      process.exit(0);
    })
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}
