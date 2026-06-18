/**
 * Relative-time helpers for surfacing temporal data (last seen/spoke, memory
 * recency) against simulation time.
 */

const HOUR_MS = 3600000
const DAY_MS = HOUR_MS * 24

/** Hours between two ISO timestamps (now - then). Negative clamped to 0. */
export function hoursBetween(thenIso: string | null | undefined, nowIso: string): number {
  if (!thenIso) {
    return Infinity
  }
  const then = Date.parse(thenIso)
  const now = Date.parse(nowIso)
  if (Number.isNaN(then) || Number.isNaN(now)) {
    return Infinity
  }
  return Math.max(0, (now - then) / HOUR_MS)
}

/** Human "time since" label, e.g. "just now", "3h ago", "5d ago", "never". */
export function timeSince(thenIso: string | null | undefined, nowIso: string): string {
  if (!thenIso) {
    return 'never'
  }
  const then = Date.parse(thenIso)
  const now = Date.parse(nowIso)
  if (Number.isNaN(then) || Number.isNaN(now)) {
    return 'unknown'
  }
  const diff = now - then
  if (diff < 60000) {
    return 'just now'
  }
  if (diff < HOUR_MS) {
    return `${Math.floor(diff / 60000)}m ago`
  }
  if (diff < DAY_MS) {
    return `${Math.floor(diff / HOUR_MS)}h ago`
  }
  return `${Math.floor(diff / DAY_MS)}d ago`
}
