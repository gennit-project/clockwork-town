<template>
  <div class="h-screen flex flex-col">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Region Overview: {{ region?.name || 'Loading...' }}</h1>
      <div class="flex space-x-3 items-center">
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

    <div v-else class="flex-1 flex gap-4 p-4 overflow-auto">
      <!-- Three Column Layout -->
      <!-- Residential Column -->
      <LotColumn
        title="Residential"
        :lots="residentialLots"
        :world-id="worldId"
        :region-id="regionId"
        :expanded-lots="expandedLots"
        :characters-by-lot="charactersByLot"
        :characters-by-space="charactersBySpace"
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
        :characters-by-lot="charactersByLot"
        :characters-by-space="charactersBySpace"
        variant="green"
        empty-message="No community lots yet"
        @toggle-expanded="toggleLotRooms"
      />

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

const charactersByLot = computed(() => {
  const byLot = {}
  characters.value.forEach(char => {
    // Use simulation store for current location (reactive to movement)
    const charState = simulationStore.characterStates[char.id]
    const lotId = charState?.location?.lotId || char.location?.id

    if (lotId) {
      if (!byLot[lotId]) {
        byLot[lotId] = []
      }
      byLot[lotId].push(char)
    }
  })
  return byLot
})

const charactersBySpace = computed(() => {
  const bySpace = {}
  characters.value.forEach(char => {
    const charState = simulationStore.characterStates[char.id]
    if (charState?.location?.spaceId) {
      if (!bySpace[charState.location.spaceId]) {
        bySpace[charState.location.spaceId] = []
      }
      bySpace[charState.location.spaceId].push(char)
    }
  })
  return bySpace
})

const toggleLotRooms = (lotId) => {
  expandedLots.value[lotId] = !expandedLots.value[lotId]
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

    // Fetch spaces and items for each lot
    const lots = lotsData.lots || []
    const lotsWithSpacesData = await Promise.all(
      lots.map(async (lot) => {
        try {
          const spacesData = await client.request(queries.getSpacesWithItems, { lotId: lot.id })
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

    // Expand all lots by default to show rooms
    const expandedState = {}
    lotsWithSpacesData.forEach(lot => {
      expandedState[lot.id] = true
    })
    expandedLots.value = expandedState

    // Load world data into simulation store for pathfinding
    simulationStore.loadWorldData(lotsWithSpacesData, regionId.value)

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

// Initialize characters when they load (after world data is loaded)
watch(characters, (newCharacters) => {
  for (const character of newCharacters) {
    // Initialize character in simulation store
    simulationStore.initializeCharacter(character)

    // Update character location if available
    if (character.location) {
      // Find the first space in this lot from the loaded world data
      const lot = simulationStore.worldData.lots[character.location.id]

      if (lot && lot.spaceIds.length > 0) {
        // Get the first space
        const firstSpaceId = lot.spaceIds[0]
        const firstSpace = simulationStore.worldData.spaces[firstSpaceId]

        if (firstSpace) {
          simulationStore.updateCharacterLocation(
            character.id,
            regionId.value,
            character.location.id,
            character.location.name,
            firstSpace.id,
            firstSpace.name
          )
          console.log(`✅ Initialized ${character.name} at ${firstSpace.name} (${character.location.name})`)
        } else {
          console.error(`❌ Could not find space ${firstSpaceId} for ${character.name}`)
        }
      } else {
        console.error(`❌ Could not find lot ${character.location.id} for ${character.name} - world data may not be loaded yet`)
      }
    }
  }
})

onMounted(() => {
  loadData()
})
</script>
