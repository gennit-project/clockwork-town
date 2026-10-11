/**
 * Thresholds for service-desk alert and ticket rules. Tune here, not in evaluators.
 */

import { TICK_DURATION_MINUTES } from '../stores/utils/simulationCalendar'

export const TICKS_PER_DAY = Math.round((24 * 60) / TICK_DURATION_MINUTES)

export const SERVICE_DESK_THRESHOLDS = {
  /** A need below this is a warning alert. */
  needWarning: 0.3,
  /** A need below this is a critical alert. */
  needCritical: 0.2,
  /** Days a resident may stay on one lot before an alert fires. */
  homeStayDays: 3,
  /** Fewer than this many friendships above `friendScore` raises an alert. */
  friendCountTarget: 2,
  /** Long-term score at which a relationship counts as a friend. */
  friendScore: 0.3,
  /** Per-day slope of happiness (0..1 scale) at or below which a trend alert fires. */
  happinessSlopePerDay: -0.05,
  /** Samples needed in the window before a trend is judged. */
  trendMinSamples: 24,
  /** Window (ticks) over which the trend is measured. */
  trendWindowTicks: TICKS_PER_DAY,
  /** Ticks a need must stay below `needCritical` before a ticket is filed. */
  ticketSustainedTicks: 12
} as const
