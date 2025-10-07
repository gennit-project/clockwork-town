import { conn } from "./db";

export async function q<T = any>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
  const res = await conn.query(cypher, params);
  return res.getAllObjects() as T[];
}

// Simple “transaction-like” wrapper for sequential ops
export async function batch<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}
