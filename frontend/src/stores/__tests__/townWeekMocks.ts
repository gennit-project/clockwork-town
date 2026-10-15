/**
 * The network mocks for the town-week harness, kept free of app imports so a `vi.mock` factory can
 * load them without a circular import. See townWeek.ts.
 */
import { vi } from 'vitest'
import fixtureJson from './fixtures/desert-willow.json'

type Fixture = typeof fixtureJson
const fixture = fixtureJson as Fixture

export const persistenceMocks = {
  moveCharacterToLot: vi.fn(async () => {}),
  startCharacterActivity: vi.fn(async () => {}),
  persistCharacterRelationship: vi.fn(async (input: Record<string, unknown>) => ({
    id: String(input.id ?? `${input.fromCharacterId}-${input.toCharacterId}`),
    fromCharacterId: String(input.fromCharacterId),
    toCharacterId: String(input.toCharacterId),
    shortTermScore: Number(input.shortTermScore ?? 0),
    longTermScore: Number(input.longTermScore ?? 0),
    labels: (input.labels as string[] | undefined) ?? [],
    lastSeenAt: (input.lastSeenAt as string | undefined) ?? null,
    lastSpokeAt: (input.lastSpokeAt as string | undefined) ?? null,
    isDeceasedTarget: Boolean(input.isDeceasedTarget ?? false)
  })),
  createStructuredCharacterLongTermMemory: vi.fn(async (_input: unknown) => {}),
  fetchCharacterDetails: vi.fn(async (id: string) => (fixture.characters as Record<string, unknown>)[id]),
  persistCharacterBio: vi.fn(async () => {}),
  createCharacterLongTermMemory: vi.fn(async () => {}),
  updateCharacterLongTermMemory: vi.fn(async () => {}),
  deleteCharacterLongTermMemory: vi.fn(async () => {})
}

/** Answers the town loader's queries from the snapshot. */
export const graphqlClientMock = {
  request: async (query: string, variables: Record<string, unknown> = {}) => {
    // Matched by operation name: importing the mocked graphql module here would be circular.
    const name = /query\s+(\w+)/.exec(query)?.[1]
    if (name === 'GetLots') return fixture.lots
    if (name === 'GetHouseholds') return fixture.households
    if (name === 'GetRegion') return fixture.region
    if (name === 'GetSpacesWithItems') return (fixture.spaces as Record<string, unknown>)[String(variables.lotId)]
    throw new Error(`Town fixture has no answer for query: ${query.slice(0, 60)}`)
  }
}

