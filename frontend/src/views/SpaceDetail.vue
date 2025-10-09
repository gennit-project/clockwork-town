<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">Error: {{ error }}</p>
    </div>

    <div v-else class="max-w-4xl mx-auto">
      <!-- Space Header -->
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-2">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ space?.name || 'Loading...' }}</h1>
        </div>
        <p class="text-gray-600 dark:text-gray-300">{{ space?.description }}</p>
      </div>

      <!-- Items Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Items in this Space</h2>
          <button
            @click="showAddItemForm = !showAddItemForm"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {{ showAddItemForm ? 'Cancel' : '+ Add Item' }}
          </button>
        </div>

        <!-- Add Item Form -->
        <div v-if="showAddItemForm" class="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200">
          <form @submit.prevent="addItem" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Item Name *
              </label>
              <input
                v-model="newItem.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter item name"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Description *
              </label>
              <textarea
                v-model="newItem.description"
                required
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the item"
              ></textarea>
            </div>
            <div class="flex gap-4">
              <button
                type="submit"
                :disabled="saving"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {{ saving ? 'Adding...' : 'Add Item' }}
              </button>
              <button
                type="button"
                @click="showAddItemForm = false"
                class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <!-- Items List -->
        <div v-if="items.length === 0 && !showAddItemForm" class="text-center py-12">
          <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p class="text-gray-500 dark:text-gray-300 text-lg">This room is empty.</p>
          <p class="text-gray-400 text-sm mt-2">Click "Add Item" to place something here.</p>
        </div>

        <div v-else-if="items.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="item in items"
            :key="item.id"
            class=" rounded-lg p-3 transition-colors"
            :class="editingItem?.id === item.id ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 hover:border-blue-300 bg-gray-50 dark:bg-gray-900'"
          >
            <!-- Edit Mode -->
            <div v-if="editingItem?.id === item.id" class="space-y-2">
              <input
                v-model="editingItem.name"
                type="text"
                required
                class="dark:text-white w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Item name"
              />
              <textarea
                v-model="editingItem.description"
                required
                rows="2"
                class="dark:text-white w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description"
              ></textarea>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Simultaneous Users
                </label>
                <input
                  v-model.number="editingItem.maxSimultaneousUsers"
                  type="number"
                  min="1"
                  class="dark:text-white w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div class="flex gap-2">
                <button
                  @click="saveEdit"
                  :disabled="saving"
                  class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50"
                >
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
                <button
                  @click="cancelEdit"
                  class="text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>

            <!-- View Mode -->
            <div v-else>
              <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                  <h3 class="font-medium text-sm text-gray-900 dark:text-gray-100">{{ item.name }}</h3>
                  <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">{{ item.description }}</p>
                </div>
                <div class="flex gap-1 ml-2">
                <button
                  @click="startEditItem(item)"
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Edit item"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="removeItem(item.id)"
                  class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  title="Delete item"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                </div>
              </div>

              <!-- Slot Visualization -->
              <div v-if="item.maxSimultaneousUsers && item.maxSimultaneousUsers >= 1" class="mt-2 mb-2">
                <div class="grid gap-1" :class="item.maxSimultaneousUsers === 1 ? 'grid-cols-1' : item.maxSimultaneousUsers === 2 ? 'grid-cols-2' : item.maxSimultaneousUsers === 3 ? 'grid-cols-3' : 'grid-cols-2'">
                  <div
                    v-for="slotIndex in item.maxSimultaneousUsers"
                    :key="slotIndex"
                    class="border-2 rounded p-1.5 min-h-[32px] flex items-center justify-center"
                    :class="item.activeUsers && item.activeUsers[slotIndex - 1]
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-950 dark:border-blue-600'
                      : 'border-gray-300 bg-gray-100 dark:bg-gray-700 dark:border-gray-600'"
                  >
                    <span
                      v-if="item.activeUsers && item.activeUsers[slotIndex - 1]"
                      class="text-[10px] font-medium text-blue-800 dark:text-blue-200 truncate"
                    >
                      👤 {{ item.activeUsers[slotIndex - 1].name }}
                    </span>
                    <span v-else class="text-[10px] text-gray-400 dark:text-gray-500">
                      —
                    </span>
                  </div>
                </div>
              </div>

              <!-- Affordances -->
              <div v-if="item.allowedActivities && item.allowedActivities.length > 0" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="activity in item.allowedActivities"
                  :key="activity"
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  {{ activity }}
                </span>
              </div>
              <div v-else class="mt-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  no actions
                </span>
              </div>
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
import { client, queries, mutations } from '../graphql'

const route = useRoute()
const worldId = computed(() => route.params.worldId)
const regionId = computed(() => route.params.regionId)
const lotId = computed(() => route.params.lotId)
const spaceId = computed(() => route.params.spaceId)

const space = ref(null)
const items = ref([])
const world = ref(null)
const region = ref(null)
const lot = ref(null)
const loading = ref(true)
const error = ref(null)
const showAddItemForm = ref(false)
const saving = ref(false)
const editingItem = ref(null)

const newItem = ref({
  name: '',
  description: ''
})

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: 'Overview', to: `/world/${worldId.value}/region/${regionId.value}/overview` },
  { label: lot.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}/lot/${lotId.value}` },
  { label: space.value?.name || 'Loading...', to: '#' }
])

const loadData = async () => {
  try {
    loading.value = true
    error.value = null

    const [worldData, regionsData, lotData, spaceData] = await Promise.all([
      client.request(queries.getWorld, { id: worldId.value }),
      client.request(queries.getRegions, { worldId: worldId.value }),
      client.request(queries.getLot, { id: lotId.value }),
      client.request(queries.getSpace, { id: spaceId.value })
    ])

    world.value = worldData.world
    region.value = regionsData.regions.find(r => r.id === regionId.value)
    lot.value = lotData.lot
    space.value = spaceData.space
    items.value = spaceData.space?.items || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const addItem = async () => {
  try {
    saving.value = true
    error.value = null

    const itemId = crypto.randomUUID()

    await client.request(mutations.createItem, {
      input: {
        id: itemId,
        spaceId: spaceId.value,
        name: newItem.value.name,
        description: newItem.value.description
      }
    })

    // Add to local array
    items.value.push({
      id: itemId,
      name: newItem.value.name,
      description: newItem.value.description
    })

    // Reset form
    newItem.value = { name: '', description: '' }
    showAddItemForm.value = false
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

const startEditItem = (item) => {
  editingItem.value = { ...item }
  showAddItemForm.value = false
}

const cancelEdit = () => {
  editingItem.value = null
}

const saveEdit = async () => {
  try {
    saving.value = true
    error.value = null

    await client.request(mutations.updateItem, {
      input: {
        id: editingItem.value.id,
        name: editingItem.value.name,
        description: editingItem.value.description,
        maxSimultaneousUsers: editingItem.value.maxSimultaneousUsers || null
      }
    })

    // Update local array
    const index = items.value.findIndex(i => i.id === editingItem.value.id)
    if (index !== -1) {
      items.value[index] = { ...editingItem.value }
    }

    editingItem.value = null
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

const removeItem = async (itemId) => {
  if (!confirm('Are you sure you want to remove this item?')) return

  try {
    error.value = null

    await client.request(mutations.deleteItem, { id: itemId })

    // Remove from local array
    items.value = items.value.filter(i => i.id !== itemId)
  } catch (e) {
    error.value = e.message
  }
}

onMounted(loadData)
</script>
