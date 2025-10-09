<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
    <!-- Left Sidebar -->
    <aside class="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-4">
      <router-link
        to="/"
        class="p-3 rounded-lg hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-700': $route.path === '/' || ($route.path.startsWith('/world') && !$route.path.startsWith('/library')) }"
        title="Worlds"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </router-link>

      <router-link
        to="/library"
        class="p-3 rounded-lg hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-700': $route.path.startsWith('/library') }"
        title="Library"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      </router-link>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <nav class="bg-white dark:bg-gray-800 shadow-sm">
        <div class="mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <span class="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-white">
                Clockwork Town
              </span>
            </div>
            <div class="flex items-center space-x-3">
              <!-- Activity Log Button -->
              <button
                @click="showActivityLog = !showActivityLog"
                class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
                title="View Activity Log"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Activity Log ({{ simulationStore.activityLog.length }})</span>
              </button>
              <!-- Tick Controls -->
              <div class="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                <!-- Clock Display -->
                <div class="flex items-center space-x-1.5">
                  <svg class="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {{ simulationStore.currentTick }}
                  </span>
                </div>

                <!-- Play/Pause Button -->
                <button
                  @click="togglePlayPause"
                  class="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded transition-colors"
                  :title="simulationStore.isPaused ? 'Start auto-tick' : 'Pause auto-tick'"
                >
                  <svg v-if="simulationStore.isPaused" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                </button>

                <!-- Manual Tick Button -->
                <button
                  @click="manualTick"
                  class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1.5 rounded text-xs font-medium"
                  title="Execute one tick manually"
                >
                  ⚡
                </button>

                <!-- Reset Button -->
                <button
                  @click="resetSimulation"
                  class="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded"
                  title="Reset simulation"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              <!-- Dark Mode Toggle -->
              <button
                @click="toggleDarkMode"
                class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
              >
                <!-- Sun icon (shown in dark mode) -->
                <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <!-- Moon icon (shown in light mode) -->
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main content area with right sidebar -->
      <div class="flex flex-1 overflow-hidden">
        <main class="flex-1 w-full mx-auto py-6 sm:px-6 lg:px-8 overflow-auto">
          <router-view />
        </main>

        <!-- Right Sidebar - Characters & Animals -->
        <aside v-if="currentRegionId" class="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Characters & Animals</h2>
          <div v-if="regionCharacters.length === 0 && regionAnimals.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
            No characters or animals in this region yet.
          </div>
          <div v-else class="space-y-4">
            <!-- Characters Section -->
            <div v-if="regionCharacters.length > 0">
              <h3 class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-2">Characters ({{ regionCharacters.length }})</h3>
              <div class="space-y-2">
                <div
                  v-for="character in regionCharacters"
                  :key="character.id"
                  class="p-3 rounded-lg cursor-pointer transition-all"
                  :class="simulationStore.activeCharacterId === character.id
                    ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-400 dark:border-blue-500 shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'"
                  @click="selectCharacter(character)"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                      <p class="font-medium text-gray-900 dark:text-gray-100">{{ character.name }}, {{ character.age }}</p>
                    </div>
                    <span class="text-lg">👤</span>
                  </div>
                  <div class="text-xs space-y-1">
                    <div class="flex items-center text-gray-600 dark:text-gray-400">
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{{ getCharacterLocation(character.id) }}</span>
                    </div>
                    <div class="flex items-center text-purple-600 dark:text-purple-400">
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{{ getCharacterStatus(character.id) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Animals Section -->
            <div v-if="regionAnimals.length > 0">
              <h3 class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-2">Animals ({{ regionAnimals.length }})</h3>
              <div class="space-y-2">
                <div
                  v-for="animal in regionAnimals"
                  :key="animal.id"
                  class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer transition-colors"
                  @click="selectAnimal(animal)"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                      <p class="font-medium text-gray-900 dark:text-gray-100">{{ animal.name }}, {{ animal.age }}</p>
                    </div>
                    <span class="text-lg">🐾</span>
                  </div>
                  <div v-if="animal.traits && animal.traits.length > 0" class="text-xs text-gray-600 dark:text-gray-400">
                    {{ animal.traits.join(', ') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Activity Log Modal -->
    <div v-if="showActivityLog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" @click.self="showActivityLog = false">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Activity Log</h2>
          <button @click="showActivityLog = false" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="simulationStore.activityLog.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
            No activities recorded yet. Click the tick button to simulate!
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(entry, index) in simulationStore.recentActivityLog"
              :key="index"
              class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ entry.action }} - {{ entry.details }}
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Character: {{ entry.characterId }} | Tick: {{ entry.tick }}
                  </p>
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ new Date(entry.timestamp).toLocaleTimeString() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Character Detail Panel (Lower Left Corner) -->
    <CharacterDetailPanel
      v-if="selectedCharacterForPanel"
      :character="selectedCharacterForPanel"
      @close="selectedCharacterForPanel = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDarkMode } from './composables/useDarkMode'
import { useSimulationStore } from './stores/simulation'
import { client, queries } from './graphql'
import CharacterDetailPanel from './components/CharacterDetailPanel.vue'

const route = useRoute()
const router = useRouter()
const { isDark, toggle: toggleDarkMode } = useDarkMode()
const simulationStore = useSimulationStore()

const showActivityLog = ref(false)
const regionCharacters = ref([])
const regionAnimals = ref([])
const selectedCharacterForPanel = ref(null)

const currentRegionId = computed(() => route.params.regionId)

const togglePlayPause = () => {
  if (simulationStore.isPaused) {
    simulationStore.startAutoTick()
  } else {
    simulationStore.pauseAutoTick()
  }
}

const manualTick = () => {
  simulationStore.executeTick()
}

const resetSimulation = () => {
  if (confirm('Reset simulation? This will clear all character states and activity logs.')) {
    simulationStore.resetSimulation()
  }
}

// Load characters and animals for the current region
const loadRegionData = async () => {
  if (!currentRegionId.value) {
    regionCharacters.value = []
    regionAnimals.value = []
    return
  }

  try {
    const regionData = await client.request(queries.getRegion, { id: currentRegionId.value })
    regionCharacters.value = regionData.region?.characters || []
    regionAnimals.value = regionData.region?.animals || []
  } catch (e) {
    console.error('Failed to load region data:', e)
    regionCharacters.value = []
    regionAnimals.value = []
  }
}

// Watch for region changes
watch(currentRegionId, () => {
  loadRegionData()
}, { immediate: true })

// Character/Animal selection - navigate to their location and show panel
const selectCharacter = (character) => {
  // Set as active character
  simulationStore.setActiveCharacter(character.id)

  // Show character detail panel
  selectedCharacterForPanel.value = character

  // Get character's location from simulation store
  const charState = simulationStore.characterStates[character.id]
  if (charState?.location?.spaceId) {
    // Navigate to the space detail page
    const worldId = route.params.worldId
    const regionId = route.params.regionId
    const lotId = charState.location.lotId
    const spaceId = charState.location.spaceId

    router.push(`/world/${worldId}/region/${regionId}/lot/${lotId}/space/${spaceId}`)
  } else {
    console.warn('Character location not found in simulation state')
  }
}

const selectAnimal = (animal) => {
  console.log('Selected animal:', animal)
  // TODO: Navigate to animal location when implemented
}

// Get character location from simulation store (or fallback to API data)
const getCharacterLocation = (characterId) => {
  // First check simulation store (for reactive updates during simulation)
  const charState = simulationStore.characterStates[characterId]
  if (charState?.location?.lotName) {
    return charState.location.lotName
  }

  // Fallback to character's raw location from API (for initial display before simulation initializes)
  const character = regionCharacters.value.find(c => c.id === characterId)
  if (character?.location?.name) {
    return character.location.name
  }

  return 'Unknown location'
}

// Get character status/activity from simulation store
const getCharacterStatus = (characterId) => {
  const charState = simulationStore.characterStates[characterId]
  if (charState?.currentAction) {
    // Convert action name to readable format (e.g., "chat_friend" -> "Chat Friend")
    return charState.currentAction
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return 'Idle'
}
</script>
