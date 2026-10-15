/**
 * Backup round-trip check: exports a world, imports it as a new world, and compares the
 * residents (traits, ranked values, schedules, location), animals (owner, traits) and
 * households of the original and the restored copy. Exits non-zero on any difference.
 *
 * The backend has no test suite, and the export once silently returned no households,
 * characters or animals, so this guards that path.
 *
 * Usage (backend running; defaults to the seeded Desert Willow world):
 *   BACKEND_URL=http://localhost:4001/graphql WORLD_ID=world-desert-willow \
 *     node scripts/check-backup-roundtrip.mjs
 *
 * Run it against a freshly seeded database: stale duplicate AT edges from long sim runs make
 * a character's "original" location ambiguous (the export deliberately keeps the newest).
 * Note it leaves a "(Restored)" copy of the world in the database.
 */
const url = process.env.BACKEND_URL ?? 'http://localhost:4001/graphql'
const worldId = process.env.WORLD_ID ?? 'world-desert-willow'
const regionId = process.env.REGION_ID ?? 'region-desert-willow'

async function gql(query, variables = {}) {
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables })
    })
  } catch (error) {
    console.error(`Could not reach the backend at ${url} (${error.cause?.code ?? error.message}). Is it running?`)
    process.exit(2)
  }
  const body = await res.json()
  if (body.errors) throw new Error(JSON.stringify(body.errors).slice(0, 500))
  return body.data
}

const REGION = `query($r:ID!){
  region(id:$r){
    characters{ id name traits{id} values{id} stances{ topicId stance } location{ name } workSchedule{ day start end activity location{ name } } }
    animals{ id name ownerId traits }
  }
  households(regionId:$r){ id name lotName }
}`

async function snapshot(region) {
  const data = await gql(REGION, { r: region })
  const names = Object.fromEntries(data.region.characters.map((c) => [c.id, c.name]))
  // Sorted by name: the two worlds list residents in a different order.
  const people = Object.fromEntries(
    [...data.region.characters].sort((a, b) => a.name.localeCompare(b.name)).map((c) => [c.name, {
      traits: c.traits.map((t) => t.id).sort(),
      values: c.values.map((v) => v.id), // rank order matters
      stances: c.stances.map((s) => `${s.topicId}=${s.stance}`).sort(),
      at: c.location?.name ?? null,
      schedule: c.workSchedule
        .map((s) => [s.day, s.start, s.end, s.activity, s.location.name].join('|'))
        .sort()
    }])
  )
  const animals = data.region.animals
    .map((a) => [a.name, names[a.ownerId] ?? null, [...a.traits].sort().join(',')].join('|'))
    .sort()
  const households = []
  for (const h of data.households) {
    const full = (await gql('query($i:ID!){ household(id:$i){ characters{id} animals{ name ownerId } } }', { i: h.id })).household
    households.push([
      h.name,
      h.lotName,
      full.characters.length,
      full.animals.map((a) => `${a.name}:${names[a.ownerId] ?? ''}`).sort().join(',')
    ].join('|'))
  }
  return { people, animals, households: households.sort() }
}

const exported = (await gql('mutation($w:ID!){ exportWorld(worldId:$w) }', { w: worldId })).exportWorld
const counts = Object.fromEntries(Object.entries(exported).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]))
console.log('export counts:', counts)

const failures = []
for (const section of ['households', 'characters', 'animals']) {
  if (counts[section] === 0) failures.push(`export contains no ${section}`)
}

const restored = (await gql('mutation($d: JSON!){ importWorld(data:$d){ worldId success } }', { d: exported })).importWorld
const restoredRegion = (await gql('query($w:ID!){ regions(worldId:$w){ id } }', { w: restored.worldId })).regions[0].id

const original = await snapshot(regionId)
const copy = await snapshot(restoredRegion)
for (const section of ['people', 'animals', 'households']) {
  const same = JSON.stringify(original[section]) === JSON.stringify(copy[section])
  console.log(`${section}: original=${Object.keys(original[section]).length} restored=${Object.keys(copy[section]).length} identical=${same}`)
  if (!same) {
    failures.push(`${section} differ between the original and the restored world`)
    if (section === 'people') {
      const key = Object.keys(original.people).find(
        (k) => JSON.stringify(original.people[k]) !== JSON.stringify(copy.people[k])
      )
      if (key) {
        console.log(`  first difference, ${key}:`)
        console.log('   original:', JSON.stringify(original.people[key]))
        console.log('   restored:', JSON.stringify(copy.people[key]))
      }
    }
  }
}

if (failures.length > 0) {
  console.error('FAILED:\n - ' + failures.join('\n - '))
  process.exit(1)
}
console.log('OK: the restored world matches the original.')
