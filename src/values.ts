import { GraphQLError } from "graphql";
import { q } from "./kuzuHelpers";

/**
 * Value catalog. The database stores identity only (id/name/description); which
 * actions fulfill a value, and how long it can go neglected, lives in the frontend's
 * VALUE_DEFS map keyed by these ids. Keep the two in sync.
 */
export const VALUE_CATALOG: Array<{ id: string; name: string; description: string }> = [
  { id: "value-take-care-of-animals", name: "Take care of animals", description: "Feels most themselves looking after a pet." },
  { id: "value-read-books", name: "Read books", description: "Needs regular time with a good book." },
  { id: "value-write-books", name: "Write books", description: "Feels purposeful when writing." },
  { id: "value-be-a-good-friend", name: "Be a good friend", description: "Wants to show up for the people they care about." },
  { id: "value-happy-family", name: "Have a happy family", description: "Wants to stay close to family." },
  { id: "value-romantic-relationship", name: "Have a good romantic relationship", description: "Wants a loving partnership." },
  { id: "value-good-job-at-work", name: "Do a good job at work", description: "Takes pride in showing up and doing the work well." }
];

/** Idempotently create any catalog values that don't exist yet; returns how many were added. */
export async function ensureValueCatalog(): Promise<number> {
  let added = 0;
  for (const value of VALUE_CATALOG) {
    const existing = await q(`MATCH (v:Value {id:$id}) RETURN v.id AS id`, { id: value.id });
    if (existing.length > 0) continue;
    await q(`CREATE (:Value {id:$id, name:$name, description:$description})`, value);
    added += 1;
  }
  return added;
}

/**
 * Replace a character's values with exactly the given ids, in rank order (first = most
 * important). Rank lives in Character.valueOrder; HAS_VALUE edges mirror membership.
 */
export async function setCharacterValues(characterId: string, valueIds: string[]): Promise<void> {
  const ordered = [...new Set(valueIds)];
  const known = new Set((await q<{ id: string }>(`MATCH (v:Value) RETURN v.id AS id`)).map((r) => r.id));
  const unknown = ordered.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new GraphQLError(`Unknown value id(s): ${unknown.join(", ")}`);
  }

  await q(`MATCH (c:Character {id:$cid})-[r:HAS_VALUE]->(:Value) DELETE r`, { cid: characterId });
  for (const vid of ordered) {
    await q(`MATCH (c:Character {id:$cid}), (v:Value {id:$vid}) CREATE (c)-[:HAS_VALUE]->(v)`, { cid: characterId, vid });
  }
  await q(`MATCH (c:Character {id:$cid}) SET c.valueOrder = $order`, { cid: characterId, order: ordered });
}

/** A character's values in rank order. Falls back to edge order for characters with no stored ranking. */
export async function getCharacterValues(characterId: string): Promise<Array<{ id: string; name: string; description: string | null }>> {
  const [row] = await q<{ ranking: string[] | null }>(`MATCH (c:Character {id:$cid}) RETURN c.valueOrder AS ranking`, { cid: characterId });
  const values = await q<{ id: string; name: string; description: string | null }>(`
    MATCH (c:Character {id:$cid})-[:HAS_VALUE]->(v:Value)
    RETURN v.id AS id, v.name AS name, v.description AS description
  `, { cid: characterId });
  const rank = new Map((row?.ranking ?? []).map((id, index) => [id, index]));
  return values.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || a.name.localeCompare(b.name));
}
