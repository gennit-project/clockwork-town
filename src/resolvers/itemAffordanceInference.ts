import { q } from "../kuzuHelpers";
import { decodeAffordances, encodeAffordances, type ItemAffordance } from "./itemAffordances";

interface ItemLike {
  id?: string
  name?: string
  description?: string
  affordances?: ItemAffordance[]
  allowedActivities?: string[]
  satisfiesNeeds?: string[]
}

const AFFORDANCE_RULES: Array<{ action: ItemAffordance["action"]; patterns: RegExp[]; weight?: number }> = [
  {
    action: "sleep",
    patterns: [/\bbed\b/, /\bbunk\b/, /\bcrib\b/, /\bhammock\b/, /\bmattress\b/, /\brecliner\b/, /\bcouch\b/, /\bsofa\b/, /\bloveseat\b/],
    weight: 1.4
  },
  {
    action: "eat",
    patterns: [/\bfridge\b/, /\brefrigerator\b/, /\btable\b/, /\bdining\b/, /\bchair\b/, /\bstove\b/, /\boven\b/, /\bmicrowave\b/, /\bkitchen\b/, /\bcounter\b/, /\bpantry\b/],
    weight: 1.2
  },
  {
    action: "use_toilet",
    patterns: [/\btoilet\b/, /\blatrine\b/, /\bwc\b/, /\brestroom\b/],
    weight: 1.8
  },
  {
    action: "shower",
    patterns: [/\bshower\b/, /\bbathtub\b/, /\btub\b/, /\bbath\b/, /\bsink\b/, /\bwash\b/],
    weight: 1.6
  },
  {
    action: "medicate",
    patterns: [/\bmedicine\b/, /\bmed cabinet\b/, /\bfirst aid\b/, /\bbandage\b/, /\bpharmacy\b/, /\bmedical\b/],
    weight: 1.5
  },
  {
    action: "read",
    patterns: [/\bbookshelf\b/, /\bbookcase\b/, /\bbook\b/, /\blibrary\b/, /\bmagazine\b/, /\breading nook\b/, /\bcouch\b/, /\bsofa\b/],
    weight: 1.2
  },
  {
    action: "write",
    patterns: [/\bdesk\b/, /\bcomputer\b/, /\blaptop\b/, /\btypewriter\b/, /\bnotebook\b/, /\bjournal\b/, /\bwriting\b/],
    weight: 1.2
  },
  {
    action: "chat_friend",
    patterns: [/\bcouch\b/, /\bsofa\b/, /\bloveseat\b/, /\btable\b/, /\bbench\b/, /\bpatio\b/, /\bporch\b/],
    weight: 1.1
  },
  {
    action: "date",
    patterns: [/\bcouch\b/, /\bsofa\b/, /\bloveseat\b/, /\bbed\b/, /\bbench\b/, /\bhot tub\b/, /\bpatio\b/],
    weight: 1.1
  },
  {
    action: "view_art",
    patterns: [/\bart\b/, /\bpainting\b/, /\bsculpture\b/, /\bmural\b/, /\btelevision\b/, /\btv\b/, /\bmovie\b/, /\bposter\b/, /\bplant\b/, /\bfireplace\b/],
    weight: 1
  },
  {
    action: "volunteer",
    patterns: [/\bgarden\b/, /\bworkbench\b/, /\bcommunity\b/, /\bdonation\b/, /\bpantry shelf\b/],
    weight: 1
  }
];

function pushAffordance(list: ItemAffordance[], affordance: ItemAffordance) {
  if (!list.find((entry) => entry.action === affordance.action)) {
    list.push(affordance);
  }
}

export function inferAffordancesFromText(name = "", description = ""): ItemAffordance[] {
  const haystack = `${name} ${description}`.toLowerCase();
  const affordances: ItemAffordance[] = [];

  for (const rule of AFFORDANCE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      pushAffordance(affordances, { action: rule.action, weight: rule.weight ?? 1 });
    }
  }

  return affordances;
}

export function resolveItemAffordances(item: ItemLike): ItemAffordance[] {
  if (item.affordances && item.affordances.length > 0) {
    return item.affordances;
  }

  const decoded = decodeAffordances(item);
  if (decoded.length > 0) {
    return decoded;
  }

  return inferAffordancesFromText(item.name, item.description);
}

export async function backfillMissingItemAffordances(): Promise<number> {
  const items = await q<ItemLike>(
    `
      MATCH (i:Item)
      RETURN i.id AS id,
             i.name AS name,
             i.description AS description,
             i.allowedActivities AS allowedActivities,
             i.satisfiesNeeds AS satisfiesNeeds
    `
  );

  let repairedCount = 0;

  for (const item of items) {
    const existingAffordances = decodeAffordances(item);
    if (existingAffordances.length > 0) {
      continue;
    }

    const inferredAffordances = inferAffordancesFromText(item.name, item.description);
    if (inferredAffordances.length === 0 || !item.id) {
      continue;
    }

    const encoded = encodeAffordances(inferredAffordances);
    await q(
      `
        MATCH (i:Item {id:$id})
        SET i.allowedActivities = $allowedActivities,
            i.satisfiesNeeds = $satisfiesNeeds
      `,
      {
        id: item.id,
        allowedActivities: encoded.allowedActivities,
        satisfiesNeeds: encoded.satisfiesNeeds
      }
    );

    repairedCount++;
  }

  return repairedCount;
}
