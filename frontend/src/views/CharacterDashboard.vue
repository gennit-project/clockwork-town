<template>
  <div class="p-4">
    <div class="mb-3 flex items-center gap-2 text-sm">
      <router-link :to="overviewLink" class="text-gf-blue hover:underline">Region</router-link>
      <span class="text-gf-text-faint">/</span>
      <span class="text-gf-text-weak">Residents</span>
      <span class="text-gf-text-faint">/</span>
      <span class="text-gf-text">{{ displayName }}</span>
    </div>

    <!-- Resident header -->
    <Panel class="mb-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gf-surface-3 text-lg">👤</div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-semibold text-gf-text">{{ displayName }}</h1>
              <span v-if="age !== null" class="text-sm text-gf-text-faint">· {{ age }} y/o</span>
              <span class="flex items-center gap-1 text-xs" :class="statusTextClass">
                <span class="h-1.5 w-1.5 rounded-full" :class="statusDotClass" />
                {{ statusLabel }}
              </span>
            </div>
            <p class="mt-0.5 text-xs text-gf-text-faint">Resident ID: {{ shortId }}</p>
            <div v-if="traits.length" class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="t in traits"
                :key="t"
                class="rounded border border-gf-border bg-gf-surface-2 px-2 py-0.5 text-[11px] text-gf-text-weak"
              >
                {{ t }}
              </span>
            </div>
          </div>
        </div>
        <div class="rounded border border-gf-border bg-gf-bg px-3 py-2">
          <p class="text-[11px] uppercase tracking-wider text-gf-text-faint">Location</p>
          <p class="mt-0.5 text-sm text-gf-text">{{ locationText }}</p>
          <button
            v-if="canGoToLocation"
            class="mt-1.5 flex items-center gap-1 rounded border border-gf-border bg-gf-blue/15 px-2 py-1 text-xs text-gf-blue hover:bg-gf-blue/25"
            @click="goToLocation"
          >
            Go to location →
          </button>
        </div>
      </div>
    </Panel>

    <div v-if="!state" class="rounded border border-gf-border bg-gf-surface px-3 py-8 text-center text-sm text-gf-text-faint">
      <span v-if="loading">Loading resident…</span>
      <span v-else>This resident isn't loaded in the current simulation.</span>
    </div>

    <template v-else>
      <!-- Stat row -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Happiness" :value="(happiness * 100).toFixed(0)" unit="%" :status="status" sub="mean(needs)" />
        <StatTile label="Current action" :value="actionVerb" sub="right now" />
        <StatTile
          label="Lowest need"
          :value="lowestNeed.name"
          :status="lowestNeed.value < 0.3 ? 'critical' : lowestNeed.value < 0.5 ? 'warning' : 'healthy'"
          :sub="`${(lowestNeed.value * 100).toFixed(0)}%`"
        />
      </div>

      <!-- Happiness over time -->
      <Panel title="Happiness / time" :status="status" :padded="false" class="mt-3 h-72">
        <CharacterHappinessChart :history="happinessHistory" :names="seriesNames" />
      </Panel>

      <!-- Needs -->
      <Panel title="Needs" :padded="false" class="mt-3 h-72">
        <NeedsBarGauge :needs="NEED_NAMES" :values="state.needs" />
      </Panel>

      <!-- Need trend over time -->
      <Panel title="Need trend / time" class="mt-3">
        <NeedTrendHeatmap :history="happinessHistory" :character-id="characterId || ''" :needs="NEED_NAMES" />
      </Panel>

      <!-- Relationships -->
      <Panel title="Relationships" class="mt-3">
        <ResidentRelationships
          :relationships="state.relationships || []"
          :names="residentNames"
          :now-iso="nowIso"
          @select="goToResident"
        />
      </Panel>

      <!-- Timeline -->
      <Panel title="Timeline" class="mt-3">
        <MemoryTimeline
          :memories="state.longTermMemories || []"
          :relationships="state.relationships || []"
          :names="residentNames"
          :now-iso="nowIso"
          @select="goToResident"
        />
      </Panel>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Panel from '../components/Panel.vue'
import StatTile from '../components/StatTile.vue'
import CharacterHappinessChart from '../components/charts/CharacterHappinessChart.vue'
import NeedsBarGauge from '../components/charts/NeedsBarGauge.vue'
import ResidentRelationships from '../components/ResidentRelationships.vue'
import MemoryTimeline from '../components/MemoryTimeline.vue'
import NeedTrendHeatmap from '../components/charts/NeedTrendHeatmap.vue'
import { useSimulationStore } from '../stores/simulation'
import { useTownDataLoader } from '../composables/useTownDataLoader'
import { getCharacterStatusText } from '../composables/useCharacterStatus'
import { computeCharacterHappiness, happinessStatus } from '../stores/utils/happinessMetrics'
import { client, queries } from '../graphql'
import type { NeedName } from '../stores/types'

const NEED_NAMES: NeedName[] = [
  'food', 'sleep', 'bladder', 'hygiene', 'health', 'friends', 'family', 'romance', 'fulfillment'
]

const route = useRoute()
const router = useRouter()
const simulationStore = useSimulationStore()
const { characterStates, happinessHistory } = storeToRefs(simulationStore)
const { load, loading } = useTownDataLoader()

const age = ref<number | null>(null)
const fetchedTraits = ref<string[]>([])

function normalize(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

const worldId = computed(() => normalize(route.params.worldId))
const regionId = computed(() => normalize(route.params.regionId))
const characterId = computed(() => normalize(route.params.characterId))

const state = computed(() => (characterId.value ? characterStates.value[characterId.value] : undefined))

const displayName = computed(() => state.value?.name || 'Resident')
const shortId = computed(() => (characterId.value || '').slice(0, 8))
const traits = computed(() => state.value?.traits?.length ? state.value.traits : fetchedTraits.value)

const happiness = computed(() => (state.value ? computeCharacterHappiness(state.value.needs) : 0))
const status = computed(() => happinessStatus(happiness.value))

const statusLabel = computed(() => (status.value === 'critical' ? 'At risk' : status.value === 'warning' ? 'Degraded' : 'Active'))
const statusDotClass = computed(() => (status.value === 'critical' ? 'bg-gf-red' : status.value === 'warning' ? 'bg-gf-amber' : 'bg-gf-green'))
const statusTextClass = computed(() => (status.value === 'critical' ? 'text-gf-red' : status.value === 'warning' ? 'text-gf-amber' : 'text-gf-green'))

const actionVerb = computed(() => getCharacterStatusText(state.value))

const nowIso = computed(() => simulationStore.simulationDateTime.iso)

const residentNames = computed(() => {
  const map: Record<string, string> = {}
  for (const [id, s] of Object.entries(characterStates.value)) {
    map[id] = s.name
  }
  return map
})

function goToResident(id: string) {
  if (worldId.value && regionId.value) {
    router.push(`/world/${worldId.value}/region/${regionId.value}/character/${id}`)
  }
}

const lowestNeed = computed(() => {
  let lowest = { name: 'food' as NeedName, value: Infinity }
  if (state.value) {
    for (const need of NEED_NAMES) {
      const value = state.value.needs[need]
      if (value < lowest.value) {
        lowest = { name: need, value }
      }
    }
  }
  return lowest.value === Infinity ? { name: 'food' as NeedName, value: 0 } : lowest
})

const seriesNames = computed(() => (characterId.value ? { [characterId.value]: displayName.value } : {}))

const locationText = computed(() => {
  const loc = state.value?.location
  if (!loc?.lotName) {
    return 'Unknown'
  }
  return loc.spaceName ? `${loc.lotName} → ${loc.spaceName}` : loc.lotName
})

const canGoToLocation = computed(() =>
  Boolean(worldId.value && regionId.value && state.value?.location?.lotId && state.value?.location?.spaceId)
)

const overviewLink = computed(() =>
  worldId.value && regionId.value ? `/world/${worldId.value}/region/${regionId.value}/overview` : '/'
)

function goToLocation() {
  const loc = state.value?.location
  if (worldId.value && regionId.value && loc?.lotId && loc?.spaceId) {
    router.push(`/world/${worldId.value}/region/${regionId.value}/lot/${loc.lotId}/space/${loc.spaceId}`)
  }
}

async function loadCharacter() {
  if (!characterId.value) {
    return
  }
  if (!state.value && worldId.value && regionId.value) {
    await load(worldId.value, regionId.value)
  }
  try {
    const data = await client.request<{ character?: { age?: number; traits?: string[] } | null }>(
      queries.getCharacter,
      { id: characterId.value }
    )
    age.value = data.character?.age ?? null
    fetchedTraits.value = data.character?.traits ?? []
  } catch {
    // header enrichment is best-effort
  }
}

onMounted(loadCharacter)
watch(characterId, loadCharacter)
</script>
