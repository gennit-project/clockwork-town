/**
 * Pressure: the slow build-up of irritation (and, for jealous residents, jealousy) that makes
 * antisocial behavior possible. Nothing here acts yet; it only measures. All numbers are first
 * guesses to be tuned once Epic 6.3 gives the meters something to do. See utils/pressure.ts.
 */

export type PressureMeter = 'irritation' | 'jealousy'
export const PRESSURE_METERS: PressureMeter[] = ['irritation', 'jealousy']

/** How readily drama happens, as a multiplier on thresholds. `off` means the threshold can never be crossed. */
export type DramaIntensity = 'off' | 'low' | 'normal' | 'high' | 'relentless'
export const DRAMA_INTENSITIES: DramaIntensity[] = ['off', 'low', 'normal', 'high', 'relentless']
export const DRAMA_THRESHOLD_MULTIPLIER: Record<DramaIntensity, number> = {
  off: Infinity,
  low: 1.3,
  normal: 1,
  high: 0.8,
  relentless: 0.6
}
export const DEFAULT_DRAMA_INTENSITY: DramaIntensity = 'normal'

export const PRESSURE = {
  /** Meter value at which a resident with no relevant traits is "over the line". */
  baseThreshold: 0.7,
  /** Meter drain per tick, always. */
  baseDecay: 0.004,
  /** Extra drain per tick as a fraction of the current value, so a steady trigger levels off instead of climbing without limit. */
  proportionalDecay: 0.025,
  /** Extra drain per tick while asleep. */
  sleepDecay: 0.02,
  /** One-off relief amounts. */
  ventRelief: 0.15,
  comfortEatRelief: 0.08,
  /** Basic needs below this level add irritation, in proportion to the shortfall. */
  needShortfallBelow: 0.3,
  needShortfallGain: 0.02,
  /** Per unvented grievance, per tick, scaled by how often it was repeated (capped at `grievanceRepeatCap`). */
  grievanceGain: 0.016,
  grievanceRepeatCap: 3,
  /** Weight of a grievance about something that was not done to them (a bystander's disapproval). */
  undirectedGrievanceWeight: 0.4,
  /** Added once to the person being disapproved of, at the moment of the reaction. */
  disapprovedImpulse: 0.03,
  /** More than this many residents on one lot is a crowd; each extra adds this much per tick. */
  crowdAbove: 6,
  crowdGain: 0.003,
  /** Jealousy: a close tie (long-term score at least this) busy with someone else on the same lot. */
  rivalCloseTieMin: 0.6,
  rivalGain: 0.02,
  /** Pressure ledger entries below this are dropped. */
  ledgerEpsilon: 0.0005
} as const

/** Human labels for each trigger, shown in the cause view. */
export const PRESSURE_TRIGGER_LABELS: Record<string, string> = {
  unmet_needs: 'Unmet basic needs',
  insulted: 'Being on the receiving end of an act',
  confronted: 'Being confronted by someone stepping in',
  distress: 'Watching other people fight',
  grievances: 'Grievances they hold',
  disapproved: 'Being disapproved of',
  crowding: 'Crowding',
  rival_presence: "A loved one's attention is elsewhere",
  vented: 'Talked it over',
  comfort_eating: 'Comfort food',
  sleep: 'Rest',
  time: 'Time passing'
}
