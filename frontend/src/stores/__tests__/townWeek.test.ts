import { describe, it, vi, expect } from 'vitest'
import { mockConsole } from './mockData'
import { expectHealthy, runTownWeek } from './townWeek'

vi.mock('../simulationPersistence', async () => (await import('./townWeekMocks')).persistenceMocks)
vi.mock('../../graphql', async (original) => ({ ...(await original<object>()), client: (await import('./townWeekMocks')).graphqlClientMock }))

mockConsole()

// A small town (the Lin, Marsh and Reyes households: 8 residents) for one sim day. The full
// 12-resident week is `npm run tune:drama`; a tick of the whole town is slow.
const SMALL_TOWN = ['char-amina-lin', 'char-ravi-lin', 'char-priya-lin', 'char-tom-marsh', 'char-sara-marsh', 'char-leo-marsh', 'char-manny-reyes', 'char-elena-reyes']

describe('walk-away test', () => {
  it('a small town left alone for a sim day stays healthy', async () => {
    const report = await runTownWeek({
      days: 1,
      prepare: (states) => {
        for (const id of Object.keys(states)) if (!SMALL_TOWN.includes(id)) delete states[id]
      }
    })
    expect(Object.keys(report.residents)).toHaveLength(SMALL_TOWN.length)
    expectHealthy(report, SMALL_TOWN.length)
  }, 240_000)
})
