/**
 * Alert evaluators. Each rule is a pure function from sim state to alerts; add a new
 * rule by writing one and appending it to ALERT_EVALUATORS.
 */

import { SERVICE_DESK_THRESHOLDS, TICKS_PER_DAY } from '../../config/serviceDesk'
import type { Alert, CharacterState, HappinessSample, NeedName, ServiceDeskSeverity } from '../types'
import type { ServiceDeskTrackers } from './serviceDeskTrackers'
import { activeValues, isValueNeglected, valueSatisfaction } from './valueEffects'

export interface AlertContext {
  tick: number
  states: Record<string, CharacterState>
  history: HappinessSample[]
  trackers: ServiceDeskTrackers
}

export type AlertEvaluator = (ctx: AlertContext) => Alert[]

const SEVERITY_ORDER: Record<ServiceDeskSeverity, number> = { critical: 0, warning: 1, info: 2 }

export function compareSeverity(a: ServiceDeskSeverity, b: ServiceDeskSeverity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b]
}

export const evaluateCriticalNeeds: AlertEvaluator = ({ states }) => {
  const alerts: Alert[] = []
  for (const [characterId, state] of Object.entries(states)) {
    for (const [need, value] of Object.entries(state.needs) as [NeedName, number][]) {
      if (value >= SERVICE_DESK_THRESHOLDS.needWarning) continue
      const critical = value < SERVICE_DESK_THRESHOLDS.needCritical
      alerts.push({
        id: `low-need:${characterId}:${need}`,
        rule: 'low-need',
        severity: critical ? 'critical' : 'warning',
        characterId,
        characterName: state.name,
        message: `${need} at ${Math.round(value * 100)}%`
      })
    }
  }
  return alerts
}

export const evaluateHomeStay: AlertEvaluator = ({ tick, states, trackers }) => {
  const alerts: Alert[] = []
  const limit = SERVICE_DESK_THRESHOLDS.homeStayDays * TICKS_PER_DAY
  for (const [characterId, state] of Object.entries(states)) {
    const lotId = state.location.lotId
    if (!lotId || lotId !== state.homeLotId) continue
    const stay = trackers.lotStay[characterId]
    if (!stay || stay.lotId !== lotId) continue
    const days = (tick - stay.sinceTick) / TICKS_PER_DAY
    if (tick - stay.sinceTick < limit) continue
    alerts.push({
      id: `home-stay:${characterId}`,
      rule: 'home-stay',
      severity: 'warning',
      characterId,
      characterName: state.name,
      message: `hasn't left home in ${Math.floor(days)} days`
    })
  }
  return alerts
}

export const evaluateFriendCount: AlertEvaluator = ({ states }) => {
  const alerts: Alert[] = []
  for (const [characterId, state] of Object.entries(states)) {
    const friends = (state.relationships ?? []).filter(
      (r) => !r.isDeceasedTarget && r.longTermScore >= SERVICE_DESK_THRESHOLDS.friendScore
    ).length
    if (friends >= SERVICE_DESK_THRESHOLDS.friendCountTarget) continue
    alerts.push({
      id: `few-friends:${characterId}`,
      rule: 'few-friends',
      severity: 'info',
      characterId,
      characterName: state.name,
      message: `${friends} friend${friends === 1 ? '' : 's'} (target ${SERVICE_DESK_THRESHOLDS.friendCountTarget})`
    })
  }
  return alerts
}

/** Least-squares slope of y over x, or null with fewer than two distinct x. */
export function linearSlope(points: { x: number; y: number }[]): number | null {
  const n = points.length
  if (n < 2) return null
  const meanX = points.reduce((s, p) => s + p.x, 0) / n
  const meanY = points.reduce((s, p) => s + p.y, 0) / n
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY)
    den += (p.x - meanX) ** 2
  }
  return den === 0 ? null : num / den
}

export const evaluateHappinessTrend: AlertEvaluator = ({ tick, states, history }) => {
  const windowStart = tick - SERVICE_DESK_THRESHOLDS.trendWindowTicks
  const window = history.filter((s) => s.tick >= windowStart)
  if (window.length < SERVICE_DESK_THRESHOLDS.trendMinSamples) return []

  const alerts: Alert[] = []
  for (const [characterId, state] of Object.entries(states)) {
    const points = window
      .filter((s) => s.perCharacter[characterId] !== undefined)
      .map((s) => ({ x: s.tick, y: s.perCharacter[characterId] }))
    if (points.length < SERVICE_DESK_THRESHOLDS.trendMinSamples) continue
    const slope = linearSlope(points)
    if (slope === null) continue
    const perDay = slope * TICKS_PER_DAY
    if (perDay > SERVICE_DESK_THRESHOLDS.happinessSlopePerDay) continue
    alerts.push({
      id: `declining:${characterId}`,
      rule: 'declining-happiness',
      severity: 'warning',
      characterId,
      characterName: state.name,
      message: `fulfillment trending down (${(perDay * 100).toFixed(1)} pts/day)`
    })
  }
  return alerts
}

/** A value that has gone unfulfilled long enough to count as neglected. */
export const evaluateNeglectedValues: AlertEvaluator = ({ states }) => {
  const alerts: Alert[] = []
  for (const [characterId, state] of Object.entries(states)) {
    for (const { value, rank } of activeValues(state)) {
      if (!isValueNeglected(value)) continue
      const days = value.ticksSinceFulfilled / TICKS_PER_DAY
      alerts.push({
        id: `value-neglect:${characterId}:${value.id}`,
        rule: 'value-neglect',
        // The resident's top value, fully neglected, is the most serious case.
        severity: rank === 1 && valueSatisfaction(value) === 0 ? 'critical' : 'warning',
        characterId,
        characterName: state.name,
        message: `value neglected: "${value.name}" (${days.toFixed(1)} days)`
      })
    }
  }
  return alerts
}

export const ALERT_EVALUATORS: AlertEvaluator[] = [
  evaluateCriticalNeeds,
  evaluateHomeStay,
  evaluateFriendCount,
  evaluateHappinessTrend,
  evaluateNeglectedValues
]

/** Run every rule and return alerts sorted most severe first. */
export function evaluateAlerts(ctx: AlertContext, evaluators: AlertEvaluator[] = ALERT_EVALUATORS): Alert[] {
  return evaluators
    .flatMap((evaluate) => evaluate(ctx))
    .sort((a, b) => compareSeverity(a.severity, b.severity) || a.characterName.localeCompare(b.characterName))
}
