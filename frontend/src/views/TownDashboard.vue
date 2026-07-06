<template>
  <div class="p-4">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gf-text">Town Health</h1>
        <p class="text-xs text-gf-text-faint">
          {{ simulationStore.formattedSimulationDateTime }} · tick {{ simulationStore.currentTick }}
          <span v-if="loading"> · loading…</span>
        </p>
      </div>
    </div>

    <div v-if="error" class="mb-3 rounded border border-gf-red/40 bg-gf-red/10 px-3 py-2 text-sm text-gf-red">
      {{ error }}
    </div>

    <!-- Stat row -->
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatTile label="Population" :value="population" sub="characters online" />
      <StatTile
        label="Mean Happiness"
        :value="(townHappiness * 100).toFixed(1)"
        unit="%"
        :status="townStatus"
        sub="mean(needs) across town"
      />
      <StatTile
        label="SLA Breaches"
        :value="alerts.length"
        :status="alerts.length > 0 ? 'critical' : 'healthy'"
        sub="happiness < 30%"
      />
      <StatTile
        label="Degraded"
        :value="warnings.length"
        :status="warnings.length > 0 ? 'warning' : 'healthy'"
        sub="happiness < 50%"
      />
    </div>

    <!-- Time-series + needs -->
    <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Panel title="Town Happiness / time" :status="townStatus" :padded="false" class="h-72 lg:col-span-2">
        <TownHappinessChart :history="happinessHistory" />
      </Panel>
      <Panel title="Mean Needs" :padded="false" class="h-72">
        <NeedsBarGauge :needs="NEED_NAMES" :values="averageNeeds" />
      </Panel>
    </div>

    <Panel title="Character Happiness / time" :padded="false" class="mt-3 h-80">
      <CharacterHappinessChart :history="happinessHistory" :names="characterNames" />
    </Panel>

    <!-- Graph + incidents -->
    <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Panel title="Relationship Graph" :padded="false" class="h-[28rem] lg:col-span-2">
        <RelationshipGraph :nodes="graphNodes" :links="graphLinks" />
      </Panel>
      <Panel title="Incidents" class="h-[28rem]">
        <div v-if="incidents.length === 0" class="flex h-full flex-col items-center justify-center text-center">
          <span class="text-2xl">✅</span>
          <span class="mt-2 text-sm text-gf-green">All systems nominal</span>
          <span class="mt-1 text-xs text-gf-text-faint">No characters below threshold</span>
        </div>
        <ul v-else class="space-y-2 overflow-y-auto">
          <li
            v-for="character in incidents"
            :key="character.id"
            class="flex items-center justify-between rounded border-l-2 bg-gf-surface-2 px-3 py-2"
            :class="character.status === 'critical' ? 'border-gf-red' : 'border-gf-amber'"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gf-text">{{ character.name }}</p>
              <p class="text-xs text-gf-text-faint">
                low {{ character.lowestNeed.name }} · {{ (character.lowestNeed.value * 100).toFixed(0) }}%
              </p>
            </div>
            <span
              class="font-mono text-sm font-semibold"
              :class="character.status === 'critical' ? 'text-gf-red' : 'text-gf-amber'"
            >
              {{ (character.happiness * 100).toFixed(0) }}%
            </span>
          </li>
        </ul>
      </Panel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import Panel from '../components/Panel.vue'
import StatTile from '../components/StatTile.vue'
import TownHappinessChart from '../components/charts/TownHappinessChart.vue'
import CharacterHappinessChart from '../components/charts/CharacterHappinessChart.vue'
import NeedsBarGauge from '../components/charts/NeedsBarGauge.vue'
import RelationshipGraph, { type GraphLink, type GraphNode } from '../components/charts/RelationshipGraph.vue'
import { useSimulationStore } from '../stores/simulation'
import { useTownDataLoader } from '../composables/useTownDataLoader'
import { useTownMetrics } from '../composables/useTownMetrics'

const route = useRoute()
const simulationStore = useSimulationStore()
const { characterStates } = storeToRefs(simulationStore)
const { load, loading, error } = useTownDataLoader()
const {
  NEED_NAMES,
  characters,
  population,
  townHappiness,
  townStatus,
  alerts,
  warnings,
  averageNeeds,
  happinessHistory
} = useTownMetrics()

function normalizeParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

const worldId = computed(() => normalizeParam(route.params.worldId))
const regionId = computed(() => normalizeParam(route.params.regionId))

const characterNames = computed(() =>
  Object.fromEntries(characters.value.map((c) => [c.id, c.name]))
)

// Incidents = anyone in warning or critical, worst first.
const incidents = computed(() =>
  [...alerts.value, ...warnings.value].sort((a, b) => a.happiness - b.happiness)
)

const graphNodes = computed<GraphNode[]>(() =>
  characters.value.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    happiness: c.happiness
  }))
)

const graphLinks = computed<GraphLink[]>(() => {
  const ids = new Set(Object.keys(characterStates.value))
  const seen = new Map<string, GraphLink & { count: number }>()

  for (const [fromId, state] of Object.entries(characterStates.value)) {
    for (const rel of state.relationships || []) {
      const toId = rel.toCharacterId
      if (rel.isDeceasedTarget || !ids.has(toId) || fromId === toId) {
        continue
      }
      // Sort so both directions land on the same undirected edge, and we can
      // record each side's label (mother vs daughter) independently.
      const [a, b] = [fromId, toId].sort()
      const key = `${a}::${b}`
      const warmth = Math.max(0, Math.min(1, rel.shortTermScore))
      const bond = Math.max(0, Math.min(1, rel.longTermScore))
      const labels = (rel.labels ?? []).filter(Boolean)

      let link = seen.get(key)
      if (!link) {
        link = { source: a, target: b, score: 0, bond: 0, count: 0 }
        seen.set(key, link)
      }
      link.score = (link.score * link.count + warmth) / (link.count + 1)
      link.bond = ((link.bond ?? 0) * link.count + bond) / (link.count + 1)
      link.count += 1
      if (labels.length) {
        // A relationship can carry several labels. labelsForward = source's roles
        // toward target (e.g. ["colleague","friend"]); labelsBackward = the reverse.
        const side = fromId === a ? 'labelsForward' : 'labelsBackward'
        link[side] = [...new Set([...(link[side] ?? []), ...labels])]
      }
    }
  }

  return [...seen.values()].map(({ count: _count, ...link }) => link)
})

async function ensureLoaded() {
  if (worldId.value && regionId.value) {
    await load(worldId.value, regionId.value)
  }
}

onMounted(ensureLoaded)
watch([worldId, regionId], ensureLoaded)
</script>
