<template>
  <div class="h-screen flex flex-col p-4">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-xl font-semibold text-gf-text">Activity Log</h1>
      <div class="flex items-center space-x-3">
        <!-- Tick Display -->
        <div class="bg-gf-surface-2 px-4 py-2 rounded flex items-center space-x-2">
          <svg class="w-5 h-5 text-gf-text-weak" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-mono text-sm font-semibold text-gf-text">
            Tick: {{ simulationStore.currentTick }}
          </span>
        </div>

        <button
          @click="clearLog"
          class="rounded border border-gf-border bg-gf-red/15 px-3 py-1.5 text-sm text-gf-red hover:bg-gf-red/25"
          title="Clear activity log"
        >
          Clear Log
        </button>

        <router-link
          :to="`/world/${worldId}/region/${regionId}/overview`"
          class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25"
        >
          Back to Overview
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gf-text-faint">Loading...</p>
    </div>

    <div v-else-if="error" class="rounded border border-gf-red/40 bg-gf-red/10 p-4">
      <p class="text-gf-red">Error: {{ error }}</p>
    </div>

    <div v-else class="flex-1 overflow-hidden">
      <div class="bg-gf-surface border border-gf-border rounded p-6 h-full flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gf-text flex items-center">
            <svg class="w-6 h-6 mr-2 text-gf-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            All Activity
          </h2>
          <p class="text-sm text-gf-text-weak">
            {{ simulationStore.activityLog.length }} entries
          </p>
        </div>

        <div v-if="simulationStore.activityLog.length === 0" class="flex-1 flex items-center justify-center">
          <div class="text-center text-gf-text-faint">
            <svg class="w-16 h-16 mx-auto mb-4 text-gf-text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-lg font-medium">No activities yet</p>
            <p class="text-sm mt-2">Click "Tick" on the Overview page to start the simulation</p>
          </div>
        </div>

        <div v-else class="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
          <div
            v-for="(log, idx) in simulationStore.recentActivityLog"
            :key="`log-${log.tick}-${idx}`"
            class="p-2 rounded border-l-2 border-gf-purple hover:bg-gf-surface-2 transition-colors"
          >
            <div class="flex justify-between items-start mb-1">
              <span class="font-bold text-gf-purple">
                Tick {{ log.tick }}
              </span>
              <span class="text-gf-text-faint">
                {{ new Date(log.timestamp).toLocaleString() }}
              </span>
            </div>
            <div class="text-gf-text">
              <span class="font-semibold">{{ getCharacterName(log.characterId) }}:</span>
              <span class="text-gf-blue font-bold ml-2">{{ log.action }}</span>
            </div>
            <div v-if="log.details" class="text-gf-text-weak mt-1">
              {{ log.details }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import { client, queries } from '../graphql'
import { useSimulationStore } from '../stores/simulation'
import { useRouteParams } from '../composables/useRouteParams'

interface WorldSummary {
  id: string
  name: string
}

interface RegionSummary {
  id: string
  name: string
}

interface CharacterSummary {
  id: string
  name: string
}

interface AnimalSummary {
  id: string
  name: string
}

interface GetWorldResult {
  world: WorldSummary | null
}

interface GetRegionsResult {
  regions: RegionSummary[]
}

interface GetRegionResult {
  region?: {
    characters?: CharacterSummary[]
    animals?: AnimalSummary[]
  } | null
}

const simulationStore = useSimulationStore()

const { worldId, regionId } = useRouteParams()

const world = ref<WorldSummary | null>(null)
const region = ref<RegionSummary | null>(null)
const characters = ref<CharacterSummary[]>([])
const animals = ref<AnimalSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: 'Overview', to: `/world/${worldId.value}/region/${regionId.value}/overview` },
  { label: 'Activity Log', to: '#' }
])

const getCharacterName = (characterId: string): string => {
  const character = characters.value.find((entry) => entry.id === characterId)
  const animal = animals.value.find((entry) => entry.id === characterId)
  return character?.name || animal?.name || `Unknown (${characterId})`
}

const clearLog = () => {
  if (confirm('Clear all activity log entries? This cannot be undone.')) {
    simulationStore.activityLog = []
  }
}

const loadData = async () => {
  try {
    if (!worldId.value || !regionId.value) {
      error.value = 'Missing route parameters'
      return
    }

    loading.value = true
    error.value = null

    const [worldData, regionsData] = await Promise.all([
      client.request<GetWorldResult>(queries.getWorld, { id: worldId.value }),
      client.request<GetRegionsResult>(queries.getRegions, { worldId: worldId.value })
    ])

    world.value = worldData.world
    region.value = regionsData.regions.find((entry) => entry.id === regionId.value) || null

    // Fetch characters and animals in the region
    try {
      const regionData = await client.request<GetRegionResult>(queries.getRegion, { id: regionId.value })
      characters.value = regionData.region?.characters || []
      animals.value = regionData.region?.animals || []
    } catch (e: unknown) {
      console.error('Error loading characters and animals:', e)
      characters.value = []
      animals.value = []
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load activity log data'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadData()
})
</script>
