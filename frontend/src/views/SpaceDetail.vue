<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <AsyncContainer :loading="loading" :error="error ?? undefined">
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
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Comfort Bonus
                </label>
                <input
                  v-model.number="newItem.comfort"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for default"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Item Roles
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="role in ITEM_ROLE_OPTIONS"
                  :key="role.key"
                  class="rounded border border-gray-200 px-3 py-2 text-sm"
                >
                  <span class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      :checked="newItem.itemRoles.includes(role.key)"
                      @change="handleItemRoleToggle(newItem, role.key, $event)"
                    />
                    {{ role.label }}
                  </span>
                </label>
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
                        @change="handleAffordanceToggle(newItem, option.action, $event)"
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
                      @input="handleAffordanceWeightInput(newItem, option.action, $event)"
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
            class="rounded-lg border p-3 transition-colors"
            :class="getItemCardClass(item)"
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
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Comfort Bonus
                </label>
                <input
                  v-model.number="editingItem.comfort"
                  type="number"
                  min="0"
                  step="0.01"
                  class="dark:text-white w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for default"
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
                  Item Roles
                </label>
                <div class="grid grid-cols-1 gap-2">
                  <label
                    v-for="role in ITEM_ROLE_OPTIONS"
                    :key="role.key"
                    class="flex items-center gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      :checked="editingItem.itemRoles.includes(role.key)"
                      @change="editingItem && handleItemRoleToggle(editingItem, role.key, $event)"
                    />
                    {{ role.label }}
                  </label>
                </div>
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
                        @change="editingItem && handleAffordanceToggle(editingItem, option.action, $event)"
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
                      @input="editingItem && handleAffordanceWeightInput(editingItem, option.action, $event)"
                    />
                  </label>
                </div>
              </div>
            </div>

            <!-- View Mode -->
            <div v-else>
              <div
                v-if="item.activeUsers?.length"
                class="mb-3 rounded-lg border border-blue-200 bg-blue-100/80 px-2.5 py-2 dark:border-blue-700 dark:bg-blue-900/40"
              >
                <p class="text-[11px] font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
                  In use now
                </p>
                <div class="mt-1 space-y-1">
                  <p
                    v-for="user in item.activeUsers"
                    :key="user.id"
                    class="text-xs font-medium text-blue-900 dark:text-blue-100"
                  >
                    {{ user.name }}: {{ getCharacterStatus(user.id) }}
                  </p>
                </div>
              </div>

              <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                  <h3 class="font-medium text-sm text-gray-900 dark:text-gray-100">{{ item.name }}</h3>
                  <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">{{ item.description }}</p>
                  <div v-if="item.itemRoles.length" class="mt-2 flex flex-wrap gap-1">
                    <span
                      v-for="role in item.itemRoles"
                      :key="role"
                      class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                    >
                      {{ formatItemRole(role) }}
                    </span>
                  </div>
                  <p v-if="item.comfort > 0" class="mt-2 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    Comfort +{{ item.comfort.toFixed(2) }}
                  </p>
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
              <div v-if="getItemActions(item).length > 0" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="affordance in getItemAffordances(item)"
                  :key="affordance.action"
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  {{ affordance.action }} ({{ affordance.weight }})
                </span>
              </div>
              <div v-if="activeCharacter && getItemActions(item).length" class="mt-3 flex flex-wrap gap-1">
                <button
                  v-for="activity in getItemActions(item)"
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
import { getCharacterStatusText } from '../composables/useCharacterStatus'
import { client, queries, mutations } from '../graphql'
import { useSimulationStore } from '../stores/simulation'
import { useCharacterPanelStore } from '../stores/characterPanel'
import { useRouteParams } from '../composables/useRouteParams'
import { useBreadcrumbs } from '../composables/useBreadcrumbs'
import type { ActionName, InputLot, ItemAffordance } from '../stores/types'
import { ITEM_ROLE_OPTIONS } from '../stores/utils/itemClassification'

const simulationStore = useSimulationStore()
const characterPanelStore = useCharacterPanelStore()
const { worldId, regionId, lotId, spaceId } = useRouteParams()
const { buildBreadcrumbs } = useBreadcrumbs()

interface WorldSummary {
  id: string
  name: string
}

interface RegionSummary {
  id: string
  name: string
  worldId: string
  kind: string
}

interface LotSummary {
  id: string
  name: string
  lotType: string
}

interface ActiveUserSummary {
  id: string
  name: string
}

interface SpaceItem {
  id: string
  name: string
  description: string
  itemRoles: string[]
  comfort: number
  allowedActivities: ActionName[]
  affordances: ItemAffordance[]
  maxSimultaneousUsers: number | null
  activeUsers?: ActiveUserSummary[]
}

interface SpaceSummary {
  id: string
  name: string
  description: string
  isIndoor?: boolean
  items?: SpaceItem[]
}

interface CharacterLocationSummary {
  id: string
  name: string
}

interface CharacterSummary {
  id: string
  name: string
  workSchedule?: Array<{
    day: string
    start: string
    end: string
    location: { id: string; name: string }
  }>
  location?: CharacterLocationSummary | null
}

interface EditableItem extends SpaceItem {}

interface ItemCard extends SpaceItem {
  activeUsers: ActiveUserSummary[]
  isActiveItem: boolean
}

interface AffordanceTarget {
  affordances: ItemAffordance[]
}

interface GetWorldResult {
  world: WorldSummary | null
}

interface GetRegionsResult {
  regions: RegionSummary[]
}

interface GetLotsResult {
  lots: InputLot[]
}

interface GetRegionResult {
  region?: {
    characters?: CharacterSummary[]
  } | null
}

interface HouseholdSummary {
  id: string
  lotId?: string | null
  lotName?: string | null
  characters: Array<{ id: string }>
}

interface GetHouseholdsResult {
  households: HouseholdSummary[]
}

interface GetLotResult {
  lot: LotSummary | null
}

interface GetSpaceResult {
  space: SpaceSummary | null
}

const space = ref<SpaceSummary | null>(null)
const items = ref<SpaceItem[]>([])
const world = ref<WorldSummary | null>(null)
const region = ref<RegionSummary | null>(null)
const lot = ref<LotSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const showAddItemForm = ref(false)
const saving = ref(false)
const editingItem = ref<EditableItem | null>(null)
const affordanceOptions: Array<{ action: ActionName; label: string }> = [
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

const newItem = ref<{
  name: string
  description: string
  itemRoles: string[]
  comfort: number | null
  maxSimultaneousUsers: number | null
  affordances: ItemAffordance[]
}>({
  name: '',
  description: '',
  itemRoles: [],
  comfort: null,
  maxSimultaneousUsers: null,
  affordances: []
})

const breadcrumbs = computed(() => buildBreadcrumbs({
  worldId: worldId.value,
  regionId: regionId.value,
  lotId: lotId.value,
  spaceId: spaceId.value,
  world: world.value ?? undefined,
  region: region.value ?? undefined,
  lot: lot.value ?? undefined,
  space: space.value ?? undefined
}))

const itemsWithActiveUsers = computed<ItemCard[]>(() => {
  return items.value.map(item => {
    const activeUsers = simulationStore.getItemActiveUsers(item.id)
    return {
      ...item,
      activeUsers,
      isActiveItem: activeUsers.length > 0
    }
  })
})

const charactersInSpace = computed<Array<{ id: string; name: string }>>(() => {
  const chars: Array<{ id: string; name: string }> = []
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

const idleCharacters = computed(() => {
  const charactersUsingItems = new Set<string>()

  items.value.forEach(item => {
    const activeUsers = simulationStore.getItemActiveUsers(item.id)
    activeUsers.forEach(user => charactersUsingItems.add(user.id))
  })

  return charactersInSpace.value.filter(char => {
    if (charactersUsingItems.has(char.id)) {
      return false
    }

    const charState = simulationStore.characterStates[char.id]
    return charState?.location?.spaceId === spaceId.value
      && charState.currentAction === 'idle'
      && !charState.currentTask
  })
})

const getCharacterStatus = (characterId: string): string => {
  const charState = simulationStore.characterStates[characterId]
  return getCharacterStatusText(charState)
}

const getCharacterActivity = (characterId: string): string => {
  return getCharacterStatus(characterId)
}

const loadData = async () => {
  try {
    if (!worldId.value || !regionId.value || !lotId.value || !spaceId.value) {
      error.value = 'Missing route parameters'
      return
    }

    loading.value = true
    error.value = null

    const [worldData, regionsData, lotsData, regionData, householdsData, lotData, spaceData] = await Promise.all([
      client.request<GetWorldResult>(queries.getWorld, { id: worldId.value }),
      client.request<GetRegionsResult>(queries.getRegions, { worldId: worldId.value }),
      client.request<GetLotsResult>(queries.getLots, { regionId: regionId.value }),
      client.request<GetRegionResult>(queries.getRegion, { id: regionId.value }),
      client.request<GetHouseholdsResult>(queries.getHouseholds, { regionId: regionId.value }),
      client.request<GetLotResult>(queries.getLot, { id: lotId.value }),
      client.request<GetSpaceResult>(queries.getSpace, { id: spaceId.value })
    ])

    world.value = worldData.world
    region.value = regionsData.regions.find(entry => entry.id === regionId.value) || null
    lot.value = lotData.lot
    space.value = spaceData.space
    items.value = spaceData.space?.items || []

    const characters = regionData.region?.characters || []
    const lotsWithSpacesData: InputLot[] = []
    for (const regionLot of lotsData.lots) {
      try {
        const spacesData = await client.request<{ lot: InputLot | null }>(queries.getSpacesWithItems, { lotId: regionLot.id })
        if (spacesData.lot) {
          lotsWithSpacesData.push(spacesData.lot)
        }
      } catch (loadError: unknown) {
        console.error(`Failed to load spaces for lot ${regionLot.id}:`, loadError)
      }
    }

    simulationStore.loadWorldData(lotsWithSpacesData, regionId.value)

    for (const character of characters) {
      const characterHousehold = householdsData.households.find((household) =>
        household.characters.some((member) => member.id === character.id)
      )

      simulationStore.initializeCharacter({
        ...character,
        householdId: characterHousehold?.id ?? null,
        homeLotId: characterHousehold?.lotId ?? character.location?.id ?? null,
        homeLotName: characterHousehold?.lotName ?? character.location?.name ?? null,
        workSchedule: (character.workSchedule || []).map((shift) => ({
          day: shift.day,
          start: shift.start,
          end: shift.end,
          locationLotId: shift.location.id,
          locationLotName: shift.location.name
        }))
      })

      if (!character.location?.id) {
        continue
      }

      const lotDataForCharacter = simulationStore.worldData.lots[character.location.id]
      if (!lotDataForCharacter || lotDataForCharacter.spaceIds.length === 0) {
        continue
      }

      const firstSpaceId = lotDataForCharacter.spaceIds[0]
      const firstSpace = simulationStore.worldData.spaces[firstSpaceId]
      if (!firstSpace) {
        continue
      }

      simulationStore.updateCharacterLocation(
        character.id,
        regionId.value,
        character.location.id,
        character.location.name,
        firstSpace.id,
        firstSpace.name
      )
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load space data'
  } finally {
    loading.value = false
  }
}

const addItem = async () => {
  try {
    if (!spaceId.value) {
      error.value = 'Missing space id'
      return
    }

    saving.value = true
    error.value = null

    const itemId = crypto.randomUUID()

    const response = await client.request<{ createItem: SpaceItem }>(mutations.createItem, {
      input: {
        id: itemId,
        spaceId: spaceId.value,
        name: newItem.value.name,
        description: newItem.value.description,
        itemRoles: newItem.value.itemRoles,
        comfort: newItem.value.comfort,
        maxSimultaneousUsers: newItem.value.maxSimultaneousUsers || null,
        affordances: newItem.value.affordances
      }
    })

    items.value.push(response.createItem)

    newItem.value = { name: '', description: '', itemRoles: [], comfort: null, maxSimultaneousUsers: null, affordances: [] }
    showAddItemForm.value = false
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to add item'
  } finally {
    saving.value = false
  }
}

const startEditItem = (item: SpaceItem) => {
  editingItem.value = {
    ...item,
    affordances: item.affordances?.length
      ? [...item.affordances]
      : (item.allowedActivities || []).map((action) => ({ action, weight: 1 }))
  }
  showAddItemForm.value = false
}

const cancelEdit = () => {
  editingItem.value = null
}

const saveEdit = async () => {
  try {
    if (!editingItem.value) {
      return
    }

    saving.value = true
    error.value = null

    const response = await client.request<{ updateItem: SpaceItem }>(mutations.updateItem, {
      input: {
        id: editingItem.value.id,
        name: editingItem.value.name,
        description: editingItem.value.description,
        itemRoles: editingItem.value.itemRoles,
        comfort: editingItem.value.comfort,
        maxSimultaneousUsers: editingItem.value.maxSimultaneousUsers || null,
        affordances: editingItem.value.affordances || []
      }
    })

    const index = items.value.findIndex(item => item.id === editingItem.value?.id)
    if (index !== -1) {
      items.value[index] = response.updateItem
    }

    editingItem.value = null
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to update item'
  } finally {
    saving.value = false
  }
}

const removeItem = async (itemId: string) => {
  if (!confirm('Are you sure you want to remove this item?')) return

  try {
    error.value = null
    await client.request(mutations.deleteItem, { id: itemId })
    items.value = items.value.filter(item => item.id !== itemId)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to remove item'
  }
}

onMounted(() => {
  void loadData()
})

watch(spaceId, (newSpaceId, oldSpaceId) => {
  if (newSpaceId && newSpaceId !== oldSpaceId) {
    void loadData()
  }
})

const activeCharacter = computed(() => {
  const activeId = characterPanelStore.activeCharacterId
  if (!activeId) {
    return null
  }
  const charState = simulationStore.characterStates[activeId]
  return charState ? { id: activeId, ...charState } : null
})

function toggleAffordance(target: AffordanceTarget, action: ActionName, checked: boolean) {
  const affordances = [...(target.affordances || [])]
  if (checked) {
    if (!affordances.find((entry) => entry.action === action)) {
      affordances.push({ action, weight: 1 })
    }
    target.affordances = affordances
    return
  }

  target.affordances = affordances.filter((entry) => entry.action !== action)
}

function getAffordanceWeight(target: AffordanceTarget, action: ActionName): number {
  return target.affordances?.find((entry) => entry.action === action)?.weight ?? 1
}

function setAffordanceWeight(target: AffordanceTarget, action: ActionName, rawValue: string) {
  const weight = Number(rawValue) || 1
  target.affordances = (target.affordances || []).map((entry) =>
    entry.action === action ? { ...entry, weight } : entry
  )
}

function handleAffordanceToggle(target: AffordanceTarget, action: ActionName, event: Event) {
  const checkbox = event.target as HTMLInputElement | null
  toggleAffordance(target, action, checkbox?.checked ?? false)
}

function handleAffordanceWeightInput(target: AffordanceTarget, action: ActionName, event: Event) {
  const input = event.target as HTMLInputElement | null
  setAffordanceWeight(target, action, input?.value ?? '1')
}

function handleItemRoleToggle(target: { itemRoles: string[] }, role: string, event: Event) {
  const checkbox = event.target as HTMLInputElement | null
  if (checkbox?.checked) {
    if (!target.itemRoles.includes(role)) {
      target.itemRoles = [...target.itemRoles, role]
    }
    return
  }

  target.itemRoles = target.itemRoles.filter((entry) => entry !== role)
}

function formatItemRole(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getItemActions(item: SpaceItem): ActionName[] {
  if (item.allowedActivities?.length) {
    return item.allowedActivities
  }

  return (item.affordances || []).map((entry) => entry.action as ActionName)
}

function getItemAffordances(item: SpaceItem): ItemAffordance[] {
  if (item.affordances?.length) {
    return item.affordances
  }

  return (item.allowedActivities || []).map((action) => ({ action, weight: 1 }))
}

function queueItemAction(item: SpaceItem, action: ActionName) {
  if (!activeCharacter.value || !spaceId.value || !lotId.value) {
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

function getItemCardClass(item: ItemCard): string {
  if (editingItem.value?.id === item.id) {
    return 'border-blue-400 bg-blue-50 dark:bg-blue-950'
  }

  if (item.activeUsers?.length) {
    return 'border-blue-400 bg-blue-50 shadow-md ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/40 dark:ring-blue-800'
  }

  return 'border-gray-200 bg-gray-50 hover:border-blue-300 dark:bg-gray-900'
}
</script>
