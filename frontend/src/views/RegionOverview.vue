<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Region Overview: {{ region?.name || 'Loading...' }}</h1>
      <router-link
        :to="`/world/${worldId}/region/${regionId}/lots`"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Manage Lots & Households
      </router-link>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">Error: {{ error }}</p>
    </div>

    <div v-else-if="lotsWithSpaces.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
      <p class="text-gray-500 mb-4">No lots in this region yet.</p>
      <router-link
        :to="`/world/${worldId}/region/${regionId}`"
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
        Go to Region to create lots
      </router-link>
    </div>

    <div v-else class="flex gap-6">
      <!-- Main content area -->
      <div class="flex-1">
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
      <div
        v-for="lot in lotsWithSpaces"
        :key="lot.id"
        class="bg-white rounded-lg shadow-lg overflow-hidden"
      >
        <!-- Lot Header -->
        <div class="bg-blue-600 text-white p-4">
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-xl font-bold">{{ lot.name }}</h2>
              <p class="text-sm text-blue-100">{{ lot.lotType }}</p>
            </div>
            <router-link
              :to="`/world/${worldId}/region/${regionId}/lot/${lot.id}`"
              class="text-white hover:text-blue-100"
              title="View Details"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </router-link>
          </div>
        </div>

        <!-- Spaces Content -->
        <div class="p-4 bg-gray-50">
          <!-- Show/Hide Rooms Toggle -->
          <div v-if="lot.indoorRooms.length > 0 || lot.outdoorAreas.length > 0" class="mb-3">
            <button
              @click="toggleLotRooms(lot.id)"
              class="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {{ expandedLots[lot.id] ? 'Hide rooms' : 'Show rooms' }}
            </button>
          </div>

          <!-- Collapsible Rooms Section -->
          <div v-show="expandedLots[lot.id]">
            <!-- Indoor Rooms -->
            <div v-if="lot.indoorRooms.length > 0" class="mb-4">
              <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Indoor Rooms ({{ lot.indoorRooms.length }})
              </h3>
              <div class="space-y-2">
                <router-link
                  v-for="room in lot.indoorRooms"
                  :key="room.id"
                  :to="`/world/${worldId}/region/${regionId}/lot/${lot.id}/space/${room.id}`"
                  class="block bg-white border-2 border-blue-200 rounded p-3 hover:border-blue-400 transition-colors cursor-pointer"
                >
                  <p class="font-medium text-sm text-gray-900">{{ room.name }}</p>
                  <p class="text-xs text-gray-600 mt-1">{{ room.description }}</p>
                </router-link>
              </div>
            </div>

            <!-- Outdoor Areas -->
            <div v-if="lot.outdoorAreas.length > 0">
              <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Outdoor Areas ({{ lot.outdoorAreas.length }})
              </h3>
              <div class="space-y-2">
                <router-link
                  v-for="area in lot.outdoorAreas"
                  :key="area.id"
                  :to="`/world/${worldId}/region/${regionId}/lot/${lot.id}/space/${area.id}`"
                  class="block bg-white border-2 border-green-200 rounded p-3 hover:border-green-400 transition-colors cursor-pointer"
                >
                  <p class="font-medium text-sm text-gray-900">{{ area.name }}</p>
                  <p class="text-xs text-gray-600 mt-1">{{ area.description }}</p>
                </router-link>
              </div>
            </div>
          </div>

          <!-- No Spaces Message -->
          <div v-if="lot.indoorRooms.length === 0 && lot.outdoorAreas.length === 0" class="text-center py-6">
            <p class="text-sm text-gray-500">No spaces yet</p>
            <router-link
              :to="`/world/${worldId}/region/${regionId}/lot/${lot.id}`"
              class="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              Add spaces →
            </router-link>
          </div>
        </div>
      </div>
        </div>
      </div>

      <!-- Right Sidebar - Characters & Animals List -->
      <div class="w-80 space-y-4">
        <!-- Characters & Animals Panel -->
        <div class="bg-white rounded-lg shadow-lg p-4">
          <h2 class="text-lg font-bold text-gray-900 mb-3">Characters & Animals</h2>
          <div v-if="characters.length === 0 && animals.length === 0" class="text-sm text-gray-500">
            No characters or animals in this region yet.
          </div>
          <div v-else class="space-y-2">
            <!-- Characters Section -->
            <div v-if="characters.length > 0">
              <h3 class="text-xs font-semibold text-gray-600 uppercase mb-2">Characters</h3>
              <button
                v-for="character in characters"
                :key="'char-' + character.id"
                @click="setActiveCharacter(character, 'character')"
                class="w-full text-left p-3 rounded hover:bg-blue-50 transition-colors border border-gray-200 mb-2"
                :class="{ 'bg-blue-100 border-blue-400': activeCharacter?.id === character.id && activeCharacterType === 'character' }"
              >
                <p class="font-medium text-gray-900">👤 {{ character.name }}</p>
                <p class="text-xs text-gray-600">Age: {{ character.age }}</p>
              </button>
            </div>

            <!-- Animals Section -->
            <div v-if="animals.length > 0" :class="{ 'mt-4': characters.length > 0 }">
              <h3 class="text-xs font-semibold text-gray-600 uppercase mb-2">Animals</h3>
              <button
                v-for="animal in animals"
                :key="'animal-' + animal.id"
                @click="setActiveCharacter(animal, 'animal')"
                class="w-full text-left p-3 rounded hover:bg-amber-50 transition-colors border border-gray-200 mb-2"
                :class="{ 'bg-amber-100 border-amber-400': activeCharacter?.id === animal.id && activeCharacterType === 'animal' }"
              >
                <p class="font-medium text-gray-900">🐾 {{ animal.name }}</p>
                <p class="text-xs text-gray-600">Age: {{ animal.age }}</p>
                <p v-if="animal.traits && animal.traits.length > 0" class="text-xs text-gray-500">
                  {{ animal.traits.join(', ') }}
                </p>
              </button>
            </div>
          </div>
        </div>

        <!-- Active Character Panel -->
        <div v-if="activeCharacter" class="rounded-lg shadow-lg p-4 border-2" :class="activeCharacterType === 'animal' ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-300'">
          <div class="flex justify-between items-start mb-3">
            <h3 class="text-md font-bold text-gray-900">
              {{ activeCharacterType === 'animal' ? 'Active Animal' : 'Active Character' }}
            </h3>
            <button @click="clearActiveCharacter" class="text-gray-500 hover:text-gray-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-2">
            <p class="font-semibold text-lg">
              {{ activeCharacterType === 'animal' ? '🐾' : '👤' }} {{ activeCharacter.name }}
            </p>
            <p class="text-sm text-gray-700">Age: {{ activeCharacter.age }}</p>
            <div v-if="activeCharacterType === 'animal' && activeCharacter.traits && activeCharacter.traits.length > 0" class="text-sm text-gray-700">
              <span class="font-medium">Traits:</span> {{ activeCharacter.traits.join(', ') }}
            </div>
            <div v-if="activeCharacter.bio" class="mt-3 text-sm text-gray-700 bg-white p-3 rounded">
              {{ activeCharacter.bio.substring(0, 150) }}{{ activeCharacter.bio.length > 150 ? '...' : '' }}
            </div>
            <div v-else class="mt-3 text-sm text-gray-500 italic">
              No biography available.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Breadcrumbs from '../components/Breadcrumbs.vue'
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

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: 'Overview', to: '#' }
])

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
