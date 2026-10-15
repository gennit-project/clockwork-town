import { appendFileSync } from 'node:fs'
import { describe, it, vi } from 'vitest'
import { mockConsole } from './mockData'
import { expectHealthy, formatReport, runTownWeek, DRAMA_INTENSITIES } from './townWeek'
import { TRAIT_EFFECTS } from '../config/traitEffects'

vi.mock('../simulationPersistence', async () => (await import('./townWeekMocks')).persistenceMocks)
vi.mock('../../graphql', async (original) => ({ ...(await original<object>()), client: (await import('./townWeekMocks')).graphqlClientMock }))

mockConsole()

// The long tuning report: `npm run tune:drama`. Skipped in the normal suite.
describe.skipIf(!process.env.TUNE_DRAMA)('town week report', () => {
  const days = Number(process.env.TUNE_DAYS ?? 7)
  it('prints the report', async () => {
    const log = process.env.TUNE_LOG
    const variant = process.env.TUNE_VARIANT ?? 'default'
    const intensity = (process.env.TUNE_INTENSITY ?? 'normal') as (typeof DRAMA_INTENSITIES)[number]
    const report = await runTownWeek({
      days,
      intensity,
      prepare: (states) => {
        const hasPressureEffect = (id: string) => !!TRAIT_EFFECTS[id]?.pressure
        for (const state of Object.values(states)) {
          if (variant === 'no-dispositions') {
            state.traitIds = state.traitIds.filter((id) => !hasPressureEffect(id))
            state.traits = state.traits.filter((_, i) => i < state.traitIds.length)
          }
          if (variant === 'all-hot' && !state.traitIds.includes('trait-loses-temper-easily')) {
            state.traitIds = [...state.traitIds, 'trait-loses-temper-easily']
          }
        }
      },
      onDay: (day, ms) => log && appendFileSync(log, `day ${day} done at ${(ms / 1000).toFixed(1)}s\n`)
    })
    const text = formatReport(report, `${variant} town`) + '\n'
    if (log) appendFileSync(log, text)
    process.stdout.write(text)
    expectHealthy(report, Object.keys(report.residents).length)
  }, 600_000)
})
