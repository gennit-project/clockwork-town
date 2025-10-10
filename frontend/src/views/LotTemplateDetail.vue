<template>
  <div>
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Loading template...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading template: {{ error.message }}</p>
    </div>

    <div v-else-if="template">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3">
              <router-link
                to="/library/lots"
                class="text-gray-400 hover:text-gray-600 dark:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
              </router-link>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ template.name }}</h1>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {{ template.lotType }}
              </span>
            </div>
            <p v-if="template.description" class="mt-2 text-gray-600 dark:text-gray-300">
              {{ template.description }}
            </p>
          </div>
          <div class="flex gap-3">
            <router-link
              :to="`/library/lots/${template.id}/edit`"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Edit Template
            </router-link>
            <button
              type="button"
              @click="showCloneModal = true"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Clone to World
            </button>
          </div>
        </div>

        <div v-if="template.tags && template.tags.length > 0" class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="tag in template.tags"
            :key="tag"
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:text-gray-200 dark:bg-gray-700"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- Indoor Rooms -->
      <div v-if="template.indoorRooms && template.indoorRooms.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Indoor Rooms ({{ template.indoorRooms.length }})</h2>
        <div class="space-y-4">
          <SpaceCard
            v-for="(room, index) in template.indoorRooms"
            :key="index"
            :space="room"
          />
        </div>
      </div>

      <!-- Outdoor Areas -->
      <div v-if="template.outdoorAreas && template.outdoorAreas.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Outdoor Areas ({{ template.outdoorAreas.length }})</h2>
        <div class="space-y-4">
          <SpaceCard
            v-for="(area, index) in template.outdoorAreas"
            :key="index"
            :space="area"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="(!template.indoorRooms || template.indoorRooms.length === 0) && (!template.outdoorAreas || template.outdoorAreas.length === 0)" class="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p class="text-gray-500">This template has no spaces defined.</p>
      </div>
    </div>

    <!-- Clone to World Modal -->
    <div v-if="showCloneModal" class="fixed inset-0 bg-black dark:text-white bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Clone Template to World</h2>

        <form @submit.prevent="cloneTemplate">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Select World
            </label>
            <select
              v-model="selectedWorldId"
              @change="onWorldChange"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select a world --</option>
              <option v-for="world in worlds" :key="world.id" :value="world.id">
                {{ world.name }}
              </option>
            </select>
          </div>

          <div v-if="selectedWorldId" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Select Region
            </label>
            <select
              v-model="selectedRegionId"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select a region --</option>
              <option v-for="region in regions" :key="region.id" :value="region.id">
                {{ region.name }}
              </option>
            </select>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeCloneModal"
              :disabled="cloning"
              class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="cloning || !selectedRegionId"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              {{ cloning ? 'Cloning...' : 'Clone Template' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gql } from 'graphql-request'
import { client, queries } from '../graphql'
import SpaceCard from '../components/SpaceCard.vue'

const route = useRoute()
const router = useRouter()
const template = ref(null)
const loading = ref(true)
const error = ref(null)

// Clone modal state
const showCloneModal = ref(false)
const worlds = ref([])
const regions = ref([])
const selectedWorldId = ref('')
const selectedRegionId = ref('')
const cloning = ref(false)

const QUERY_LOT_TEMPLATE = gql`
  query GetLotTemplate($id: ID!) {
    lotTemplate(id: $id) {
      id
      name
      lotType
      description
      tags
      indoorRooms {
        name
        description
        items {
          name
          description
        }
      }
      outdoorAreas {
        name
        description
        items {
          name
          description
        }
      }
    }
  }
`

const MUTATION_CREATE_LOT = gql`
  mutation CreateLotWithSpacesAndItems($regionId: ID!, $input: CreateLotWithSpacesInput!) {
    createLotWithSpacesAndItems(regionId: $regionId, input: $input) {
      id
      name
      lotType
    }
  }
`

const loadWorlds = async () => {
  try {
    const data = await client.request(queries.getWorlds)
    worlds.value = data.worlds || []
  } catch (e) {
    console.error('Error loading worlds:', e)
  }
}

const onWorldChange = async () => {
  selectedRegionId.value = ''
  regions.value = []

  if (!selectedWorldId.value) return

  try {
    const data = await client.request(queries.getRegions, {
      worldId: selectedWorldId.value
    })
    regions.value = data.regions || []
  } catch (e) {
    console.error('Error loading regions:', e)
  }
}

const closeCloneModal = () => {
  showCloneModal.value = false
  selectedWorldId.value = ''
  selectedRegionId.value = ''
  regions.value = []
}

const cloneTemplate = async () => {
  try {
    cloning.value = true

    // Transform template data to match CreateLotWithSpacesInput
    const input = {
      lotName: template.value.name,
      lotType: template.value.lotType,
      lotDescription: template.value.description || '',
      indoorRooms: (template.value.indoorRooms || []).map(room => ({
        spaceName: room.name,
        spaceDescription: room.description,
        items: (room.items || []).map(item => ({
          itemName: item.name,
          itemDescription: item.description,
          itemCount: 1
        }))
      })),
      outdoorSpaces: (template.value.outdoorAreas || []).map(area => ({
        spaceName: area.name,
        spaceDescription: area.description,
        items: (area.items || []).map(item => ({
          itemName: item.name,
          itemDescription: item.description,
          itemCount: 1
        }))
      }))
    }

    await client.request(MUTATION_CREATE_LOT, {
      regionId: selectedRegionId.value,
      input
    })

    // Navigate to the region's lots page
    router.push(`/world/${selectedWorldId.value}/region/${selectedRegionId.value}/lots`)
  } catch (e) {
    error.value = e
    alert('Error cloning template: ' + e.message)
  } finally {
    cloning.value = false
  }
}

onMounted(async () => {
  try {
    const data = await client.request(QUERY_LOT_TEMPLATE, {
      id: route.params.templateId
    })
    template.value = data.lotTemplate

    // Load worlds for the clone modal
    await loadWorlds()
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
})
</script>
