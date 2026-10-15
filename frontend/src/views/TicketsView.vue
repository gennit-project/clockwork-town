<template>
  <div class="p-4">
    <h1 class="mb-3 text-lg font-semibold text-gf-text">Tickets</h1>
    <Panel title="Resident incidents">
      <template #actions>
        <select v-model="statusFilter" class="rounded border border-gf-border bg-gf-surface-2 px-1 py-0.5 text-xs" aria-label="Filter by status">
          <option value="active">Open + acknowledged</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
        <select v-model="severityFilter" class="rounded border border-gf-border bg-gf-surface-2 px-1 py-0.5 text-xs" aria-label="Filter by severity">
          <option value="all">Any severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </template>
      <p v-if="visible.length === 0" class="py-12 text-center text-sm text-gf-text-faint">
        No tickets match. Tickets are filed when a resident's need stays critically low.
      </p>
      <ul v-else class="divide-y divide-gf-border">
        <li v-for="t in visible" :key="t.id" class="flex items-center gap-3 px-3 py-2 text-sm">
          <span class="w-16 shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] font-semibold uppercase" :class="severityClass(t.severity)">
            {{ t.severity }}
          </span>
          <div class="min-w-0 flex-1">
            <router-link v-if="link(t.characterId)" :to="link(t.characterId)!" class="text-gf-blue hover:underline">
              {{ t.title }}
            </router-link>
            <span v-else class="text-gf-text">{{ t.title }}</span>
            <div class="text-xs text-gf-text-faint">
              {{ t.status }}{{ t.autoResolved ? ' (condition cleared)' : '' }} · opened tick {{ t.openedTick }}
            </div>
            <WhyCause v-if="t.cause" :cause="t.cause" />
          </div>
          <button v-if="t.status === 'open'" class="rounded border border-gf-border px-2 py-0.5 text-xs hover:bg-gf-surface-2" @click="desk.acknowledge(t.id)">
            Acknowledge
          </button>
          <button v-if="t.status !== 'resolved'" class="rounded border border-gf-border px-2 py-0.5 text-xs hover:bg-gf-surface-2" @click="desk.resolve(t.id)">
            Resolve
          </button>
        </li>
      </ul>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Panel from '../components/Panel.vue'
import WhyCause from '../components/WhyCause.vue'
import { useResidentLink } from '../composables/useResidentLink'
import { useServiceDeskStore } from '../stores/serviceDesk'
import { compareSeverity } from '../stores/utils/alertEvaluators'
import { severityClass } from './serviceDeskStyles'

const desk = useServiceDeskStore()
const link = useResidentLink()
const statusFilter = ref('active')
const severityFilter = ref('all')

const visible = computed(() =>
  desk.tickets
    .filter((t) =>
      statusFilter.value === 'all'
        ? true
        : statusFilter.value === 'active'
          ? t.status !== 'resolved'
          : t.status === statusFilter.value
    )
    .filter((t) => severityFilter.value === 'all' || t.severity === severityFilter.value)
    .sort((a, b) => compareSeverity(a.severity, b.severity) || b.openedTick - a.openedTick)
)
</script>
