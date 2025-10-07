import { conn } from "./db";

export async function q<T = any>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
  // Kuzu doesn't support parameterized queries the way we're using them
  // We need to prepare the statement with parameters
  let preparedCypher = cypher;

  // Replace parameters in the query
  for (const [key, value] of Object.entries(params)) {
    const paramPlaceholder = `$${key}`;
    let replacementValue: string;

    if (value === null || value === undefined) {
      replacementValue = 'NULL';
    } else if (typeof value === 'string') {
      // Check if it looks like a timestamp (ISO 8601 format)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        replacementValue = `timestamp('${value}')`;
      } else {
        replacementValue = `'${value.replace(/'/g, "\\'")}'`;
      }
    } else if (typeof value === 'boolean') {
      replacementValue = value ? 'true' : 'false';
    } else if (typeof value === 'number') {
      replacementValue = String(value);
    } else if (Array.isArray(value)) {
      replacementValue = `[${value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : v).join(', ')}]`;
    } else {
      replacementValue = String(value);
    }

    preparedCypher = preparedCypher.replace(new RegExp(`\\${paramPlaceholder}\\b`, 'g'), replacementValue);
  }

  const res = await conn.query(preparedCypher);
  return (await res.getAll()) as T[];
}

// Simple "transaction-like" wrapper for sequential ops
export async function batch<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}
