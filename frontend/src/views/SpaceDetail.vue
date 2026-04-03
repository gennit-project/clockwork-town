<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <AsyncContainer :loading="loading" :error="error">
      <div class="max-w-4xl mx-auto">
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
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Max Simultaneous Users
                </label>
                <input
                  v-model.number="newItem.maxSimultaneousUsers"
                  type="number"
                  min="1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Affordances
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="option in affordanceOptions"
                  :key="option.action"
                  class="rounded border border-gray-200 px-3 py-2 text-sm"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        :checked="newItem.affordances.some((entry) => entry.action === option.action)"
                        @change="toggleAffordance(newItem, option.action, $event.target.checked)"
                      />
                      {{ option.label }}
                    </span>
                    <input
                      v-if="newItem.affordances.some((entry) => entry.action === option.action)"
                      :value="getAffordanceWeight(newItem, option.action)"
                      type="number"
                      min="0.1"
                      step="0.1"
                      class="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
                      @input="setAffordanceWeight(newItem, option.action, $event.target.value)"
                    />
                  </div>
                </label>
              </div>
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
            v-for="item in itemsWithActiveUsers"
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
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Affordances
                </label>
                <div class="space-y-2">
                  <label
                    v-for="option in affordanceOptions"
                    :key="option.action"
                    class="flex items-center justify-between gap-2 text-xs"
                  >
                    <span class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        :checked="editingItem.affordances.some((entry) => entry.action === option.action)"
                        @change="toggleAffordance(editingItem, option.action, $event.target.checked)"
                      />
                      {{ option.label }}
                    </span>
                    <input
                      v-if="editingItem.affordances.some((entry) => entry.action === option.action)"
                      :value="getAffordanceWeight(editingItem, option.action)"
                      type="number"
                      min="0.1"
                      step="0.1"
                      class="w-20 rounded border border-gray-300 px-2 py-1 text-xs dark:text-white"
                      @input="setAffordanceWeight(editingItem, option.action, $event.target.value)"
                    />
                  </label>
                </div>
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
                    class="border-2 rounded p-1.5 min-h-[48px] flex flex-col items-center justify-center"
                    :class="item.activeUsers && item.activeUsers[slotIndex - 1]
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-950 dark:border-blue-600'
                      : 'border-gray-300 bg-gray-100 dark:bg-gray-700 dark:border-gray-600'"
                  >
                    <div
                      v-if="item.activeUsers && item.activeUsers[slotIndex - 1]"
                      class="text-center"
                    >
                      <div class="text-[10px] font-medium text-blue-800 dark:text-blue-200 truncate">
                        👤 {{ item.activeUsers[slotIndex - 1].name }}
                      </div>
                      <div class="text-[9px] text-blue-600 dark:text-blue-300 mt-0.5 truncate">
                        {{ getCharacterActivity(item.activeUsers[slotIndex - 1].id) }}
                      </div>
                    </div>
                    <span v-else class="text-[10px] text-gray-400 dark:text-gray-500">
                      —
                    </span>
                  </div>
                </div>
              </div>

              <!-- Affordances -->
              <div v-if="item.allowedActivities && item.allowedActivities.length > 0" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="affordance in item.affordances || []"
                  :key="affordance.action"
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  {{ affordance.action }} ({{ affordance.weight }})
                </span>
              </div>
              <div v-else class="mt-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  no actions
                </span>
              </div>
              <div v-if="activeCharacter && item.allowedActivities?.length" class="mt-3 flex flex-wrap gap-1">
                <button
                  v-for="activity in item.allowedActivities"
                  :key="activity"
                  type="button"
                  class="rounded bg-blue-600 px-2 py-1 text-[10px] text-white"
                  @click="queueItemAction(item, activity)"
                >
                  Send {{ activeCharacter.name }} to {{ activity }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Idle Characters Section -->
        <div v-if="idleCharacters.length > 0" class="mt-6">
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Idle</h2>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="char in idleCharacters"
              :key="char.id"
              class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border-2 border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-200"
            >
              {{ char.name }}
            </span>
          </div>
        </div>
      </div>
      </div>
    </AsyncContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import AsyncContainer from '../components/AsyncContainer.vue'
import { client, queries, mutations } from '../graphql'
import { useSimulationStore } from '../stores/simulation'
import { useRouteParams } from '../composables/useRouteParams'
import { useBreadcrumbs } from '../composables/useBreadcrumbs'

const simulationStore = useSimulationStore()
const { worldId, regionId, lotId, spaceId } = useRouteParams()
const { buildBreadcrumbs } = useBreadcrumbs()

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
const affordanceOptions = [
  { action: 'eat', label: 'Eat' },
  { action: 'sleep', label: 'Sleep' },
  { action: 'use_toilet', label: 'Use Toilet' },
  { action: 'shower', label: 'Shower' },
  { action: 'medicate', label: 'Medicate' },
  { action: 'chat_friend', label: 'Chat Friend' },
  { action: 'date', label: 'Date' },
  { action: 'read', label: 'Read' },
  { action: 'write', label: 'Write' },
  { action: 'view_art', label: 'View Art' },
  { action: 'volunteer', label: 'Volunteer' }
]

const newItem = ref({
  name: '',
  description: '',
  maxSimultaneousUsers: null,
  affordances: [] as Array<{ action: string; weight: number }>
})

const breadcrumbs = computed(() => buildBreadcrumbs({
  worldId: worldId.value,
  regionId: regionId.value,
  lotId: lotId.value,
  spaceId: spaceId.value,
  world: world.value,
  region: region.value,
  lot: lot.value,
  space: space.value
}))

// Enrich items with active users from simulation store
const itemsWithActiveUsers = computed(() => {
  return items.value.map(item => {
    const activeUsers = simulationStore.getItemActiveUsers(item.id)
    return {
      ...item,
      activeUsers
    }
  })
})

// Get all characters in this space
const charactersInSpace = computed(() => {
  const chars = []
  for (const [charId, charState] of Object.entries(simulationStore.characterStates)) {
    if (charState.location?.spaceId === spaceId.value) {
      chars.push({
        id: charId,
        name: charState.name
      })
    }
  }
  return chars
})

// Calculate idle characters (in space but not using any items)
const idleCharacters = computed(() => {
  // Get all character IDs currently using items
  const charactersUsingItems = new Set()

  items.value.forEach(item => {
    const activeUsers = simulationStore.getItemActiveUsers(item.id)
    activeUsers.forEach(user => charactersUsingItems.add(user.id))
  })

  // Filter characters who are:
  // 1. Not using items
  // 2. Actually in this space according to simulation store (double-check)
  return charactersInSpace.value.filter(char => {
    // Skip if using an item
    if (charactersUsingItems.has(char.id)) {
      return false
    }

    // Verify character is actually in this space (charactersInSpace already checks this, but be defensive)
    const charState = simulationStore.characterStates[char.id]
    return charState?.location?.spaceId === spaceId.value
  })
})

// Get character's current activity in readable format
const getCharacterActivity = (characterId) => {
  const charState = simulationStore.characterStates[characterId]
  if (charState?.currentAction) {
    // Convert action name to readable format (e.g., "chat_friend" -> "Chat Friend")
    return charState.currentAction
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return 'Idle'
}

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
        description: newItem.value.description,
        maxSimultaneousUsers: newItem.value.maxSimultaneousUsers || null,
        affordances: newItem.value.affordances
      }
    })

    // Add to local array
    items.value.push({
      id: itemId,
      name: newItem.value.name,
      description: newItem.value.description,
      maxSimultaneousUsers: newItem.value.maxSimultaneousUsers || null,
      affordances: newItem.value.affordances,
      allowedActivities: newItem.value.affordances.map((entry) => entry.action)
    })

    // Reset form
    newItem.value = { name: '', description: '', maxSimultaneousUsers: null, affordances: [] }
    showAddItemForm.value = false
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

const startEditItem = (item) => {
  editingItem.value = {
    ...item,
    affordances: item.affordances || (item.allowedActivities || []).map((action) => ({ action, weight: 1 }))
  }
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
        maxSimultaneousUsers: editingItem.value.maxSimultaneousUsers || null,
        affordances: editingItem.value.affordances || []
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

// Watch for space ID changes in the route and reload data
watch(spaceId, (newSpaceId, oldSpaceId) => {
  if (newSpaceId && newSpaceId !== oldSpaceId) {
    loadData()
  }
})

const activeCharacter = computed(() => {
  const activeId = simulationStore.activeCharacterId
  if (!activeId) {
    return null
  }
  const charState = simulationStore.characterStates[activeId]
  return charState ? { id: activeId, ...charState } : null
})

function toggleAffordance(target, action: string, checked: boolean) {
  const affordances = target.affordances || []
  if (checked) {
    if (!affordances.find((entry) => entry.action === action)) {
      affordances.push({ action, weight: 1 })
    }
  } else {
    target.affordances = affordances.filter((entry) => entry.action !== action)
  }
}

function getAffordanceWeight(target, action: string) {
  return target.affordances?.find((entry) => entry.action === action)?.weight ?? 1
}

function setAffordanceWeight(target, action: string, rawValue: string) {
  const weight = Number(rawValue) || 1
  target.affordances = (target.affordances || []).map((entry) =>
    entry.action === action ? { ...entry, weight } : entry
  )
}

function queueItemAction(item, action: string) {
  if (!activeCharacter.value) {
    return
  }

  simulationStore.enqueueIntent(activeCharacter.value.id, {
    action,
    itemId: item.id,
    itemName: item.name,
    targetSpaceId: spaceId.value,
    targetSpaceName: space.value?.name || '',
    targetLotId: lotId.value,
    targetLotName: lot.value?.name || '',
    utility: item.affordances?.find((entry) => entry.action === action)?.weight || 1,
    source: 'manual'
  })
}
</script>
