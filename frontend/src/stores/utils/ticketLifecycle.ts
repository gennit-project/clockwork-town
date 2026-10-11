/**
 * Ticket lifecycle: open -> acknowledged -> resolved. All functions are pure.
 */

import type { Ticket, TicketCandidate, TicketStatus } from '../types'

/**
 * Reconcile current tickets with the conditions that presently hold.
 * - A candidate with no unresolved ticket opens one.
 * - An unresolved ticket whose condition cleared is auto-resolved.
 * - A manually resolved ticket whose condition persists is not reopened, until the condition clears.
 */
export function reconcileTickets(
  tickets: Ticket[],
  candidates: TicketCandidate[],
  tick: number,
  nextId: () => string
): Ticket[] {
  const activeKeys = new Set(candidates.map((c) => c.key))
  const knownKeys = new Set(
    tickets
      .filter((t) => t.status !== 'resolved' || (!t.autoResolved && activeKeys.has(t.key)))
      .map((t) => t.key)
  )

  const updated = tickets.map((t): Ticket =>
    t.status !== 'resolved' && !activeKeys.has(t.key)
      ? { ...t, status: 'resolved', updatedTick: tick, autoResolved: true }
      : t
  )

  const opened = candidates
    .filter((c) => !knownKeys.has(c.key))
    .map((c): Ticket => ({
      ...c,
      id: nextId(),
      status: 'open',
      openedTick: tick,
      updatedTick: tick
    }))

  return opened.length === 0 && updated.every((t, i) => t === tickets[i]) ? tickets : [...updated, ...opened]
}

const ALLOWED: Record<TicketStatus, TicketStatus[]> = {
  open: ['acknowledged', 'resolved'],
  acknowledged: ['resolved'],
  resolved: []
}

export function transitionTicket(tickets: Ticket[], id: string, to: TicketStatus, tick: number): Ticket[] {
  return tickets.map((t) =>
    t.id === id && ALLOWED[t.status].includes(to) ? { ...t, status: to, updatedTick: tick } : t
  )
}
