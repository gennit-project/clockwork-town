/**
 * Pressure meters (irritation, and jealousy for jealous residents). They build from named
 * triggers and drain with rest, venting and time. Each meter keeps a ledger of what currently
 * makes it up (trigger -> amount), so the ledger always sums to the meter and the "why" view can
 * list it. Pure functions; the runtime calls them each tick. Nothing here acts on a meter yet.
 */

import {
  DRAMA_THRESHOLD_MULTIPLIER,
  PRESSURE,
  PRESSURE_METERS,
  PRESSURE_TRIGGER_LABELS,
  type DramaIntensity,
  type PressureMeter
} from '../config/pressure'
import { NEED_TIERS } from '../config/needGating'
import { TRAIT_EFFECTS } from '../config/traitEffects'
import type { CharacterState, MeterState } from '../types'

type Pressured = Pick<CharacterState, 'pressure' | 'traitIds'>

export interface Disposition {
  gain: Record<PressureMeter, number>
  threshold: Record<PressureMeter, number>
  grievanceGain: number
  enabled: Set<PressureMeter>
}

/** What a resident's traits do to their pressure. Multipliers from several traits combine. */
export function dispositionOf(traitIds: readonly string[] = []): Disposition {
  const disposition: Disposition = {
    gain: { irritation: 1, jealousy: 1 },
    threshold: { irritation: 1, jealousy: 1 },
    grievanceGain: 1,
    enabled: new Set<PressureMeter>(['irritation'])
  }
  for (const id of traitIds) {
    const effect = TRAIT_EFFECTS[id]?.pressure
    if (!effect) continue
    for (const meter of PRESSURE_METERS) {
      disposition.gain[meter] *= effect.gain?.[meter] ?? 1
      disposition.threshold[meter] *= effect.threshold?.[meter] ?? 1
    }
    disposition.grievanceGain *= effect.grievanceGain ?? 1
    effect.enables?.forEach((meter) => disposition.enabled.add(meter))
  }
  return disposition
}

export const meterEnabled = (traitIds: readonly string[] | undefined, meter: PressureMeter): boolean =>
  dispositionOf(traitIds).enabled.has(meter)

/** The meter value at which this resident counts as over the line. Infinity at drama intensity Off. */
export function thresholdFor(traitIds: readonly string[] | undefined, meter: PressureMeter, intensity: DramaIntensity): number {
  return PRESSURE.baseThreshold * dispositionOf(traitIds).threshold[meter] * DRAMA_THRESHOLD_MULTIPLIER[intensity]
}

const meterOf = (state: Pressured, meter: PressureMeter): MeterState => {
  state.pressure ??= {}
  return (state.pressure[meter] ??= { value: 0, ledger: {} })
}

export const pressureValue = (state: Pick<CharacterState, 'pressure'>, meter: PressureMeter): number =>
  state.pressure?.[meter]?.value ?? 0

/** Add pressure from a named trigger, scaled by the resident's disposition. Returns what was actually added. */
export function addPressure(state: Pressured, meter: PressureMeter, trigger: string, amount: number): number {
  const disposition = dispositionOf(state.traitIds)
  if (!disposition.enabled.has(meter) || amount <= 0) return 0
  const m = meterOf(state, meter)
  const added = Math.min(1 - m.value, amount * disposition.gain[meter])
  if (added <= 0) return 0
  m.value += added
  m.ledger[trigger] = (m.ledger[trigger] ?? 0) + added
  return added
}

/** Drain a meter, taking proportionally from every trigger so the ledger still sums to the meter. */
export function relievePressure(state: Pick<CharacterState, 'pressure'>, meter: PressureMeter, amount: number): number {
  const m = state.pressure?.[meter]
  if (!m || m.value <= 0 || amount <= 0) return 0
  const removed = Math.min(m.value, amount)
  const remaining = m.value - removed
  const scale = remaining / m.value
  for (const key of Object.keys(m.ledger)) m.ledger[key] *= scale
  m.value = remaining
  if (remaining <= PRESSURE.ledgerEpsilon) {
    m.value = 0
    m.ledger = {}
  }
  return removed
}

export interface PressureGain {
  meter: PressureMeter
  trigger: string
  amount: number
}

/** What builds pressure on this resident this tick, before their disposition scales it. */
export function pressureGains(
  state: Pick<CharacterState, 'needs' | 'grievances' | 'traitIds' | 'relationships' | 'location'>,
  others: ReadonlyArray<Pick<CharacterState, 'currentTask'> & { id: string }>
): PressureGain[] {
  const gains: PressureGain[] = []

  let shortfall = 0
  for (const need of NEED_TIERS.basic) {
    const level = state.needs[need] ?? 1
    if (level < PRESSURE.needShortfallBelow) shortfall += PRESSURE.needShortfallBelow - level
  }
  if (shortfall > 0) gains.push({ meter: 'irritation', trigger: 'unmet_needs', amount: shortfall * PRESSURE.needShortfallGain / PRESSURE.needShortfallBelow })

  const grievanceGain = dispositionOf(state.traitIds).grievanceGain
  const grievanceAmount = (state.grievances ?? [])
    .filter((g) => !g.vented)
    .reduce(
      (sum, g) =>
        sum +
        PRESSURE.grievanceGain * Math.min(g.times, PRESSURE.grievanceRepeatCap) * (g.directed ? 1 : PRESSURE.undirectedGrievanceWeight),
      0
    )
  if (grievanceAmount > 0) gains.push({ meter: 'irritation', trigger: 'grievances', amount: grievanceAmount * grievanceGain })

  const crowd = others.length + 1 - PRESSURE.crowdAbove
  if (crowd > 0) gains.push({ meter: 'irritation', trigger: 'crowding', amount: crowd * PRESSURE.crowdGain })

  if (meterEnabled(state.traitIds, 'jealousy')) {
    const closeTies = new Set(
      (state.relationships ?? [])
        .filter((r) => !r.isDeceasedTarget && r.longTermScore >= PRESSURE.rivalCloseTieMin)
        .map((r) => r.toCharacterId)
    )
    const selfId = (state as { id?: string }).id
    const strayed = others.filter(
      (o) => closeTies.has(o.id) && o.currentTask?.socialTargetId && o.currentTask.socialTargetId !== selfId
    )
    if (strayed.length > 0) gains.push({ meter: 'jealousy', trigger: 'rival_presence', amount: strayed.length * PRESSURE.rivalGain })
  }
  return gains
}

/** One tick for everyone: triggers add pressure, then rest and time drain it. */
export function tickPressure(states: Record<string, CharacterState>): void {
  const byLot = new Map<string, string[]>()
  for (const [id, state] of Object.entries(states)) {
    const lotId = state.location.lotId
    if (lotId) byLot.set(lotId, [...(byLot.get(lotId) ?? []), id])
  }

  for (const [id, state] of Object.entries(states)) {
    const lotId = state.location.lotId
    const others = lotId ? (byLot.get(lotId) ?? []).filter((o) => o !== id).map((o) => ({ id: o, currentTask: states[o].currentTask })) : []
    for (const gain of pressureGains({ ...state, id } as never, others)) {
      addPressure(state, gain.meter, gain.trigger, gain.amount)
    }
    const drain = PRESSURE.baseDecay + (state.currentAction === 'sleep' ? PRESSURE.sleepDecay : 0)
    for (const meter of PRESSURE_METERS) relievePressure(state, meter, drain + pressureValue(state, meter) * PRESSURE.proportionalDecay)
  }
}

export interface PressureReading {
  meter: PressureMeter
  value: number
  threshold: number
  over: boolean
  /** Largest contribution first; tiny ones are left out. */
  contributions: Array<{ trigger: string; label: string; amount: number }>
}

export function readPressure(state: Pressured, meter: PressureMeter, intensity: DramaIntensity): PressureReading {
  const m = state.pressure?.[meter]
  const value = m?.value ?? 0
  const threshold = thresholdFor(state.traitIds, meter, intensity)
  return {
    meter,
    value,
    threshold,
    over: value >= threshold,
    contributions: Object.entries(m?.ledger ?? {})
      .filter(([, amount]) => amount >= 0.005)
      .map(([trigger, amount]) => ({ trigger, label: PRESSURE_TRIGGER_LABELS[trigger] ?? trigger, amount }))
      .sort((a, b) => b.amount - a.amount)
  }
}
