<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Regions</h1>
      <button
        @click="showCreateModal = true"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Create Region
      </button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">Error: {{ error }}</p>
    </div>

    <div v-else-if="regions.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
      <p class="text-gray-500 mb-4">No regions yet. Create your first region!</p>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="region in regions"
        :key="region.id"
        class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
      >
        <div class="flex justify-between items-start mb-2">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">{{ region.name }}</h2>
            <p class="text-sm text-gray-500">{{ region.kind }}</p>
          </div>
          <div class="flex space-x-2">
            <button
              @click="editRegion(region)"
              class="text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="confirmDelete(region)"
              class="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <router-link
          :to="`/world/${worldId}/region/${region.id}`"
          class="text-blue-600 hover:text-blue-800 font-medium"
        >
          View Lots →
        </router-link>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingRegion" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">
          {{ editingRegion ? 'Edit Region' : 'Create Region' }}
        </h2>
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
              @click="closeModal"
              class="px-4 py-2 text-gray-700 hover:text-gray-900"
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
    <div v-if="deletingRegion" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">Delete Region</h2>
        <p class="mb-4">Are you sure you want to delete "{{ deletingRegion.name }}"?</p>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="deletingRegion = null"
            class="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            @click="deleteRegion"
            :disabled="saving"
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {{ saving ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import { client, queries, mutations } from '../graphql'

const route = useRoute()
const worldId = computed(() => route.params.worldId)

const regions = ref([])
const world = ref(null)
const loading = ref(true)
const error = ref(null)
const showCreateModal = ref(false)
const editingRegion = ref(null)
const deletingRegion = ref(null)
const saving = ref(false)
const formData = ref({ name: '', kind: '' })

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'World', to: '#' }
])

const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    const [worldData, regionsData] = await Promise.all([
      client.request(queries.getWorld, { id: worldId.value }),
      client.request(queries.getRegions, { worldId: worldId.value })
    ])
    world.value = worldData.world
    regions.value = regionsData.regions || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const editRegion = (region) => {
  editingRegion.value = region
  formData.value = { name: region.name, kind: region.kind }
}

const confirmDelete = (region) => {
  deletingRegion.value = region
}

const closeModal = () => {
  showCreateModal.value = false
  editingRegion.value = null
  formData.value = { name: '', kind: '' }
}

const saveRegion = async () => {
  try {
    saving.value = true
    if (editingRegion.value) {
      await client.request(mutations.updateRegion, {
        id: editingRegion.value.id,
        name: formData.value.name,
        kind: formData.value.kind
      })
    } else {
      await client.request(mutations.createRegion, {
        input: {
          id: crypto.randomUUID(),
          worldId: worldId.value,
          name: formData.value.name,
          kind: formData.value.kind
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

const deleteRegion = async () => {
  try {
    saving.value = true
    await client.request(mutations.deleteRegion, { id: deletingRegion.value.id })
    deletingRegion.value = null
    await loadData()
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>
