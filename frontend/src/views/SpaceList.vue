<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Spaces</h1>
      <div class="flex gap-3">
        <button
          @click="showSaveTemplateModal = true"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
        >
          Save as Template
        </button>
        <button
          @click="showCreateModal = true"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Create Space
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">Error: {{ error }}</p>
    </div>

    <div v-else-if="allSpaces.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
      <p class="text-gray-500 dark:text-gray-300 mb-4">No spaces yet. Create your first space!</p>
    </div>

    <div v-else>
      <!-- Household Info Banner -->
      <div v-if="household" class="mb-6 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h2 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">{{ household.name }}</h2>
        <div v-if="household.characters.length > 0" class="flex flex-wrap gap-2">
          <span
            v-for="char in household.characters"
            :key="char.id"
            class="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800  dark:text-blue-100 px-3 py-1 rounded-full"
          >
            {{ char.name }} ({{ char.age }})
          </span>
        </div>
      </div>

      <div v-if="indoorSpaces.length > 0" class="mb-8">
        <h2 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Indoor Rooms</h2>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="space in indoorSpaces"
            :key="space.id"
            class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            @click="viewSpace(space)"
          >
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ space.name }}</h3>
              <div class="flex space-x-2" @click.stop>
                <button
                  @click="editSpace(space)"
                  class="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="confirmDelete(space)"
                  class="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ space.description }}</p>
          </div>
        </div>
      </div>

      <div v-if="outdoorSpaces.length > 0">
        <h2 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Outdoor Areas</h2>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="space in outdoorSpaces"
            :key="space.id"
            class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            @click="viewSpace(space)"
          >
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ space.name }}</h3>
              <div class="flex space-x-2" @click.stop>
                <button
                  @click="editSpace(space)"
                  class="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="confirmDelete(space)"
                  class="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ space.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingSpace" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">
          {{ editingSpace ? 'Edit Space' : 'Create Space' }}
        </h2>
        <form @submit.prevent="saveSpace">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Space Name
            </label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter space name"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              v-model="formData.description"
              required
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter description"
            ></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              v-model="formData.isIndoor"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select type</option>
              <option :value="true">Indoor Room</option>
              <option :value="false">Outdoor Area</option>
            </select>
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeModal"
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

    <!-- Delete Confirmation Modal -->
    <div v-if="deletingSpace" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">Delete Space</h2>
        <p class="mb-4">Are you sure you want to delete "{{ deletingSpace.name }}"?</p>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="deletingSpace = null"
            class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100"
          >
            Cancel
          </button>
          <button
            @click="deleteSpace"
            :disabled="saving"
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {{ saving ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Save as Template Modal -->
    <div v-if="showSaveTemplateModal" class="fixed inset-0 bg-black dark:text-white bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">Save Lot as Template</h2>
        <form @submit.prevent="saveAsTemplate">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Template Description (optional)
            </label>
            <textarea
              v-model="templateData.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe this template"
            ></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Tags (comma-separated)
            </label>
            <input
              v-model="templateData.tagsInput"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., residential, starter, cozy"
            />
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeSaveTemplateModal"
              class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Template' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import { client, queries, mutations } from '../graphql'

const route = useRoute()
const router = useRouter()
const worldId = computed(() => route.params.worldId)
const regionId = computed(() => route.params.regionId)
const lotId = computed(() => route.params.lotId)

const indoorSpaces = ref([])
const outdoorSpaces = ref([])
const world = ref(null)
const region = ref(null)
const lot = ref(null)
const household = ref(null)
const loading = ref(true)
const error = ref(null)
const showCreateModal = ref(false)
const editingSpace = ref(null)
const deletingSpace = ref(null)
const saving = ref(false)
const formData = ref({ name: '', description: '', isIndoor: '' })
const showSaveTemplateModal = ref(false)
const templateData = ref({ description: '', tagsInput: '' })

const allSpaces = computed(() => [...indoorSpaces.value, ...outdoorSpaces.value])

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: lot.value?.name || 'Loading...', to: '#' }
])

const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    const [worldData, regionsData, lotsData, spacesData, householdsData] = await Promise.all([
      client.request(queries.getWorld, { id: worldId.value }),
      client.request(queries.getRegions, { worldId: worldId.value }),
      client.request(queries.getLots, { regionId: regionId.value }),
      client.request(queries.getSpaces, { lotId: lotId.value }),
      client.request(queries.getHouseholds, { regionId: regionId.value })
    ])
    world.value = worldData.world
    region.value = regionsData.regions.find(r => r.id === regionId.value)
    lot.value = lotsData.lots.find(l => l.id === lotId.value)
    indoorSpaces.value = spacesData.lot?.indoorRooms || []
    outdoorSpaces.value = spacesData.lot?.outdoorAreas || []
    household.value = householdsData.households.find(h => h.lotId === lotId.value) || null
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const editSpace = (space) => {
  editingSpace.value = space
  const isIndoor = indoorSpaces.value.some(s => s.id === space.id)
  formData.value = {
    name: space.name,
    description: space.description,
    isIndoor
  }
}

const confirmDelete = (space) => {
  deletingSpace.value = space
}

const closeModal = () => {
  showCreateModal.value = false
  editingSpace.value = null
  formData.value = { name: '', description: '', isIndoor: '' }
}

const saveSpace = async () => {
  try {
    saving.value = true
    if (editingSpace.value) {
      await client.request(mutations.updateSpace, {
        id: editingSpace.value.id,
        name: formData.value.name,
        description: formData.value.description
      })
    } else {
      await client.request(mutations.createSpace, {
        input: {
          id: crypto.randomUUID(),
          lotId: lotId.value,
          name: formData.value.name,
          description: formData.value.description,
          isIndoor: formData.value.isIndoor
        }
      })
    }
    closeModal()
    await loadData()
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

const deleteSpace = async () => {
  try {
    saving.value = true
    await client.request(mutations.deleteSpace, { id: deletingSpace.value.id })
    deletingSpace.value = null
    await loadData()
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

const viewSpace = (space) => {
  router.push(`/world/${worldId.value}/region/${regionId.value}/lot/${lotId.value}/space/${space.id}`)
}

const closeSaveTemplateModal = () => {
  showSaveTemplateModal.value = false
  templateData.value = { description: '', tagsInput: '' }
}

const saveAsTemplate = async () => {
  try {
    saving.value = true
    error.value = null

    // Fetch the lot with all spaces and items
    const lotData = await client.request(queries.getSpacesWithItems, { lotId: lotId.value })

    const tags = templateData.value.tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    const input = {
      lotName: lotData.lot.name,
      lotType: lotData.lot.lotType,
      lotDescription: templateData.value.description || '',
      indoorRooms: lotData.lot.indoorRooms.map(room => ({
        spaceName: room.name,
        spaceDescription: room.description,
        items: room.items.map(item => ({
          itemName: item.name,
          itemDescription: item.description,
          itemCount: 1
        }))
      })),
      outdoorSpaces: lotData.lot.outdoorAreas.map(area => ({
        spaceName: area.name,
        spaceDescription: area.description,
        items: area.items.map(item => ({
          itemName: item.name,
          itemDescription: item.description,
          itemCount: 1
        }))
      }))
    }

    await client.request(mutations.createLotTemplate, { input, tags })

    alert('Template saved successfully!')
    closeSaveTemplateModal()
  } catch (e) {
    error.value = e.message
    alert('Error saving template: ' + e.message)
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>
