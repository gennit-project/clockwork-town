<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Region Overview: {{ region?.name || 'Loading...' }}</h1>
      <router-link
        :to="`/world/${worldId}/region/${regionId}`"
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
        ← Back to Region
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

    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          <!-- Indoor Rooms -->
          <div v-if="lot.indoorRooms.length > 0" class="mb-4">
            <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Indoor Rooms ({{ lot.indoorRooms.length }})
            </h3>
            <div class="space-y-2">
              <div
                v-for="room in lot.indoorRooms"
                :key="room.id"
                class="bg-white border-2 border-blue-200 rounded p-3 hover:border-blue-400 transition-colors"
              >
                <p class="font-medium text-sm text-gray-900">{{ room.name }}</p>
                <p class="text-xs text-gray-600 mt-1">{{ room.description }}</p>
              </div>
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
              <div
                v-for="area in lot.outdoorAreas"
                :key="area.id"
                class="bg-white border-2 border-green-200 rounded p-3 hover:border-green-400 transition-colors"
              >
                <p class="font-medium text-sm text-gray-900">{{ area.name }}</p>
                <p class="text-xs text-gray-600 mt-1">{{ area.description }}</p>
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
const loading = ref(true)
const error = ref(null)

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: 'Overview', to: '#' }
])

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
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
