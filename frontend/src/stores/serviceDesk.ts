import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useSimulationStore } from './simulation'
import { evaluateAlerts } from './utils/alertEvaluators'
import { evaluateTicketCandidates } from './utils/ticketEvaluators'
import { reconcileTickets, transitionTicket } from './utils/ticketLifecycle'
import { createTrackers, updateTrackers, type ServiceDeskTrackers } from './utils/serviceDeskTrackers'
import type { Alert, Ticket } from './types'

/**
 * Service desk: derives alerts from sim state and files tickets for sustained problems.
 * Tickets live in memory only; they reset with the simulation.
 */
export const useServiceDeskStore = defineStore('serviceDesk', () => {
  const sim = useSimulationStore()

  const alerts = ref<Alert[]>([])
  const tickets = ref<Ticket[]>([])
  let trackers: ServiceDeskTrackers = createTrackers()
  let ticketSeq = 0

  function refresh(): void {
    const tick = sim.currentTick
    trackers = updateTrackers(trackers, sim.characterStates, tick)
    alerts.value = evaluateAlerts({
      tick,
      states: sim.characterStates,
      history: sim.happinessHistory,
      trackers
    })
    const candidates = evaluateTicketCandidates({ tick, states: sim.characterStates, trackers })
    tickets.value = reconcileTickets(tickets.value, candidates, tick, () => `ticket-${++ticketSeq}`)
  }

  function setStatus(id: string, status: 'acknowledged' | 'resolved'): void {
    tickets.value = transitionTicket(tickets.value, id, status, sim.currentTick)
  }

  function reset(): void {
    alerts.value = []
    tickets.value = []
    trackers = createTrackers()
  }

  // Re-evaluate once per sim tick; a world switch (tick resets to 0) starts fresh.
  watch(
    () => sim.currentTick,
    (tick, prev) => {
      if (prev !== undefined && tick < prev) reset()
      refresh()
    }
  )
  watch(() => sim.activeWorldId, reset)

  const openTicketCount = computed(() => tickets.value.filter((t) => t.status !== 'resolved').length)

  return { alerts, tickets, openTicketCount, refresh, acknowledge: (id: string) => setStatus(id, 'acknowledged'), resolve: (id: string) => setStatus(id, 'resolved') }
})
