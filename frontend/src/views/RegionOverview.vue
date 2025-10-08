<template>
  <div class="h-screen flex flex-col">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Region Overview: {{ region?.name || 'Loading...' }}</h1>
      <div class="flex space-x-3 items-center">
        <!-- Tick Controls -->
        <div class="flex items-center space-x-3 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
          <!-- Clock Display -->
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
              Tick: {{ simulationStore.currentTick }}
            </span>
          </div>

          <!-- Play/Pause Button -->
          <button
            @click="togglePlayPause"
            class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md transition-colors"
            :title="simulationStore.isPaused ? 'Start auto-tick' : 'Pause auto-tick'"
          >
            <svg v-if="simulationStore.isPaused" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          </button>

          <!-- Manual Tick Button (Debug) -->
          <button
            @click="manualTick"
            class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium"
            title="Execute one tick manually (debug)"
          >
            ⚡ Tick
          </button>

          <!-- Reset Button -->
          <button
            @click="resetSimulation"
            class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
            title="Reset simulation"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <!-- Debug Toggle Button -->
        <button
          @click="showDebugPanel = !showDebugPanel"
          class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-medium"
          title="Toggle debug action panel"
        >
          🔧 Debug
        </button>

        <button
          @click="showEditModal = true"
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
        >
          Edit Region
        </button>
        <router-link
          :to="`/world/${worldId}/region/${regionId}/lots`"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Manage Lots & Households
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">Error: {{ error }}</p>
    </div>

    <!-- Debug Panel -->
    <DebugActionPanel
      v-if="showDebugPanel && !loading && !error"
      :characters="characters"
      @close="showDebugPanel = false"
    />

    <div v-else-if="lotsWithSpaces.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
      <p class="text-gray-500 dark:text-gray-300 mb-4">No lots in this region yet.</p>
      <router-link
        :to="`/world/${worldId}/region/${regionId}`"
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
        Go to Region to create lots
      </router-link>
    </div>

    <div v-else class="flex flex-1 overflow-hidden">
      <!-- Three Column Layout -->
      <div class="flex-1 flex gap-4 p-4 overflow-auto">
        <!-- Residential Column -->
        <LotColumn
          title="Residential"
          :lots="residentialLots"
          :world-id="worldId"
          :region-id="regionId"
          :expanded-lots="expandedLots"
          variant="blue"
          empty-message="No residential lots yet"
          @toggle-expanded="toggleLotRooms"
        />

        <!-- Community Column -->
        <LotColumn
          title="Community"
          :lots="communityLots"
          :world-id="worldId"
          :region-id="regionId"
          :expanded-lots="expandedLots"
          variant="green"
          empty-message="No community lots yet"
          @toggle-expanded="toggleLotRooms"
        />

        <!-- Transportation Column -->
        <div class="flex-1 flex flex-col">
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sticky top-0 z-10 pb-2">Transportation</h2>
          <div class="text-center py-8 text-gray-500 dark:text-gray-300">
            Coming soon
          </div>
        </div>
      </div>

      <!-- Right Sidebar - Activity Log & Characters -->
      <div class="w-80 flex flex-col space-y-4 p-4 overflow-hidden">
        <!-- Activity Log Panel -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex-1 flex flex-col overflow-hidden">
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
            <svg class="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Activity Log
          </h2>
          <div class="flex-1 overflow-y-auto space-y-2 text-xs">
            <div v-if="simulationStore.activityLog.length === 0" class="text-gray-500 dark:text-gray-400 text-center py-8">
              No activities yet. Click "Tick" to start.
            </div>
            <div
              v-for="(log, idx) in simulationStore.recentActivityLog"
              :key="`log-${log.tick}-${idx}`"
              class="bg-gray-50 dark:bg-gray-700 p-2 rounded border-l-2 border-purple-400"
            >
              <div class="flex justify-between items-start mb-1">
                <span class="font-mono font-semibold text-purple-600 dark:text-purple-400">
                  Tick {{ log.tick }}
                </span>
                <span class="text-gray-500 dark:text-gray-400 text-[10px]">
                  {{ new Date(log.timestamp).toLocaleTimeString() }}
                </span>
              </div>
              <div class="text-gray-700 dark:text-gray-300">
                <span class="font-medium">{{ getCharacterName(log.characterId) }}:</span>
                <span class="text-blue-600 dark:text-blue-400 font-semibold ml-1">{{ log.action }}</span>
              </div>
              <div v-if="log.details" class="text-gray-500 dark:text-gray-400 mt-1">
                {{ log.details }}
              </div>
            </div>
          </div>
        </div>

        <!-- Characters & Animals Panel -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex-1 flex flex-col overflow-hidden">
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Characters & Animals</h2>
          <div v-if="characters.length === 0 && animals.length === 0" class="text-sm text-gray-500">
            No characters or animals in this region yet.
          </div>
          <div v-else class="space-y-2 overflow-y-auto">
            <!-- Characters Section -->
            <div v-if="characters.length > 0">
              <h3 class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-2">Characters</h3>
              <CharacterListItem
                v-for="character in characters"
                :key="'char-' + character.id"
                :entity="character"
                type="character"
                :is-active="activeCharacter?.id === character.id && activeCharacterType === 'character'"
                @select="setActiveCharacter(character, 'character')"
              />
            </div>

            <!-- Animals Section -->
            <div v-if="animals.length > 0" :class="{ 'mt-4': characters.length > 0 }">
              <h3 class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-2">Animals</h3>
              <CharacterListItem
                v-for="animal in animals"
                :key="'animal-' + animal.id"
                :entity="animal"
                type="animal"
                :is-active="activeCharacter?.id === animal.id && activeCharacterType === 'animal'"
                :show-traits="true"
                @select="setActiveCharacter(animal, 'animal')"
              />
            </div>
          </div>
        </div>

        <!-- Active Character Panel -->
        <div v-if="activeCharacter" class="rounded-lg shadow-lg p-4 border-2" :class="activeCharacterType === 'animal' ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 dark:bg-blue-900 border-blue-300'">
          <div class="flex justify-between items-start mb-3">
            <h3 class="text-md font-bold text-gray-900 dark:text-gray-100">
              {{ activeCharacterType === 'animal' ? 'Active Animal' : 'Active Character' }}
            </h3>
            <button @click="clearActiveCharacter" class="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-2">
            <p class="font-semibold text-lg">
              {{ activeCharacterType === 'animal' ? '🐾' : '👤' }} {{ activeCharacter.name }}
            </p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Age: {{ activeCharacter.age }}</p>
            <div v-if="activeCharacterType === 'animal' && activeCharacter.traits && activeCharacter.traits.length > 0" class="text-sm text-gray-700 dark:text-gray-300">
              <span class="font-medium">Traits:</span> {{ activeCharacter.traits.join(', ') }}
            </div>
            <div v-if="activeCharacter.bio" class="mt-3 text-sm text-gray-700 bg-white p-3 rounded">
              {{ activeCharacter.bio.substring(0, 150) }}{{ activeCharacter.bio.length > 150 ? '...' : '' }}
            </div>
            <div v-else class="mt-3 text-sm text-gray-500 dark:text-gray-300 italic">
              No biography available.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Region Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">Edit Region</h2>
        <form @submit.prevent="saveRegion">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Region Name
            </label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter region name"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <input
              v-model="formData.kind"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., urban, rural, mountain"
            />
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeEditModal"
              :disabled="saving"
              class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gql } from 'graphql-request'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import LotColumn from '../components/LotColumn.vue'
import CharacterListItem from '../components/CharacterListItem.vue'
import DebugActionPanel from '../components/DebugActionPanel.vue'
import { client, queries } from '../graphql'
import { useSimulationStore } from '../stores/simulation'

const simulationStore = useSimulationStore()

const route = useRoute()
const worldId = computed(() => route.params.worldId)
const regionId = computed(() => route.params.regionId)

const lotsWithSpaces = ref([])
const world = ref(null)
const region = ref(null)
const characters = ref([])
const animals = ref([])
const activeCharacter = ref(null)
const activeCharacterType = ref(null)
const expandedLots = ref({})
const loading = ref(true)
const error = ref(null)
const showEditModal = ref(false)
const showDebugPanel = ref(false)
const formData = ref({ name: '', kind: '' })
const saving = ref(false)

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: 'Overview', to: '#' }
])

const residentialLots = computed(() =>
  lotsWithSpaces.value.filter(lot => lot.lotType === 'RESIDENTIAL')
)

const communityLots = computed(() =>
  lotsWithSpaces.value.filter(lot => lot.lotType === 'COMMUNITY')
)

const toggleLotRooms = (lotId) => {
  expandedLots.value[lotId] = !expandedLots.value[lotId]
}

const setActiveCharacter = (entity, type) => {
  activeCharacter.value = entity
  activeCharacterType.value = type
}

const clearActiveCharacter = () => {
  activeCharacter.value = null
  activeCharacterType.value = null
}

const getCharacterName = (characterId) => {
  const character = characters.value.find(c => c.id === characterId)
  const animal = animals.value.find(a => a.id === characterId)
  return character?.name || animal?.name || `Unknown (${characterId})`
}

const MUTATION_UPDATE_REGION = gql`
  mutation UpdateRegion($id: ID!, $name: String!, $kind: String!) {
    updateRegion(id: $id, name: $name, kind: $kind) {
      id
      name
      kind
    }
  }
`

const closeEditModal = () => {
  showEditModal.value = false
  formData.value = { name: '', kind: '' }
}

const saveRegion = async () => {
  try {
    saving.value = true
    await client.request(MUTATION_UPDATE_REGION, {
      id: regionId.value,
      name: formData.value.name,
      kind: formData.value.kind
    })
    closeEditModal()
    await loadData()
  } catch (e) {
    error.value = e.message
    alert('Error updating region: ' + e.message)
  } finally {
    saving.value = false
  }
}

const loadData = async () => {
  try {
    loading.value = true
    error.value = null

    const [worldData, regionsData, lotsData] = await Promise.all([
      client.request(queries.getWorld, { id: worldId.value }),
      client.request(queries.getRegions, { worldId: worldId.value }),
      client.request(queries.getLots, { regionId: regionId.value })
    ])

    world.value = worldData.world
    region.value = regionsData.regions.find(r => r.id === regionId.value)

    // Populate form data for editing
    if (region.value) {
      formData.value = {
        name: region.value.name,
        kind: region.value.kind
      }
    }

    // Fetch spaces for each lot
    const lots = lotsData.lots || []
    const lotsWithSpacesData = await Promise.all(
      lots.map(async (lot) => {
        try {
          const spacesData = await client.request(queries.getSpaces, { lotId: lot.id })
          return {
            ...lot,
            indoorRooms: spacesData.lot?.indoorRooms || [],
            outdoorAreas: spacesData.lot?.outdoorAreas || []
          }
        } catch (e) {
          console.error(`Error loading spaces for lot ${lot.id}:`, e)
          return {
            ...lot,
            indoorRooms: [],
            outdoorAreas: []
          }
        }
      })
    )

    lotsWithSpaces.value = lotsWithSpacesData

    // Fetch characters and animals in the region
    try {
      const regionData = await client.request(queries.getRegion, { id: regionId.value })
      characters.value = regionData.region?.characters || []
      animals.value = regionData.region?.animals || []
    } catch (e) {
      console.error('Error loading characters and animals:', e)
      characters.value = []
      animals.value = []
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ============================================
// SIMULATION CONTROLS
// ============================================

const togglePlayPause = () => {
  if (simulationStore.isPaused) {
    simulationStore.startAutoTick()
  } else {
    simulationStore.pauseAutoTick()
  }
}

const manualTick = () => {
  simulationStore.executeTick()

  // Log full Pinia state to console for debugging
  console.log('\n========== FULL PINIA STATE ==========')
  console.log(JSON.parse(JSON.stringify({
    currentTick: simulationStore.currentTick,
    isPaused: simulationStore.isPaused,
    characterStates: simulationStore.characterStates,
    activityLog: simulationStore.activityLog
  })))
  console.log('======================================\n')
}

const resetSimulation = () => {
  if (confirm('Reset simulation? This will clear all character states and activity logs.')) {
    simulationStore.resetSimulation()
  }
}

// Initialize characters when they load
watch(characters, async (newCharacters) => {
  for (const character of newCharacters) {
    // Initialize character in simulation store
    simulationStore.initializeCharacter(character)

    // Update character location if available
    if (character.location) {
      // Fetch the first indoor room for this lot to set as initial space
      try {
        const spacesData = await client.request(queries.getSpaces, { lotId: character.location.id })
        const firstIndoorRoom = spacesData.lot?.indoorRooms?.[0]

        if (firstIndoorRoom) {
          simulationStore.updateCharacterLocation(
            character.id,
            character.location.id,
            character.location.name,
            firstIndoorRoom.id,
            firstIndoorRoom.name
          )
        } else {
          // No indoor rooms, just set lot-level location
          simulationStore.updateCharacterLocation(
            character.id,
            character.location.id,
            character.location.name,
            null,
            null
          )
        }
      } catch (e) {
        console.error(`Error loading spaces for character ${character.id}:`, e)
        // Fallback to lot-level location only
        simulationStore.updateCharacterLocation(
          character.id,
          character.location.id,
          character.location.name,
          null,
          null
        )
      }
    }
  }
}, { immediate: true })

// Cleanup on unmount
onMounted(() => {
  loadData()

  // Cleanup interval on component unmount
  return () => {
    simulationStore.pauseAutoTick()
  }
})
</script>
