# Parked / long-term / cut

**Read [README.md](README.md) first.** Items here are intentionally *not* on the active
roadmap (Epics 0–5). They're recorded so they aren't lost and aren't accidentally
rebuilt. Three buckets: **Cut** (won't do), **Parked** (maybe later, not now), and
**Separate track** (infra, not a feature).

## Cut — do not build

- **All image features.** The project is text-only for the foreseeable future. This
  cuts: item pictures, room pictures, character portraits/photos, and the tier-4
  "best friends photo shoot" relationship reward. Avatars remain emoji/text (as the UI
  already does, e.g. 🏠 🐾). If any old note says "add a picture of X," it's obsolete.

## Parked — revisit after Epics 0–5 prove out

- **Spatial map / build editor with roads.** The "plop a building, rotate it, draw a
  road to connect it" experience. This is the single most expensive feature and is
  explicitly decoupled from the tutorial, which uses the non-spatial build-and-staff
  flow (Epic 5.1) instead. Revisit only if the list-based world building proves
  insufficient.
- **Skill trees.** Large, tangential to the core life-sim loop:
  - *Nature/adventure:* T1 walk in the park, learn to swim, jog, gardening → T2 climb a
    mountain, boat ride, camping, kayaking, visit a national park → T3 two-week
    backpacking trip, mountain biking, snowboarding, white-water rafting, visit all
    national parks / wonders of the world.
  - *Family:* T1 have a baby, parenting class, holidays with family, teach a child a
    skill, read to a child, take a child to the park → T2 large family (4+ kids), kids
    do well in school, children graduate HS, 10 family dinners, family trip, party with
    10+ family → T3 50 family dinners, party with 50+ family, 50+ descendants, visit all
    national parks with family.
- **Supernatural traits.** "Can see dead people"; "immortal (if they drink from a spring
  in the forest)." Flavor, not core.
- **Fanciful locations.** Huge cave systems / long trails that require substantial camp
  supplies.
- **Split-household auto-proposal.** Listed in Epic 4.5 but flagged as the most optional
  item there; park it if Epic 4 runs heavy.

## Separate track — infrastructure, not a gameplay feature

- **Kùzu → FalkorDB migration experiment** (https://github.com/FalkorDB/Kuzu-to-FalkorDB).
  A possible DB swap, evaluated independently of the feature roadmap. Note the existing
  project memory on Kùzu 0.6 relationship-index quirks before touching the data layer.

## Notes for a future session

If you're considering building something that "feels obvious" but isn't in Epics 0–5,
check this file first — it may have been deliberately cut (images) or parked (map
editor, skill trees) for good reasons. If you and the user decide to promote a parked
item onto the roadmap, move its details into the relevant epic file and delete it here.
