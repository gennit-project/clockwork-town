<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {{ isRegionDetailView ? (region?.name || 'Region') : 'Regions' }}
      </h1>
      <button
        @click="showCreateModal = true"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        {{ isRegionDetailView ? 'Edit Region' : 'Create Region' }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">Error: {{ error }}</p>
    </div>

    <div v-else>
      <!-- Region List View -->
      <div v-if="!isRegionDetailView">
        <div v-if="regions.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
          <p class="text-gray-500 dark:text-gray-300 mb-4">No regions yet. Create your first region!</p>
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="reg in regions"
            :key="reg.id"
            class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            @click="viewRegion(reg.id)"
          >
            <div class="flex justify-between items-start mb-2">
              <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ reg.name }}</h2>
                <p class="text-sm text-gray-500">{{ reg.kind }}</p>
              </div>
              <div class="flex space-x-2" @click.stop>
                <button
                  @click="editRegion(reg)"
                  class="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="confirmDelete(reg)"
                  class="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="text-blue-600 hover:text-blue-800 font-medium">
              View Details →
            </div>
          </div>
        </div>
      </div>

      <!-- Region Detail View - Default redirects to overview -->
      <div v-else>
        <div class="flex justify-end space-x-3 mb-6">
          <router-link
            :to="`/world/${worldId}/region/${regionId}/lots`"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Manage Lots & Households
          </router-link>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingRegion" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">
          {{ editingRegion ? 'Edit Region' : 'Create Region' }}
        </h2>
        <form @submit.prevent="saveRegion">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Region Name
            </label>
            <input
              ref="regionNameInput"
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

    <!-- Delete Region Confirmation Modal -->
    <div v-if="deletingRegion" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">Delete Region</h2>
        <p class="mb-4">Are you sure you want to delete "{{ deletingRegion.name }}"?</p>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="deletingRegion = null"
            class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100"
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

    <!-- Delete Household Confirmation Modal -->
    <div v-if="deletingHousehold" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">Delete Household</h2>
        <p class="mb-4">Are you sure you want to delete "{{ deletingHousehold.name }}"? This will also delete all characters in the household.</p>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="deletingHousehold = null"
            class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100"
          >
            Cancel
          </button>
          <button
            @click="deleteHousehold"
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

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import { client, queries, mutations } from '../graphql'
import { useRouteParams } from '../composables/useRouteParams'

interface WorldSummary {
  id: string
  name: string
}

interface RegionSummary {
  id: string
  name: string
  kind: string
  worldId: string
}

interface HouseholdSummary {
  id: string
  name: string
  lotId: string
  lotName: string
}

interface GetWorldResult {
  world: WorldSummary | null
}

interface GetRegionsResult {
  regions: RegionSummary[]
}

const route = useRoute()
const router = useRouter()
const { worldId, regionId } = useRouteParams()
const isRegionDetailView = computed(() => !!regionId.value)

const region = ref<RegionSummary | null>(null)
const regions = ref<RegionSummary[]>([])
const world = ref<WorldSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const showCreateModal = ref(false)
const editingRegion = ref<RegionSummary | null>(null)
const deletingRegion = ref<RegionSummary | null>(null)
const deletingHousehold = ref<HouseholdSummary | null>(null)
const saving = ref(false)
const formData = ref({ name: '', kind: '' })
const regionNameInput = ref<HTMLInputElement | null>(null)

const breadcrumbs = computed(() => {
  if (isRegionDetailView.value) {
    return [
      { label: 'Worlds', to: '/' },
      { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
      { label: region.value?.name || 'Loading...', to: '#' }
    ]
  }

  return [
    { label: 'Worlds', to: '/' },
    { label: world.value?.name || 'Loading...', to: '#' }
  ]
})

const loadData = async () => {
  try {
    if (!worldId.value) {
      error.value = 'Missing world id'
      return
    }

    loading.value = true
    error.value = null

    const [worldData, regionsData] = await Promise.all([
      client.request<GetWorldResult>(queries.getWorld, { id: worldId.value }),
      client.request<GetRegionsResult>(queries.getRegions, { worldId: worldId.value })
    ])

    world.value = worldData.world
    regions.value = regionsData.regions || []

    if (isRegionDetailView.value) {
      region.value = regionsData.regions.find((entry) => entry.id === regionId.value) || null
      if (region.value) {
        formData.value = { name: region.value.name, kind: region.value.kind }
      }

      if (regionId.value && route.path === `/world/${worldId.value}/region/${regionId.value}`) {
        router.replace(`/world/${worldId.value}/region/${regionId.value}/overview`)
      }
    } else {
      region.value = null
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load regions'
  } finally {
    loading.value = false
  }
}

const editRegion = (reg: RegionSummary) => {
  editingRegion.value = reg
  formData.value = { name: reg.name, kind: reg.kind }
}

const confirmDelete = (selectedRegion: RegionSummary) => {
  deletingRegion.value = selectedRegion
}

const closeModal = () => {
  showCreateModal.value = false
  if (!isRegionDetailView.value) {
    editingRegion.value = null
  }
  formData.value = { name: '', kind: '' }
}

const saveRegion = async () => {
  try {
    if (!worldId.value) {
      error.value = 'Missing world id'
      return
    }

    saving.value = true
    if (isRegionDetailView.value && regionId.value) {
      await client.request(mutations.updateRegion, {
        id: regionId.value,
        name: formData.value.name,
        kind: formData.value.kind
      })
    } else if (editingRegion.value) {
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
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save region'
  } finally {
    saving.value = false
  }
}

const deleteRegion = async () => {
  try {
    if (!deletingRegion.value) {
      return
    }

    saving.value = true
    await client.request(mutations.deleteRegion, { id: deletingRegion.value.id })
    deletingRegion.value = null
    await loadData()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to delete region'
  } finally {
    saving.value = false
  }
}

const deleteHousehold = async () => {
  try {
    if (!deletingHousehold.value) {
      return
    }

    saving.value = true
    await client.request(mutations.deleteHousehold, { id: deletingHousehold.value.id })
    deletingHousehold.value = null
    await loadData()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to delete household'
  } finally {
    saving.value = false
  }
}

const viewRegion = (regId: string) => {
  router.push(`/world/${worldId.value}/region/${regId}`)
}

watch(
  () => route.path,
  (newPath) => {
    if (
      newPath.includes('/world/') &&
      newPath.includes('/region/') &&
      !newPath.includes('/overview') &&
      !newPath.includes('/lots') &&
      !newPath.includes('/lot/') &&
      !newPath.includes('/household')
    ) {
      void loadData()
    }
  }
)

watch(
  () => showCreateModal.value || !!editingRegion.value,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      regionNameInput.value?.focus()
    }
  }
)

onMounted(() => {
  void loadData()
})
</script>
