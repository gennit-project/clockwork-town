<template>
  <div class="p-4">
    <h1 class="mb-3 text-lg font-semibold text-gf-text">Alerts</h1>
    <Panel title="Active alerts" :status="worst">
      <p v-if="alerts.length === 0" class="py-12 text-center text-sm text-gf-text-faint">
        All clear. Start the simulation to see alerts as conditions change.
      </p>
      <ul v-else class="divide-y divide-gf-border">
        <li v-for="a in alerts" :key="a.id" class="flex items-center gap-3 px-3 py-2 text-sm">
          <span class="w-16 shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] font-semibold uppercase" :class="severityClass(a.severity)">
            {{ a.severity }}
          </span>
          <router-link v-if="link(a.characterId)" :to="link(a.characterId)!" class="shrink-0 text-gf-blue hover:underline">
            {{ a.characterName }}
          </router-link>
          <span v-else class="shrink-0 text-gf-text">{{ a.characterName }}</span>
          <span class="min-w-0 truncate text-gf-text-weak">{{ a.message }}</span>
        </li>
      </ul>
    </Panel>

    <Panel title="Recent events" class="mt-3">
      <p v-if="recentEvents.length === 0" class="py-6 text-center text-sm text-gf-text-faint">
        Nothing notable yet. Reunions and other moments show up here as they happen.
      </p>
      <ul v-else class="divide-y divide-gf-border">
        <li v-for="event in recentEvents" :key="`${event.tick}-${event.message}`" class="flex items-center gap-3 px-3 py-2 text-sm">
          <span class="w-20 shrink-0 text-xs text-gf-text-faint">{{ timeSince(event.iso, nowIso) }}</span>
          <span class="min-w-0 text-gf-text-weak">{{ event.message }}</span>
        </li>
      </ul>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Panel from '../components/Panel.vue'
import { useResidentLink } from '../composables/useResidentLink'
import { useServiceDeskStore } from '../stores/serviceDesk'
import { useSimulationStore } from '../stores/simulation'
import { timeSince } from '../stores/utils/relativeTime'
import { severityClass } from './serviceDeskStyles'

const desk = useServiceDeskStore()
const sim = useSimulationStore()
const link = useResidentLink()
const alerts = computed(() => desk.alerts)
const recentEvents = computed(() => [...sim.events].reverse())
const nowIso = computed(() => sim.simulationDateTime.iso)
const worst = computed(() =>
  alerts.value.some((a) => a.severity === 'critical')
    ? 'critical'
    : alerts.value.some((a) => a.severity === 'warning')
      ? 'warning'
      : 'healthy'
)
</script>
