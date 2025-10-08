<template>
  <div class="h-screen flex flex-col">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Region Overview: {{ region?.name || 'Loading...' }}</h1>
      <div class="flex space-x-3">
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

      <!-- Right Sidebar - Characters & Animals List -->
      <div class="w-80 space-y-4 p-4 overflow-auto">
        <!-- Characters & Animals Panel -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Characters & Animals</h2>
          <div v-if="characters.length === 0 && animals.length === 0" class="text-sm text-gray-500">
            No characters or animals in this region yet.
          </div>
          <div v-else class="space-y-2">
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
        <div v-if="activeCharacter" class="rounded-lg shadow-lg p-4 border-2" :class="activeCharacterType === 'animal' ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-300'">
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { gql } from 'graphql-request'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import LotColumn from '../components/LotColumn.vue'
import CharacterListItem from '../components/CharacterListItem.vue'
import { client, queries } from '../graphql'

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

onMounted(loadData)
</script>
