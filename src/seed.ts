/**
 * Reproducible portfolio seed for Clockwork Town.
 *
 * Builds one "Desert Willow" region containing both community lots
 * (clinic, library, community center, campground, school) and residential
 * houses, populated with ~12 characters across 5 households. Each working-age
 * character gets a weekday work/school schedule that points at a community lot,
 * so once the frontend simulation is running the town visibly commutes:
 * dispersed to work/school during the day, back home at night.
 *
 * IMPORTANT: this RESETS the local database at data/clockwork-town.kuzu.
 * Run it with the backend stopped:
 *
 *   npm run seed
 *
 * We wipe and recreate the database file rather than deleting rows in place —
 * Kùzu 0.6's per-edge DELETE is unreliable on relationship tables, so a fresh
 * file is the only fully deterministic reset.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(REPO_ROOT, "data", "clockwork-town.kuzu");
const SEED_DIR = path.join(REPO_ROOT, "seedData");

// --- 1. Reset the database (a fresh file sidesteps Kùzu rel-delete issues) ---
for (const p of [DB_PATH, `${DB_PATH}.wal`, `${DB_PATH}.tmp`, `${DB_PATH}.lock`]) {
  fs.rmSync(p, { recursive: true, force: true });
}

// Import db/resolvers AFTER wiping so kuzu.Database opens the fresh file.
const { applyDDL, db, conn } = await import("./db");
const { WorldResolvers } = await import("./resolvers/world");
const { HouseholdResolvers } = await import("./resolvers/household");

const createWorld = WorldResolvers.Mutation.createWorld;
const createRegion = WorldResolvers.Mutation.createRegion;
const createLotWithSpacesAndItems = WorldResolvers.Mutation.createLotWithSpacesAndItems;
const createHousehold = HouseholdResolvers.Mutation.createHousehold;

// --- Types mirroring the createLotWithSpacesAndItems input ------------------
interface LotItem { itemName: string; itemDescription: string }
interface LotSpace { spaceName: string; spaceDescription: string; items?: LotItem[] }
interface LotInput {
  lotName: string;
  lotType: string;
  lotDescription?: string;
  indoorRooms?: LotSpace[];
  outdoorSpaces?: LotSpace[];
}
interface WorkShift { day: string; start: string; end: string; activity?: string; locationLotId: string }

// --- Template loading -------------------------------------------------------
// Two on-disk shapes exist: flat ({lotName, indoorRooms, ...}) and wrapped
// ({tags, input:{...}}). Normalize both, and let callers override e.g. lotName
// so a single house layout can back several distinct households.
function loadLotTemplate(file: string, overrides: Partial<LotInput> = {}): LotInput {
  const raw = JSON.parse(fs.readFileSync(path.join(SEED_DIR, file), "utf8"));
  const base = raw.input ?? raw;
  return {
    lotName: base.lotName,
    lotType: base.lotType ?? "RESIDENTIAL",
    lotDescription: base.lotDescription,
    indoorRooms: base.indoorRooms ?? [],
    outdoorSpaces: base.outdoorSpaces ?? [],
    ...overrides
  };
}

async function makeLot(input: LotInput): Promise<{ id: string; name: string }> {
  const lot = await createLotWithSpacesAndItems(null, { regionId: REGION_ID, input });
  if (!lot?.id) throw new Error(`Failed to create lot: ${input.lotName}`);
  console.log(`  · ${input.lotType.padEnd(11)} ${lot.name}`);
  return lot;
}

// --- Schedule helpers -------------------------------------------------------
// simulationCalendar formats weekdays with { weekday: 'long' }, so shifts must
// use full weekday names to match getActiveWorkShift's comparison.
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const ALL_DAYS = [...WEEKDAYS, "Saturday", "Sunday"];

function week(locationLotId: string, start: string, end: string): WorkShift[] {
  return WEEKDAYS.map((day) => ({ day, start, end, activity: "work", locationLotId }));
}
const workDay = (lotId: string) => week(lotId, "09:00", "17:00");
const schoolDay = (lotId: string) => week(lotId, "08:00", "15:00");

// A nightly sleep block at home, every day of the week. Sleep is a scheduled
// activity per character (not a global rule), so a future night-shift resident
// can simply carry a daytime sleep block plus night work shifts instead.
function sleepAtHome(homeLotId: string): WorkShift[] {
  return ALL_DAYS.map((day) => ({ day, start: "22:00", end: "06:00", activity: "sleep", locationLotId: homeLotId }));
}

// Compose a character's away-schedule (work/school, may be empty) with their
// nightly sleep-at-home block.
function schedule(homeLotId: string, ...away: WorkShift[][]): WorkShift[] {
  return [...away.flat(), ...sleepAtHome(homeLotId)];
}

// An inline school (no on-disk template). COMMUNITY lot with a couple of rooms
// so buildWorkIntent has a space to send students/staff to, plus a cafeteria
// (table → eat affordance) and a playground.
const SCHOOL_TEMPLATE: LotInput = {
  lotName: "Desert Willow School",
  lotType: "COMMUNITY",
  lotDescription:
    "A low sandstone schoolhouse ringed by shade sails. Kids' art curls off the windows and a hand-painted mural of a roadrunner greets the front path.",
  indoorRooms: [
    {
      spaceName: "Classroom",
      spaceDescription: "Rows of small desks face a chalkboard still ghosted with yesterday's spelling words.",
      items: [
        { itemName: "Student Desks", itemDescription: "A dozen scuffed wooden desks, lids carved with initials." },
        { itemName: "Chalkboard", itemDescription: "Green slate, dusted pale at the edges." },
        { itemName: "Bookshelf", itemDescription: "Picture books, atlases, and a battered set of encyclopedias." }
      ]
    },
    {
      spaceName: "Cafeteria",
      spaceDescription: "Long folding tables and the faint permanent smell of tomato soup.",
      items: [
        { itemName: "Lunch Table", itemDescription: "Fold-out bench seating, sticky in the usual spots." },
        { itemName: "Serving Counter", itemDescription: "Steam trays and a stack of plastic trays." }
      ]
    }
  ],
  outdoorSpaces: [
    {
      spaceName: "Playground",
      spaceDescription: "A gravel yard with a climbing frame, a tetherball pole, and a chalk hopscotch grid.",
      items: [
        { itemName: "Climbing Frame", itemDescription: "Sun-hot metal bars bleached by the desert light." },
        { itemName: "Bench", itemDescription: "A shaded bench where the yard aide keeps watch." }
      ]
    }
  ]
};

// ---------------------------------------------------------------------------
const WORLD_ID = "world-desert-willow";
const REGION_ID = "region-desert-willow";

async function seed() {
  await applyDDL();

  console.log(`\nSeeding "Desert Willow"…\n`);
  await createWorld(null, { input: { id: WORLD_ID, name: "Desert Willow" } });
  await createRegion(null, {
    input: { id: REGION_ID, worldId: WORLD_ID, name: "Desert Willow", kind: "town" }
  });

  console.log("Community lots:");
  const clinic = await makeLot(loadLotTemplate("clinic.json"));
  const library = await makeLot(loadLotTemplate("library.json"));
  const center = await makeLot(loadLotTemplate("community_center.json"));
  const campground = await makeLot(loadLotTemplate("campground.json"));
  const school = await makeLot(SCHOOL_TEMPLATE);

  console.log("Residential lots:");
  // Two house layouts back five distinct homes (renamed per household).
  const linHouse = await makeLot(loadLotTemplate("doctors-house.json", { lotName: "The Lin House" }));
  const marshHouse = await makeLot(loadLotTemplate("teachers-house.json", { lotName: "The Marsh House" }));
  const okaforHouse = await makeLot(loadLotTemplate("doctors-house.json", { lotName: "The Okafor House" }));
  const reyesHouse = await makeLot(loadLotTemplate("teachers-house.json", { lotName: "The Reyes House" }));
  const nguyenHouse = await makeLot(loadLotTemplate("doctors-house.json", { lotName: "The Nguyen House" }));

  console.log("Households:");
  // Household 1 — the Lins (clinic + library + school), keepers of a cat.
  await createHousehold(null, {
    input: { id: "hh-lin", name: "The Lin Household", regionId: REGION_ID, lotId: linHouse.id },
    characters: [
      { id: "char-amina-lin", name: "Dr. Amina Lin", age: 42, bio: "The town's only doctor; keeps mint tea on every windowsill.", workSchedule: schedule(linHouse.id, workDay(clinic.id)) },
      { id: "char-ravi-lin", name: "Ravi Lin", age: 44, bio: "Runs the reading programs at the public library.", workSchedule: schedule(linHouse.id, workDay(library.id)) },
      { id: "char-priya-lin", name: "Priya Lin", age: 12, bio: "Twelve, and quietly the best speller in her class.", workSchedule: schedule(linHouse.id, schoolDay(school.id)) }
    ],
    animals: [
      { id: "animal-marmalade", name: "Marmalade", age: 4, traits: ["aloof", "curious"], ownerId: "char-amina-lin", bio: "A ginger cat who owns the couch." }
    ]
  });
  console.log("  · The Lin Household (3)");

  // Household 2 — the Marshes (school teacher + community center + school kid).
  await createHousehold(null, {
    input: { id: "hh-marsh", name: "The Marsh Household", regionId: REGION_ID, lotId: marshHouse.id },
    characters: [
      { id: "char-tom-marsh", name: "Tom Marsh", age: 39, bio: "Teaches the mixed-age class; endlessly patient.", workSchedule: schedule(marshHouse.id, workDay(school.id)) },
      { id: "char-sara-marsh", name: "Sara Marsh", age: 37, bio: "Coordinates volunteers at the community center.", workSchedule: schedule(marshHouse.id, workDay(center.id)) },
      { id: "char-leo-marsh", name: "Leo Marsh", age: 8, bio: "Eight, and a devoted collector of interesting rocks.", workSchedule: schedule(marshHouse.id, schoolDay(school.id)) }
    ]
  });
  console.log("  · The Marsh Household (3)");

  // Household 3 — the Okafors (clinic nurse + librarian).
  await createHousehold(null, {
    input: { id: "hh-okafor", name: "The Okafor Household", regionId: REGION_ID, lotId: okaforHouse.id },
    characters: [
      { id: "char-grace-okafor", name: "Grace Okafor", age: 31, bio: "Nurse at the clinic; runs the town's first-aid classes.", workSchedule: schedule(okaforHouse.id, workDay(clinic.id)) },
      { id: "char-daniel-okafor", name: "Daniel Okafor", age: 33, bio: "Archivist at the library, guardian of the microfilm.", workSchedule: schedule(okaforHouse.id, workDay(library.id)) }
    ]
  });
  console.log("  · The Okafor Household (2)");

  // Household 4 — the Reyes, retired (home during the day for variety) — this
  // is where Manny and his cat, the original test pair, now live.
  await createHousehold(null, {
    input: { id: "hh-reyes", name: "The Reyes Household", regionId: REGION_ID, lotId: reyesHouse.id },
    characters: [
      { id: "char-manny-reyes", name: "Manny Reyes", age: 70, bio: "Retired mechanic; still fixes half the town's fences.", workSchedule: schedule(reyesHouse.id) },
      { id: "char-elena-reyes", name: "Elena Reyes", age: 68, bio: "Retired schoolteacher; tends the desert garden out back.", workSchedule: schedule(reyesHouse.id) }
    ],
    animals: [
      { id: "animal-diego", name: "Diego", age: 9, traits: ["lazy", "affectionate"], ownerId: "char-manny-reyes", bio: "Manny's old tabby, an expert sunbather." }
    ]
  });
  console.log("  · The Reyes Household (2)");

  // Household 5 — the Nguyens (community center + a teenager at school).
  await createHousehold(null, {
    input: { id: "hh-nguyen", name: "The Nguyen Household", regionId: REGION_ID, lotId: nguyenHouse.id },
    characters: [
      { id: "char-kim-nguyen", name: "Kim Nguyen", age: 28, bio: "Teaches pottery and hosts game nights at the community center.", workSchedule: schedule(nguyenHouse.id, workDay(center.id)) },
      { id: "char-anh-nguyen", name: "Anh Nguyen", age: 16, bio: "Sixteen; sketches the campground trails on weekends.", workSchedule: schedule(nguyenHouse.id, schoolDay(school.id)) }
    ]
  });
  console.log("  · The Nguyen Household (2)");

  // Keep a reference alive so the campground lot isn't flagged unused; it is a
  // deliberate empty community lot (nice backdrop, no assigned workers).
  void campground;

  // Flush to disk. Short-lived scripts need an explicit checkpoint + close.
  try {
    await conn.query("CHECKPOINT");
  } catch {
    // CHECKPOINT can be a no-op depending on WAL state; safe to ignore.
  }
  await db.close();

  console.log(`\n✅ Seeded 12 characters, 2 cats, 5 households, 10 lots.`);
  console.log(`   Start the app (backend + frontend), open the Desert Willow region,`);
  console.log(`   press play, and use the time-jump buttons to pose day/night shots.\n`);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
