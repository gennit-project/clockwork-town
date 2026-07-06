/**
 * Reproducible portfolio seed for Clockwork Town.
 *
 * Builds TWO isolated worlds so the app can demonstrate multiple towns and the
 * world switcher:
 *   1. "Desert Willow" — a full town: community lots (clinic, library, community
 *      center, campground, school) + residential houses, ~12 characters across 5
 *      households.
 *   2. "Pinehaven" — a smaller companion town: clinic, library, school + a couple
 *      of homes, ~5 characters across 2 households.
 *
 * Every working-age character gets a weekday work/school schedule that points at
 * a community lot plus a nightly sleep block at home, so once the frontend
 * simulation runs each town visibly commutes: dispersed by day, home at night.
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

async function makeLot(regionId: string, input: LotInput): Promise<{ id: string; name: string }> {
  const lot = await createLotWithSpacesAndItems(null, { regionId, input });
  if (!lot?.id) throw new Error(`Failed to create lot: ${input.lotName}`);
  console.log(`  · ${input.lotType.padEnd(11)} ${lot.name}`);
  return lot;
}

// An inline school (no on-disk template), parameterized by name/description.
// COMMUNITY lot with a couple of rooms so buildWorkIntent has a space to send
// students/staff to, plus a cafeteria (table → eat affordance) and a playground.
function makeSchool(lotName: string, lotDescription: string): LotInput {
  return {
    lotName,
    lotType: "COMMUNITY",
    lotDescription,
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
          { itemName: "Climbing Frame", itemDescription: "Metal bars worn smooth by a thousand hands." },
          { itemName: "Bench", itemDescription: "A shaded bench where the yard aide keeps watch." }
        ]
      }
    ]
  };
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

// --- World 1: Desert Willow (full town) -------------------------------------
async function seedDesertWillow() {
  const worldId = "world-desert-willow";
  const regionId = "region-desert-willow";
  console.log(`\nSeeding "Desert Willow"…\n`);
  await createWorld(null, { input: { id: worldId, name: "Desert Willow" } });
  await createRegion(null, { input: { id: regionId, worldId, name: "Desert Willow", kind: "town" } });
  const lot = (input: LotInput) => makeLot(regionId, input);

  console.log("Community lots:");
  const clinic = await lot(loadLotTemplate("clinic.json"));
  const library = await lot(loadLotTemplate("library.json"));
  const center = await lot(loadLotTemplate("community_center.json"));
  const campground = await lot(loadLotTemplate("campground.json"));
  const school = await lot(makeSchool(
    "Desert Willow School",
    "A low sandstone schoolhouse ringed by shade sails. Kids' art curls off the windows and a hand-painted mural of a roadrunner greets the front path."
  ));

  console.log("Residential lots:");
  // Two house layouts back five distinct homes (renamed per household).
  const linHouse = await lot(loadLotTemplate("doctors-house.json", { lotName: "The Lin House" }));
  const marshHouse = await lot(loadLotTemplate("teachers-house.json", { lotName: "The Marsh House" }));
  const okaforHouse = await lot(loadLotTemplate("doctors-house.json", { lotName: "The Okafor House" }));
  const reyesHouse = await lot(loadLotTemplate("teachers-house.json", { lotName: "The Reyes House" }));
  const nguyenHouse = await lot(loadLotTemplate("doctors-house.json", { lotName: "The Nguyen House" }));

  console.log("Households:");
  await createHousehold(null, {
    input: { id: "hh-lin", name: "The Lin Household", regionId, lotId: linHouse.id },
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

  await createHousehold(null, {
    input: { id: "hh-marsh", name: "The Marsh Household", regionId, lotId: marshHouse.id },
    characters: [
      { id: "char-tom-marsh", name: "Tom Marsh", age: 39, bio: "Teaches the mixed-age class; endlessly patient.", workSchedule: schedule(marshHouse.id, workDay(school.id)) },
      { id: "char-sara-marsh", name: "Sara Marsh", age: 37, bio: "Coordinates volunteers at the community center.", workSchedule: schedule(marshHouse.id, workDay(center.id)) },
      { id: "char-leo-marsh", name: "Leo Marsh", age: 8, bio: "Eight, and a devoted collector of interesting rocks.", workSchedule: schedule(marshHouse.id, schoolDay(school.id)) }
    ]
  });
  console.log("  · The Marsh Household (3)");

  await createHousehold(null, {
    input: { id: "hh-okafor", name: "The Okafor Household", regionId, lotId: okaforHouse.id },
    characters: [
      { id: "char-grace-okafor", name: "Grace Okafor", age: 31, bio: "Nurse at the clinic; runs the town's first-aid classes.", workSchedule: schedule(okaforHouse.id, workDay(clinic.id)) },
      { id: "char-daniel-okafor", name: "Daniel Okafor", age: 33, bio: "Archivist at the library, guardian of the microfilm.", workSchedule: schedule(okaforHouse.id, workDay(library.id)) }
    ]
  });
  console.log("  · The Okafor Household (2)");

  // Retired (home during the day for variety) — Manny and his cat, the original
  // test pair, live here.
  await createHousehold(null, {
    input: { id: "hh-reyes", name: "The Reyes Household", regionId, lotId: reyesHouse.id },
    characters: [
      { id: "char-manny-reyes", name: "Manny Reyes", age: 70, bio: "Retired mechanic; still fixes half the town's fences.", workSchedule: schedule(reyesHouse.id) },
      { id: "char-elena-reyes", name: "Elena Reyes", age: 68, bio: "Retired schoolteacher; tends the desert garden out back.", workSchedule: schedule(reyesHouse.id) }
    ],
    animals: [
      { id: "animal-diego", name: "Diego", age: 9, traits: ["lazy", "affectionate"], ownerId: "char-manny-reyes", bio: "Manny's old tabby, an expert sunbather." }
    ]
  });
  console.log("  · The Reyes Household (2)");

  await createHousehold(null, {
    input: { id: "hh-nguyen", name: "The Nguyen Household", regionId, lotId: nguyenHouse.id },
    characters: [
      { id: "char-kim-nguyen", name: "Kim Nguyen", age: 28, bio: "Teaches pottery and hosts game nights at the community center.", workSchedule: schedule(nguyenHouse.id, workDay(center.id)) },
      { id: "char-anh-nguyen", name: "Anh Nguyen", age: 16, bio: "Sixteen; sketches the campground trails on weekends.", workSchedule: schedule(nguyenHouse.id, schoolDay(school.id)) }
    ]
  });
  console.log("  · The Nguyen Household (2)");

  // The campground is a deliberate empty community lot (nice backdrop).
  void campground;
}

// --- World 2: Pinehaven (small companion town) ------------------------------
async function seedPinehaven() {
  const worldId = "world-pinehaven";
  const regionId = "region-pinehaven";
  console.log(`\nSeeding "Pinehaven"…\n`);
  await createWorld(null, { input: { id: worldId, name: "Pinehaven" } });
  await createRegion(null, { input: { id: regionId, worldId, name: "Pinehaven", kind: "town" } });
  const lot = (input: LotInput) => makeLot(regionId, input);

  console.log("Community lots:");
  const clinic = await lot(loadLotTemplate("clinic.json", { lotName: "Pinehaven Clinic" }));
  const library = await lot(loadLotTemplate("library.json", { lotName: "Pinehaven Library" }));
  const school = await lot(makeSchool(
    "Pinehaven School",
    "A timber schoolhouse under tall pines, woodsmoke and chalk dust in the air, a snowshoe rack by the door."
  ));

  console.log("Residential lots:");
  const frostHouse = await lot(loadLotTemplate("doctors-house.json", { lotName: "The Frost House" }));
  const haleHouse = await lot(loadLotTemplate("teachers-house.json", { lotName: "The Hale House" }));

  console.log("Households:");
  await createHousehold(null, {
    input: { id: "hh-frost", name: "The Frost Household", regionId, lotId: frostHouse.id },
    characters: [
      { id: "char-owen-frost", name: "Dr. Owen Frost", age: 45, bio: "Runs the mountain clinic; skis to house calls in winter.", workSchedule: schedule(frostHouse.id, workDay(clinic.id)) },
      { id: "char-nadia-frost", name: "Nadia Frost", age: 43, bio: "Head librarian; knows where every book actually is.", workSchedule: schedule(frostHouse.id, workDay(library.id)) },
      { id: "char-sam-frost", name: "Sam Frost", age: 10, bio: "Ten; can name every pine on the ridge trail.", workSchedule: schedule(frostHouse.id, schoolDay(school.id)) }
    ]
  });
  console.log("  · The Frost Household (3)");

  await createHousehold(null, {
    input: { id: "hh-hale", name: "The Hale Household", regionId, lotId: haleHouse.id },
    characters: [
      { id: "char-june-hale", name: "June Hale", age: 34, bio: "Assistant librarian and weekend trail volunteer.", workSchedule: schedule(haleHouse.id, workDay(library.id)) },
      { id: "char-riley-hale", name: "Riley Hale", age: 15, bio: "Fifteen; building a weather station on the back porch.", workSchedule: schedule(haleHouse.id, schoolDay(school.id)) }
    ],
    animals: [
      { id: "animal-biscuit", name: "Biscuit", age: 3, traits: ["loyal", "energetic"], ownerId: "char-june-hale", bio: "A muddy-pawed collie mix who supervises every hike." }
    ]
  });
  console.log("  · The Hale Household (2)");
}

async function seed() {
  await applyDDL();

  await seedDesertWillow();
  await seedPinehaven();

  // Flush to disk. Short-lived scripts need an explicit checkpoint + close.
  try {
    await conn.query("CHECKPOINT");
  } catch {
    // CHECKPOINT can be a no-op depending on WAL state; safe to ignore.
  }
  await db.close();

  console.log(`\n✅ Seeded 2 worlds:`);
  console.log(`   Desert Willow — 12 residents, 2 cats, 5 households, 10 lots.`);
  console.log(`   Pinehaven     — 5 residents, 1 dog, 2 households, 5 lots.`);
  console.log(`   Start the app; the default world opens on load. Switch worlds from the top nav.\n`);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
