import { GraphQLError } from "graphql";
import { q } from "./kuzuHelpers";

/**
 * What a character approves or disapproves of. A stance is {topicId, stance}; anything not
 * listed gets the topic's default stance (neutral for most topics); "neutral" is an explicit no-opinion. Topic ids are defined by the frontend's approval topics (the simulation
 * ignores ids it doesn't know), so the backend stores them as opaque strings.
 */
export type StanceValue = "approves" | "disapproves" | "neutral";

export interface Stance {
  topicId: string;
  stance: StanceValue;
}

const VALID_STANCES = new Set<string>(["approves", "disapproves", "neutral"]);

/** Throws a readable GraphQL error for an empty topic or an unknown stance. */
export function validateStances(stances: Array<{ topicId: string; stance: string }>): Stance[] {
  for (const entry of stances) {
    if (!entry.topicId?.trim()) {
      throw new GraphQLError("A stance needs a topicId");
    }
    if (!VALID_STANCES.has(entry.stance)) {
      throw new GraphQLError(`Unknown stance "${entry.stance}" for topic ${entry.topicId}; use "approves", "disapproves" or "neutral"`);
    }
  }
  return stances as Stance[];
}

/** One JSON string per topic; if a topic appears twice the last one wins. */
export function serializeStances(stances: Stance[] = []): string[] {
  const byTopic = new Map<string, Stance>();
  for (const stance of stances) {
    byTopic.set(stance.topicId, { topicId: stance.topicId, stance: stance.stance });
  }
  return [...byTopic.values()].map((stance) => JSON.stringify(stance));
}

export function deserializeStances(entries: string[] | null | undefined): Stance[] {
  return (entries ?? []).flatMap((entry) => {
    try {
      const parsed = JSON.parse(entry) as Partial<Stance>;
      return parsed.topicId && parsed.stance && VALID_STANCES.has(parsed.stance)
        ? [{ topicId: parsed.topicId, stance: parsed.stance }]
        : [];
    } catch {
      return [];
    }
  });
}

/** Replace a character's stances with exactly the given list (an empty list clears them). */
export async function setCharacterStances(characterId: string, stances: Array<{ topicId: string; stance: string }>): Promise<void> {
  const valid = validateStances(stances);
  await q(`MATCH (c:Character {id:$cid}) SET c.stances = $stances`, { cid: characterId, stances: serializeStances(valid) });
}

export async function getCharacterStances(characterId: string): Promise<Stance[]> {
  const [row] = await q<{ stances: string[] | null }>(`MATCH (c:Character {id:$cid}) RETURN c.stances AS stances`, { cid: characterId });
  return deserializeStances(row?.stances);
}
