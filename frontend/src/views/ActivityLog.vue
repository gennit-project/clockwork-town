<template>
  <div class="h-screen flex flex-col">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Activity Log</h1>
      <div class="flex items-center space-x-3">
        <!-- Tick Display -->
        <div class="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2">
          <svg class="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
            Tick: {{ simulationStore.currentTick }}
          </span>
        </div>

        <button
          @click="clearLog"
          class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
          title="Clear activity log"
        >
          Clear Log
        </button>

        <router-link
          :to="`/world/${worldId}/region/${regionId}/overview`"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Back to Overview
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">Error: {{ error }}</p>
    </div>

    <div v-else class="flex-1 overflow-hidden">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <svg class="w-6 h-6 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            All Activity
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ simulationStore.activityLog.length }} entries
          </p>
        </div>

        <div v-if="simulationStore.activityLog.length === 0" class="flex-1 flex items-center justify-center">
          <div class="text-center text-gray-500 dark:text-gray-400">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-lg font-medium">No activities yet</p>
            <p class="text-sm mt-2">Click "Tick" on the Overview page to start the simulation</p>
          </div>
        </div>

        <div v-else class="flex-1 overflow-y-auto space-y-3">
          <div
            v-for="(log, idx) in simulationStore.recentActivityLog"
            :key="`log-${log.tick}-${idx}`"
            class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-l-4 border-purple-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div class="flex justify-between items-start mb-2">
              <span class="font-mono font-bold text-lg text-purple-600 dark:text-purple-400">
                Tick {{ log.tick }}
              </span>
              <span class="text-gray-500 dark:text-gray-400 text-xs">
                {{ new Date(log.timestamp).toLocaleString() }}
              </span>
            </div>
            <div class="text-gray-900 dark:text-gray-100">
              <span class="font-semibold text-base">{{ getCharacterName(log.characterId) }}:</span>
              <span class="text-blue-600 dark:text-blue-400 font-bold ml-2 text-base">{{ log.action }}</span>
            </div>
            <div v-if="log.details" class="text-gray-600 dark:text-gray-400 mt-2 text-sm">
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
