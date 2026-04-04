<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">Error: {{ error }}</p>
    </div>

    <div v-else>
      <!-- Lots Section -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Lots</h2>
          <div class="flex space-x-3">
            <router-link
              to="/library/lots"
              class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
            >
              Create Lot from Template
            </router-link>
            <router-link
              :to="`/world/${worldId}/region/${regionId}/overview`"
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
            >
              ← Back to Overview
            </router-link>
          </div>
        </div>

        <div v-if="lots.length === 0" class="text-center py-8 bg-white rounded-lg shadow">
          <p class="text-gray-500">No lots yet. Create your first lot!</p>
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="lot in lots"
            :key="lot.id"
            class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            @click="viewLot(lot.id)"
          >
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ lot.name }}</h3>
            <div class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View Spaces →
            </div>
          </div>
        </div>
      </div>

      <!-- Households Section -->
      <div>
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Households</h2>
          <router-link
            :to="`/world/${worldId}/region/${regionId}/household/new`"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Create Household
          </router-link>
        </div>

        <div v-if="households.length === 0" class="text-center py-8 bg-white rounded-lg shadow">
          <p class="text-gray-500">No households yet. Create your first household!</p>
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="household in households"
            :key="household.id"
            class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            @click="viewHousehold(household.id)"
          >
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ household.name }}</h3>
                <p class="text-sm text-gray-500">{{ household.lotName }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ household.characters.length }} member(s)</p>
              </div>
              <div class="flex space-x-2" @click.stop>
                <router-link
                  :to="`/world/${worldId}/region/${regionId}/household/${household.id}/edit`"
                  class="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </router-link>
                <button
                  @click="confirmDeleteHousehold(household)"
                  class="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="household.characters.length > 0" class="mt-2">
              <p class="text-xs font-medium text-gray-700 mb-1">Members:</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="char in household.characters"
                  :key="char.id"
                  class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                >
                  {{ char.name }} ({{ char.age }})
                </span>
              </div>
            </div>
          </div>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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
}

interface LotSummary {
  id: string
  name: string
}

interface HouseholdCharacterSummary {
  id: string
  name: string
  age: number
}

interface HouseholdSummary {
  id: string
  name: string
  lotName: string
  characters: HouseholdCharacterSummary[]
}

interface GetWorldResult {
  world: WorldSummary | null
}

interface GetRegionsResult {
  regions: RegionSummary[]
}

interface GetLotsResult {
  lots: LotSummary[]
}

interface GetHouseholdsResult {
  households: HouseholdSummary[]
}

const router = useRouter()
const { worldId, regionId } = useRouteParams()

const region = ref<RegionSummary | null>(null)
const world = ref<WorldSummary | null>(null)
const lots = ref<LotSummary[]>([])
const households = ref<HouseholdSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const deletingHousehold = ref<HouseholdSummary | null>(null)
const saving = ref(false)

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}/overview` },
  { label: 'Manage Lots & Households', to: '#' }
])

const loadData = async () => {
  try {
    if (!worldId.value || !regionId.value) {
      error.value = 'Missing route parameters'
      return
    }

    loading.value = true
    error.value = null
    const [worldData, regionsData, lotsData, householdsData] = await Promise.all([
      client.request<GetWorldResult>(queries.getWorld, { id: worldId.value }),
      client.request<GetRegionsResult>(queries.getRegions, { worldId: worldId.value }),
      client.request<GetLotsResult>(queries.getLots, { regionId: regionId.value }),
      client.request<GetHouseholdsResult>(queries.getHouseholds, { regionId: regionId.value })
    ])
    world.value = worldData.world
    region.value = regionsData.regions.find((entry) => entry.id === regionId.value) || null
    lots.value = lotsData.lots || []
    households.value = householdsData.households || []
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load lots and households'
  } finally {
    loading.value = false
  }
}

const confirmDeleteHousehold = (household: HouseholdSummary) => {
  deletingHousehold.value = household
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

const viewLot = (lotId: string) => {
  router.push(`/world/${worldId.value}/region/${regionId.value}/lot/${lotId}`)
}

const viewHousehold = (householdId: string) => {
  router.push(`/world/${worldId.value}/region/${regionId.value}/household/${householdId}`)
}

onMounted(() => {
  void loadData()
})
</script>
