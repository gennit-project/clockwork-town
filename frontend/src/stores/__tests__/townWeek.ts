/**
 * Headless "town week" harness (Epic 6.8). Loads the seeded Desert Willow town from a snapshot
 * (scripts/snapshot-town.ts) through the real town loader, runs the real simulation for N days
 * with no manual intervention, and reports on the town's health and drama.
 *
 * A test file using this must mock the two network modules with the exports below:
 *   vi.mock('../simulationPersistence', async () => (await import('./townWeekMocks')).persistenceMocks)
 *   vi.mock('../../graphql', async (orig) => ({ ...(await orig<object>()), client: (await import('./townWeekMocks')).graphqlClientMock }))
 */
import { expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTownDataLoader } from '../../composables/useTownDataLoader'
import { useSimulationStore } from '../simulation'
import { useServiceDeskStore } from '../serviceDesk'
import { ANTISOCIAL } from '../config/antisocial'
import { NEED_TIERS } from '../config/needGating'
import { DRAMA_INTENSITIES, type DramaIntensity } from '../config/pressure'
import { readPressure } from '../utils/pressure'
import { createSimulationDateTime, TICK_DURATION_MINUTES } from '../utils/simulationCalendar'
import fixtureJson from './fixtures/desert-willow.json'
import type { CharacterState, NeedName } from '../types'

const fixture = fixtureJson as unknown as { worldId: string; regionId: string }
export const TICKS_PER_DAY = (24 * 60) / TICK_DURATION_MINUTES
/** A need at or below this counts as critical. */
export const CRITICAL_NEED = 0.1
/** Idle this many ticks in a row (an hour) with a basic need below `STUCK_NEED` counts as stuck. */
export const STUCK_TICKS = 12
export const STUCK_NEED = 0.3
/**
 * How long a need may sit critical in a row before the walk-away test fails. Basic needs get an
 * hour; emotional needs three (they move slowly and are gated behind the basics); fulfillment six
 * (a dull afternoon is not a crisis; a child at school cannot do much about it). Chosen from
 * measurement: see docs/roadmap/completed/epic-6-8-walk-away-and-tuning.md.
 */
export const CRITICAL_LIMIT_TICKS: Record<NeedName, number> = {
  food: STUCK_TICKS,
  sleep: STUCK_TICKS,
  bladder: STUCK_TICKS,
  hygiene: STUCK_TICKS,
  health: STUCK_TICKS,
  friends: STUCK_TICKS * 3,
  family: STUCK_TICKS * 3,
  romance: STUCK_TICKS * 3,
  fulfillment: STUCK_TICKS * 6
}

import { persistenceMocks } from './townWeekMocks'
export { persistenceMocks, graphqlClientMock } from './townWeekMocks'

/** A small deterministic PRNG (mulberry32) so animal wandering is repeatable. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface ResidentReport {
  name: string
  minNeed: Record<string, number>
  /** Longest run of ticks each need spent at or below CRITICAL_NEED. */
  longestCritical: Record<string, number>
  criticalTicks: number
  /** Longest idle run (ticks) with a basic need low. */
  longestStuck: number
  overTheLineTicks: number
  peakIrritation: number
  acts: Record<string, number>
}

export interface TownWeekReport {
  days: number
  ticks: number
  intensity: DramaIntensity
  residents: Record<string, ResidentReport>
  actsByRung: Record<string, number>
  actsPerDay: number[]
  /** (resident, day) pairs that hit the daily cap. */
  capHits: number
  /** Acts after which the actor was still over their line on the next tick. */
  actsStillOver: number
  longestActStreakDays: number
  /** Bystanders who stepped in, how many of those backfired, who aligned with the actor, and children or sensitive residents upset by watching. */
  interventions: number
  backfires: number
  sidesTaken: number
  upsetWitnesses: number
  /** Antisocial acts logged without a cause (must be zero). */
  actsWithoutCause: number
  /** Share of all irritation (summed over every tick) that each trigger accounts for. */
  triggerShare: Record<string, number>
  pressureTicketsOpened: number
  unmetNeedTicketsOpened: number
  /** Relationships whose long-term score fell by more than 0.3 from its start. */
  damagedRelationships: number
  /** Residents critical on a need for longer than its limit in a row (see CRITICAL_LIMIT_TICKS). */
  criticalForAnHour: string[]
}

export interface RunOptions {
  days: number
  intensity?: DramaIntensity
  seed?: number
  /** Adjust the freshly loaded town before the first tick (e.g. give everyone a trait). */
  prepare?: (states: Record<string, CharacterState>) => void
  /** Called after each sim day (for progress output on long runs). */
  onDay?: (day: number, elapsedMs: number) => void
}

export async function runTownWeek(options: RunOptions): Promise<TownWeekReport> {
  const intensity = options.intensity ?? 'normal'
  const random = vi.spyOn(Math, 'random').mockImplementation(seededRandom(options.seed ?? 1))
  try {
    setActivePinia(createPinia())
    const store = useSimulationStore()
    const desk = useServiceDeskStore()
    await useTownDataLoader().load(fixture.worldId, fixture.regionId)
    store.setDramaIntensity(intensity)
    // A fixed start (a Monday morning) so every run is the same week.
    store.simulationDateTime = createSimulationDateTime(new Date('2026-04-06T06:00:00.000Z'))
    options.prepare?.(store.characterStates)

    const startScores = new Map<string, number>()
    for (const [id, state] of Object.entries(store.characterStates)) {
      for (const rel of state.relationships ?? []) startScores.set(`${id}>${rel.toCharacterId}`, rel.longTermScore)
    }

    const ids = Object.keys(store.characterStates)
    const residents: Record<string, ResidentReport> = Object.fromEntries(
      ids.map((id) => [
        id,
        {
          name: store.characterStates[id].name,
          minNeed: {},
          longestCritical: {},
          criticalTicks: 0,
          longestStuck: 0,
          overTheLineTicks: 0,
          peakIrritation: 0,
          acts: {}
        }
      ])
    )
    const criticalRun: Record<string, Record<string, number>> = Object.fromEntries(ids.map((id) => [id, {}]))
    const stuckRun: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]))
    const seen = new WeakSet<object>()
    const actsByRung: Record<string, number> = {}
    const actsPerDay: number[] = Array(options.days).fill(0)
    const perResidentPerDay = new Map<string, number>()
    const actDays = new Map<string, Set<number>>()
    const justActed = new Set<string>()
    let actsStillOver = 0
    let actsWithoutCause = 0
    let interventions = 0
    let backfires = 0
    let sidesTaken = 0
    const memoryCallsAtStart = persistenceMocks.createStructuredCharacterLongTermMemory.mock.calls.length
    const triggerTotals: Record<string, number> = {}
    const ticks = options.days * TICKS_PER_DAY
    const startedAt = Date.now()

    for (let tick = 0; tick < ticks; tick++) {
      await store.executeTick()
      const day = Math.floor(tick / TICKS_PER_DAY)
      if (tick % TICKS_PER_DAY === TICKS_PER_DAY - 1) options.onDay?.(day + 1, Date.now() - startedAt)

      // Last tick's actors: did the act relieve them below their line?
      for (const id of justActed) {
        if (readPressure(store.characterStates[id], 'irritation', intensity).over) actsStillOver++
      }
      justActed.clear()

      for (const entry of store.activityLog) {
        if (seen.has(entry)) continue
        seen.add(entry)
        if (entry.action === 'intervene') {
          interventions++
          if (entry.details.includes('(escalated)')) backfires++
        }
        if (entry.action === 'took_side') sidesTaken++
        if (!['snap', 'belittle', 'argue'].includes(entry.action)) continue
        if (!entry.cause || entry.cause.kind !== 'antisocial_act' || entry.cause.factors.length === 0) actsWithoutCause++
        actsByRung[entry.action] = (actsByRung[entry.action] ?? 0) + 1
        actsPerDay[day]++
        const report = residents[entry.characterId]
        if (report) report.acts[entry.action] = (report.acts[entry.action] ?? 0) + 1
        const key = `${entry.characterId}:${day}`
        perResidentPerDay.set(key, (perResidentPerDay.get(key) ?? 0) + 1)
        if (!actDays.has(entry.characterId)) actDays.set(entry.characterId, new Set())
        actDays.get(entry.characterId)!.add(day)
        justActed.add(entry.characterId)
      }

      for (const id of ids) {
        const state = store.characterStates[id]
        const report = residents[id]
        let anyCritical = false
        for (const need of Object.keys(state.needs) as NeedName[]) {
          const level = state.needs[need]
          report.minNeed[need] = Math.min(report.minNeed[need] ?? 1, level)
          const run = (criticalRun[id][need] = level <= CRITICAL_NEED ? (criticalRun[id][need] ?? 0) + 1 : 0)
          report.longestCritical[need] = Math.max(report.longestCritical[need] ?? 0, run)
          if (level <= CRITICAL_NEED) anyCritical = true
        }
        if (anyCritical) report.criticalTicks++

        const basicLow = NEED_TIERS.basic.some((need) => state.needs[need] < STUCK_NEED)
        stuckRun[id] = state.currentAction === 'idle' && basicLow ? stuckRun[id] + 1 : 0
        report.longestStuck = Math.max(report.longestStuck, stuckRun[id])

        const reading = readPressure(state, 'irritation', intensity)
        report.peakIrritation = Math.max(report.peakIrritation, reading.value)
        if (reading.over) report.overTheLineTicks++
        for (const [trigger, amount] of Object.entries(state.pressure?.irritation?.ledger ?? {})) {
          triggerTotals[trigger] = (triggerTotals[trigger] ?? 0) + amount
        }
      }
    }

    const capHits = [...perResidentPerDay.values()].filter((count) => count >= ANTISOCIAL.dailyCap).length
    let longestActStreakDays = 0
    for (const days of actDays.values()) {
      let streak = 0
      for (let d = 0; d < options.days; d++) {
        streak = days.has(d) ? streak + 1 : 0
        longestActStreakDays = Math.max(longestActStreakDays, streak)
      }
    }
    const totalTrigger = Object.values(triggerTotals).reduce((a, b) => a + b, 0) || 1
    let damaged = 0
    for (const [id, state] of Object.entries(store.characterStates)) {
      for (const rel of state.relationships ?? []) {
        const start = startScores.get(`${id}>${rel.toCharacterId}`)
        if (start !== undefined && start - rel.longTermScore > 0.3) damaged++
      }
    }

    return {
      days: options.days,
      ticks,
      intensity,
      residents,
      actsByRung,
      actsPerDay,
      capHits,
      actsStillOver,
      longestActStreakDays,
      interventions,
      backfires,
      sidesTaken,
      upsetWitnesses: persistenceMocks.createStructuredCharacterLongTermMemory.mock.calls
        .slice(memoryCallsAtStart)
        .filter(([input]) => (input as { eventType?: string }).eventType === 'witnessed_conflict').length,
      actsWithoutCause,
      triggerShare: Object.fromEntries(Object.entries(triggerTotals).map(([k, v]) => [k, v / totalTrigger])),
      pressureTicketsOpened: desk.tickets.filter((t) => t.rule === 'pressure').length,
      unmetNeedTicketsOpened: desk.tickets.filter((t) => t.rule === 'unmet-need').length,
      damagedRelationships: damaged,
      criticalForAnHour: Object.values(residents)
        .filter((r) =>
          Object.entries(r.longestCritical).some(([need, run]) => run >= CRITICAL_LIMIT_TICKS[need as NeedName])
        )
        .map((r) => r.name)
    }
  } finally {
    random.mockRestore()
  }
}

export { DRAMA_INTENSITIES }

/**
 * The walk-away guarantee (Epic 6.8): an unattended town stays healthy. These bounds apply to the
 * default (hands-off) mode and are re-checked on a longer run by `npm run tune:drama`.
 */
export function expectHealthy(report: TownWeekReport, residentCount: number) {
  // Nobody stays critical on any need for as long as an hour.
  expect(report.criticalForAnHour, 'critical for an hour').toEqual([])
  // Nobody sits idle with a basic need low.
  for (const resident of Object.values(report.residents)) {
    expect(resident.longestStuck, `${resident.name} stuck`).toBeLessThanOrEqual(STUCK_TICKS)
  }
  // Friendships and marriages do not fall apart because nobody was watching.
  expect(report.damagedRelationships, 'damaged relationships').toBe(0)
  // Drama stays bounded and explained.
  expect(report.actsWithoutCause, 'acts without a cause').toBe(0)
  const perDayMax = residentCount * ANTISOCIAL.dailyCap
  for (const count of report.actsPerDay) expect(count).toBeLessThanOrEqual(perDayMax)
}

/** One readable text block for the long report. */
export function formatReport(report: TownWeekReport, label: string): string {
  const lines: string[] = [`\n=== ${label} (${report.days} days, drama ${report.intensity}) ===`]
  lines.push(`acts: ${JSON.stringify(report.actsByRung)}; per day: [${report.actsPerDay.join(', ')}]`)
  lines.push(
    `cap hits: ${report.capHits}; acts still over line next tick: ${report.actsStillOver}; longest act streak (days): ${report.longestActStreakDays}`
  )
  lines.push(`interventions: ${report.interventions} (${report.backfires} backfired); sided with the actor: ${report.sidesTaken}; upset witnesses: ${report.upsetWitnesses}`)
  lines.push(`pressure tickets: ${report.pressureTicketsOpened}; unmet-need tickets: ${report.unmetNeedTicketsOpened}; damaged relationships: ${report.damagedRelationships}`)
  lines.push(`critical for an hour+: ${report.criticalForAnHour.join(', ') || 'nobody'}`)
  lines.push(
    'trigger share: ' +
      Object.entries(report.triggerShare)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`)
        .join(', ')
  )
  for (const r of Object.values(report.residents)) {
    const worst = Object.entries(r.minNeed).sort((a, b) => a[1] - b[1])[0]
    lines.push(
      `  ${r.name.padEnd(16)} min ${worst?.[0]} ${worst?.[1].toFixed(2)}  critical ticks ${String(r.criticalTicks).padStart(4)}  stuck ${String(r.longestStuck).padStart(3)}  over-line ticks ${String(r.overTheLineTicks).padStart(4)}  peak irr ${r.peakIrritation.toFixed(2)}  acts ${JSON.stringify(r.acts)}`
    )
  }
  return lines.join('\n')
}
