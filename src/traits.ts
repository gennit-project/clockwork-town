import { GraphQLError } from "graphql";
import { q } from "./kuzuHelpers";

/**
 * Trait catalog. The database only stores identity (id/name/description); what a
 * trait *does* lives in the frontend's TRAIT_EFFECTS map, keyed by these ids.
 * A trait with no effects entry is display-only.
 */
export const TRAIT_CATALOG: Array<{ id: string; name: string; description: string }> = [
  { id: "trait-needs-little-sleep", name: "Needs little sleep", description: "Gets by on less rest; sleep drains slowly." },
  { id: "trait-needs-lots-of-sleep", name: "Needs lots of sleep", description: "Tires easily; sleep drains quickly." },
  { id: "trait-big-appetite", name: "Big appetite", description: "Gets hungry fast; food drains quickly." },
  { id: "trait-small-appetite", name: "Small appetite", description: "Eats little; food drains slowly." },
  { id: "trait-asexual", name: "Asexual", description: "Does not experience romantic or sexual attraction; the romance need is disabled." },
  { id: "trait-aromantic", name: "Aromantic", description: "Does not pursue romantic relationships; the romance need is disabled." },
  { id: "trait-good-hearted", name: "Good-hearted", description: "Takes joy in other people's happiness; being around happy people lifts their mood." },
  { id: "trait-bitter", name: "Bitter", description: "Takes grim satisfaction in other people's unhappiness; being around unhappy people lifts their mood." },
  { id: "trait-loses-temper-easily", name: "Loses temper easily", description: "Irritation builds quickly and boils over sooner." },
  { id: "trait-conflict-averse", name: "Conflict-averse", description: "Avoids confrontation; takes a lot to push them over the edge." },
  { id: "trait-forgiving", name: "Forgiving", description: "Holds grievances more lightly." },
  { id: "trait-petty", name: "Petty", description: "Small wrongs weigh heavily." },
  { id: "trait-jealous", name: "Jealous", description: "Feels it when someone they love gives their attention elsewhere." },
  { id: "trait-gossip", name: "Gossip", description: "Loves talking about other people." },
  { id: "trait-arrogant", name: "Arrogant", description: "Thinks rather well of themselves." }
];

/** Idempotently create any catalog traits that don't exist yet; returns how many were added. */
export async function ensureTraitCatalog(): Promise<number> {
  let added = 0;
  for (const trait of TRAIT_CATALOG) {
    const existing = await q(`MATCH (t:Trait {id:$id}) RETURN t.id AS id`, { id: trait.id });
    if (existing.length > 0) continue;
    await q(`CREATE (:Trait {id:$id, name:$name, description:$description})`, trait);
    added += 1;
  }
  return added;
}

/** Replace a character's traits with exactly the given trait ids. */
export async function setCharacterTraits(characterId: string, traitIds: string[]): Promise<void> {
  const known = new Set((await q<{ id: string }>(`MATCH (t:Trait) RETURN t.id AS id`)).map((r) => r.id));
  const unknown = traitIds.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new GraphQLError(`Unknown trait id(s): ${unknown.join(", ")}`);
  }

  await q(`MATCH (c:Character {id:$cid})-[r:HAS_TRAIT]->(:Trait) DELETE r`, { cid: characterId });
  for (const tid of new Set(traitIds)) {
    await q(`MATCH (c:Character {id:$cid}), (t:Trait {id:$tid}) CREATE (c)-[:HAS_TRAIT]->(t)`, { cid: characterId, tid });
  }
}
