/**
 * Duration trackers for service-desk rules: how long a resident has stayed on one lot,
 * and how long each need has stayed below the ticket threshold.
 */

import { SERVICE_DESK_THRESHOLDS } from '../../config/serviceDesk'
import type { CharacterState, NeedName } from '../types'

export interface ServiceDeskTrackers {
  /** characterId -> where they are and since which tick */
  lotStay: Record<string, { lotId: string | null; sinceTick: number }>
  /** `${characterId}:${need}` -> tick the need first dropped below threshold */
  lowNeedSince: Record<string, number>
}

export function createTrackers(): ServiceDeskTrackers {
  return { lotStay: {}, lowNeedSince: {} }
}

export function lowNeedKey(characterId: string, need: NeedName): string {
  return `${characterId}:${need}`
}

/** Returns updated trackers for the given tick; does not mutate the input. */
export function updateTrackers(
  prev: ServiceDeskTrackers,
  states: Record<string, CharacterState>,
  tick: number
): ServiceDeskTrackers {
  const lotStay: ServiceDeskTrackers['lotStay'] = {}
  const lowNeedSince: ServiceDeskTrackers['lowNeedSince'] = {}

  for (const [characterId, state] of Object.entries(states)) {
    const lotId = state.location.lotId
    const before = prev.lotStay[characterId]
    lotStay[characterId] =
      before && before.lotId === lotId ? before : { lotId, sinceTick: tick }

    for (const [need, value] of Object.entries(state.needs) as [NeedName, number][]) {
      if (value < SERVICE_DESK_THRESHOLDS.needCritical) {
        const key = lowNeedKey(characterId, need)
        lowNeedSince[key] = prev.lowNeedSince[key] ?? tick
      }
    }
  }

  return { lotStay, lowNeedSince }
}
