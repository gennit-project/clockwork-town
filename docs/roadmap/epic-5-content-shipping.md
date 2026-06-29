# Epic 5 — Content & shipping

**Read [README.md](README.md) first.** This is the capstone epic: the non-spatial
build-and-staff flow, the default town content, the template library content, the
Manny's World tutorial, and difficulty levels. It also serves as the **content bible**
— the canonical lists (traits, values, locations, milestones, cast) live here so they
survive context loss. Build the systems in Epics 0–4 first; this epic assembles them
into shippable experiences.

## Prerequisites

Essentially all of Epics 0–4. Specifically: traits/values (0), relationships/memories/
milestones (1), authoring incl. item catalog & character family/relationship/memory
editing (2), finances & cook rota (3), job slots/NPCs/illness/death/grief/childcare (4).

---

## 5.1 — Build-and-staff flow (non-spatial) `[L]`

The tutorial's centerpiece without a map editor. Flow: **add a building → place it via
the existing list-based lot creation → staff its job slots** (Epic 4.1) with playable
characters or NPCs → house any new staff (list-based lot creation) → done. This
delivers the tutorial's substance (build a clinic, staff it, house the staff, add a
school) using `LotsAndHouseholds.vue` / `LotTemplateEdit.vue` + the job-slot system.
The **spatial map editor with placement/rotation/roads is parked** (see
[parked-long-term.md](parked-long-term.md)).

---

## 5.2 — Default town content `[L, content]`

The full multi-household "sandbox" town that ships with the game. Build it only once
the systems each story exercises exist; ship a **minimal seed town** earlier for
testing. Note: **Manny exists in two separate copies** — one in the tutorial world,
one in this full world.

### Households (with the stories they exercise)

- **Wayside** — Manny, a gas-station owner, happiest/most fulfilled person in town
  because his primary value is making his cat Isabella happy, which he does daily
  (forehead-to-forehead nuzzles recorded in memory; brings cat to work in a carrier;
  loses value points if a cat kills a bird). Manny has arthritis (managed by
  prescription); the cat needs eyedrops. *(Exercises: values, pet interactions,
  illness/medication.)*
- **Fractal** — husband and wife; strain because the husband's recently-divorced
  friend lives with them and the wife disapproves of his **haze** use. *(Exercises:
  approval/disapproval, roommates.)* (**haze** = a fictional, mildly-taboo recreational
  herb used throughout as a bonding/disapproval hook instead of real drugs — rename freely.)
- **Whiterose** — married couple, three young children. On day one the husband is
  dying and cannot be saved; after the funeral the wife grieves and won't get out of
  bed, forcing the player to bring in an extended-family member (grandmother or uncle)
  to help with the kids. *(Exercises: death warnings, grief, childcare.)*
- **Survivor** — Edgar lives in a tent after his house burned down (memory: lost wife,
  three kids, and a dog in a fire). Drinks by the campfire; can never be emotionally
  fulfilled because everyone he loved is dead; trait "hates holidays." His need chart
  shows basic needs can be full but mood can never max because higher needs can't be
  fulfilled. *(Exercises: values/higher-need ceiling, grief, camping lot.)*
- **Oaktree** — the doctor's house; wife and husband both doctors. Marital issue: the
  husband's primary value is "make mom happy," secondary "make wife happy"; his mom
  lives with them and he always takes her side. Two kids in school. *(Exercises:
  ranked values & conflict.)*
- **Newton** — divorced single mother, high-school teacher, wants new friends (memory:
  after divorce she re-ranked values to prize friendship over love); wants to befriend
  a teacher colleague; her son also wants friends. *(Exercises: value re-ranking,
  friendship milestones.)*
- **Earnest** — married couple, four children; mom is a high-school teacher, dad owns a
  grocery store; mom wants to befriend the Newton mother. *(Exercises: friendship,
  business ownership.)*
- **Little** — construction worker + hair stylist, three little kids (child, toddler,
  baby); mom's sister helps watch them. *(Exercises: childcare support.)*
- **Bookish** — older married lesbian couple; one a librarian, one a novelist; a teen
  child and an adult child. *(Exercises: creative values, multi-generation.)*
- **Cook** — three generations running a family restaurant: grandpa & grandma chefs,
  mom sous-chef, dad waiter, son waiter, daughter hostess. *(Exercises: multi-tenant
  workplace, family business.)*

### Cast counts (for population/NPC planning)

- **Elders:** Manny Wayside (65, gas station); Survivor/Edgar (70, unemployed);
  Grandmother Whiterose (retired teacher); Grandmother Oaktree (retired nurse); mom
  Bookish (librarian); grandma & grandpa Cook (chefs); grandma & grandpa "Fork".
- **Adults:** Mom Whiterose (homemaker); uncle Whiterose (clothing store); wife Fractal
  (home-goods store); husband Fractal (pharmacy); husband's friend Fractal (pet store);
  wife & husband Oaktree (doctors); mom Newton (HS teacher); mom Earnest (HS teacher);
  mom/aunt/dad Little; mom Bookish (novelist); adult child Bookish (grocery store); mom
  Cook (sous chef); dad Cook (waiter); mom & dad Foster.
- **Teens:** teen Whiterose; teen Oaktree; son Newton; two teen Earnest; teen Bookish
  (home-goods store); son Cook (waiter); daughter Cook (hostess).
- **Children:** child Whiterose 1; child Oaktree; two child Earnest; child Little; foster
  children 1 (biological), 2 (adopted), 3 (foster).
- **Toddlers/babies:** child Whiterose 2; child Little 2; child Little 3 (foster).

*(Names like "Fork"/"Foster" appear in the source notes as placeholders; reconcile when
authoring.)*

---

## 5.3 — Template library content `[L, content]`

The location library (a subset ships in default towns). All text-only.

**Community / third places:** cafes, bars, libraries, restaurants, community center,
parks, gyms, churches, arcade, shopping center/mall, ice cream shops, hiking trails.

**Residential:** apartment, house, townhouse, trailer, mansion, cabin in the woods,
campground.

**Workplaces/jobs** (commercial spaces may have multiple tenants): hospital, preschool,
elementary/high school, university (student/teacher/admin/scientist), Mexican/Italian/
Indian restaurants, cafes, bagel shop, barber/hair salon, nice hotel, cheap motel, ice
cream shop, golf course, rec center w/ pool, insurance company, courthouse, jail, fire
department, police station, newspaper, local news broadcasting, post office, large tech
companies, small startups, video-game company, solar-panel company, nuclear power
plant, park-ranger center, construction site, babysitting, retail (bike shop, grocery,
pharmacy, clothing, home goods, antique), auto mechanic.

**Natural places:** mountains (hiking), lake (picnic/swim), forest (walks).

**Manny's house interactive items (text):** cat tree, cat toys, cat food bowl, litter
box, bean bags (cat can sit), couch/chairs/bed (cat can sit), cabinets, trash can, TV,
radio/speaker, patio furniture. **Gas station:** buy coffee/milk/soda/chips/candy/
cookies, buy gas, charge vehicle, buy ice. **Campground lot:** sleep in a tent, eat
from the grill. **Human↔cat interactions:** face-to-face, pet, groom; **cat↔human:**
sit on lap, brush past legs, face-to-leg.

---

## 5.4 — Tutorial: Manny's World `[L, integration capstone]`

A scripted onboarding that is, in effect, an integration test of Epics 0–4. The
"click a low need → options modal" interaction partly exists today via manual intents.

**Script.**
1. Start in a small tutorial world, "Manny's World": Manny (57, gas-station owner) and
   his cat. Introduce the calendar and time controls. He has a truck and can buy food
   at the gas station.
2. Day one: Manny works at the gas station and comes home to the cat; occasional
   customers; he's lonely. He fills his social meter by playing with the cat — the
   player is told to make Manny nuzzle the cat. Clicking the decaying social meter
   opens a modal of options; "call a friend" is disabled (no friends), but cat options
   are available. Interacting with the cat creates autobiographical memories in both
   Manny and the cat.
3. Manny is fulfilled until he catches a cartoony fictional disease. A popup: "Manny is
   sick but the town has no doctor." Choices: "Let him suffer" (he dies quickly; you
   can reload the last save) or "Build a clinic."
4. "Build a clinic" → the build UI (non-spatial, Epic 5.1). Multiple clinic options
   exist but most are disabled (require more residents first). Choose one and place it.
5. Staff it: the clinic adds jobs (doctor, nurse, admin assistant). Manny isn't
   qualified for doctor/nurse but qualifies as admin assistant (customer-service
   experience) — though staffing him there would leave the gas station unstaffed
   (nobody could use it). Fill all three roles with NPCs from the family bin (sortable
   by credentials); all chosen options have at least one child (needed for the next
   step).
6. The new employees need homes: prompt the player to place the receptionist's house
   (small budget), then the nurse's, then the doctor's.
7. The children need a school: prompt to build a tiny one-teacher elementary school
   (larger schools are disabled — not enough children). Then place housing for the
   teacher.
8. When Manny next works, town residents show up and he meets new people.
9. To get to know them, go to the campgrounds and fish.
10. Finally, at Manny's house, fish and give the cat fish. Tutorial complete.
- Throughout: show people moving between residential and community lots while statuses
  update on the community roster sidebar. Demonstrate that removing a value/higher need
  moves it into "past values."

**End state of the tutorial:** the town has a clinic staffed by a doctor, nurse, and
admin assistant; the three staff families (each with children) are housed; a one-room
school with a teacher exists; the town has a third place and a place to hike/camp;
Manny has made a new friend and they go camping together (Manny now fulfilled); the
town gets a new name.

- **Residential lots:** Manny's house; houses of the doctor, nurse, assistant, teacher.
- **Community lots:** the gas station, campgrounds, tiny clinic, one-room schoolhouse.

---

## 5.5 — Difficulty levels / starter worlds `[M]`

Starter worlds of easy/medium/hard difficulty, increasingly complex and harder to get
everyone to max happiness/fulfillment — on the hardest level everyone is a bad person
and drama happens constantly. Difficulty is configurable. A toggle controls whether
dark/adult-themed events ever happen.

---

## Reference catalogs (content bible)

These canonical lists are referenced by earlier epics (esp. Epic 0 traits/values and
Epic 1 milestones). Kept here so they live in one place.

### Traits

**Interpersonal:** social, extroverted, unfriendly, loves/hates birthdays, loves/hates
holidays, storyteller, loves movies/music/books, likes cooking/gardening, can swim,
speaks sign language, likes/hates exercise, likes/hates cooking, very hungry / not very
hungry, needs a lot of / doesn't need much sleep, won't/will have sex with strangers,
won't have sex before marriage, vegan, vegetarian, will eat anything.

**Physical:** uses wheelchair / power chair / cane, blind, deaf, very hungry / low
appetite, needs a lot of / doesn't need much sleep.

**Transportation (usual mode):** car, taxi, bus, subway, bicycle, motorcycle,
rollerblades, skateboard, runs, walks.

**Mental:** anxious, depressed, grieving, stressed.

**Supernatural** (parked / long-term): can see dead people; immortal (if they drink
from a spring in the forest).

*Behavioral subset to implement first (Epic 0.2):* needs-little/lots-of-sleep,
big/small appetite, asexual (disables romance), aromantic, vegan/vegetarian (diet),
hates holidays. The rest can start as display-only.

### Values

**Children's values:** play games, play pretend, play with toys, collect things, draw,
explore, read.

**Values:** make [specific person] happy; have a happy family; have a good marriage;
have a good romantic relationship; have sex; be a good friend; feel important at work;
be a good parent; be a good leader; take care of animals; create art; write books; read
books; play games; work with your hands; sewing; write blogs (saved); learn about
science / languages / history; spend time with friends; do a good job at work; spend
time in the forest / at the beach / in the mountains; practice a religion (Christianity,
Judaism, Islam, … list + "other").

### Relationship milestone catalog (for Epic 1.5)

Progression requires a *mix* of activities from a tier before the next unlocks (avoids
repetitive grinding). Each achieved milestone is recorded in both characters' memories.

- **Tier 1:** share a meal; have drinks; play cards/board game; dance; watch TV
  together; pet their dog; approve of the same thing happening at the same time; have
  coffee; play frisbee/soccer/tetherball; go to the gym together; like the same song;
  swim/jog/movies/ice cream together; go to a party and leave together; go shopping;
  play a sport; rock-paper-scissors; jump rope; video games; ride bikes together.
- **Tier 2:** stay up past midnight together; road trip; hike together; get lost and
  come home after dark; witness something supernatural together; fight a fire together;
  attend each other's birthdays; take an art/cooking class together; go camping; roast
  marshmallows; same book club; help break a bad habit; defuse a fight; help during
  illness/grief; hold a vigil; exchange friendship bracelets; celebrate a major holiday;
  share haze together (the fictional recreational herb); give feedback on the other's novel/song/art/screenplay;
  both reach level-5 of the same hobby while leveling together; have a fight and make
  up; volunteer together.
- **Tier 3:** become godparent of their child (or vice versa); become roommates; start
  a business together; adopt a cat/dog together; get a key to their house (can enter
  without notice).
- **Tier 4:** ~~"best friends photo shoot" reward~~ **CUT (image-based).** Replace with
  a text capstone milestone if a tier-4 reward is desired.

---

## Out of scope

- Images (the photoshoot reward and all pictures are cut).
- Spatial map editor & roads (parked).
- Skill trees (nature/adventure, family) — parked; see [parked-long-term.md](parked-long-term.md).
