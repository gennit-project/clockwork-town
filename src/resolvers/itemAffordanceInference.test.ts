import { describe, expect, it } from "vitest";
import { inferAffordancesFromText, resolveItemAffordances } from "./itemAffordanceInference";

describe("item affordance inference", () => {
  it("infers core affordances from common household item names", () => {
    expect(inferAffordancesFromText("Couch", "Soft living room sofa").map((entry) => entry.action)).toEqual(
      expect.arrayContaining(["sleep", "read", "chat_friend", "date"])
    );

    expect(inferAffordancesFromText("Toilet", "Bathroom fixture").map((entry) => entry.action)).toContain("use_toilet");
    expect(inferAffordancesFromText("Shower Stall", "Modern bathroom shower").map((entry) => entry.action)).toContain("shower");
    expect(inferAffordancesFromText("Bookshelf", "Filled with novels").map((entry) => entry.action)).toContain("read");
  });

  it("prefers explicit affordances over inferred ones", () => {
    const affordances = resolveItemAffordances({
      name: "Couch",
      description: "Would normally infer several actions",
      affordances: [{ action: "view_art", weight: 2 }]
    });

    expect(affordances).toEqual([{ action: "view_art", weight: 2 }]);
  });

  it("falls back to stored legacy activity fields before inference", () => {
    const affordances = resolveItemAffordances({
      name: "Mystery Box",
      allowedActivities: ["eat"],
      satisfiesNeeds: []
    });

    expect(affordances).toEqual([{ action: "eat", weight: 1 }]);
  });
});
