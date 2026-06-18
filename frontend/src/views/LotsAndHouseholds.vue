<template>
  <div class="p-4">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div v-if="loading" class="text-center py-12">
      <p class="text-gf-text-faint">Loading...</p>
    </div>

    <div v-else-if="error" class="rounded border border-gf-red/40 bg-gf-red/10 p-4">
      <p class="text-gf-red">Error: {{ error }}</p>
    </div>

    <div v-else>
      <!-- Lots Section -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gf-text">Lots</h2>
          <div class="flex space-x-3">
            <router-link
              to="/library/lots"
              class="rounded border border-gf-border bg-gf-purple/15 px-3 py-1.5 text-sm font-medium text-gf-purple hover:bg-gf-purple/25"
            >
              Create Lot from Template
            </router-link>
            <router-link
              :to="`/world/${worldId}/region/${regionId}/overview`"
              class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
            >
              ← Back to Overview
            </router-link>
          </div>
        </div>

        <div v-if="lots.length === 0" class="text-center py-8 bg-gf-surface border border-gf-border rounded">
          <p class="text-gf-text-faint">No lots yet. Create your first lot!</p>
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="lot in lots"
            :key="lot.id"
            class="bg-gf-surface border border-gf-border p-4 rounded transition-colors hover:border-gf-border-weak cursor-pointer"
            @click="viewLot(lot.id)"
          >
            <h3 class="text-lg font-semibold text-gf-text">{{ lot.name }}</h3>
            <div class="text-gf-blue hover:underline text-sm font-medium">
              View Spaces →
            </div>
          </div>
        </div>
      </div>

      <!-- Households Section -->
      <div>
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gf-text">Households</h2>
          <router-link
            :to="`/world/${worldId}/region/${regionId}/household/new`"
            class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25"
          >
            Create Household
          </router-link>
        </div>

        <div v-if="households.length === 0" class="text-center py-8 bg-gf-surface border border-gf-border rounded">
          <p class="text-gf-text-faint">No households yet. Create your first household!</p>
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="household in households"
            :key="household.id"
            class="bg-gf-surface border border-gf-border p-4 rounded transition-colors hover:border-gf-border-weak cursor-pointer"
            @click="viewHousehold(household.id)"
          >
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="text-lg font-semibold text-gf-text">{{ household.name }}</h3>
                <p class="text-sm text-gf-text-faint">{{ household.lotName }}</p>
                <p class="text-xs text-gf-text-faint mt-1">{{ household.characters.length }} member(s)</p>
              </div>
              <div class="flex space-x-2" @click.stop>
                <router-link
                  :to="`/world/${worldId}/region/${regionId}/household/${household.id}/edit`"
                  class="text-gf-blue hover:underline"
                  title="Edit"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </router-link>
                <button
                  @click="confirmDeleteHousehold(household)"
                  class="text-gf-red hover:opacity-80"
                  title="Delete"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="household.characters.length > 0" class="mt-2">
              <p class="text-xs font-medium text-gf-text-weak mb-1">Members:</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="char in household.characters"
                  :key="char.id"
                  class="text-xs border border-gf-border bg-gf-surface-3 text-gf-text-weak px-2 py-1 rounded"
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
      <div class="bg-gf-surface border border-gf-border rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4 text-gf-text">Delete Household</h2>
        <p class="mb-4 text-gf-text-weak">Are you sure you want to delete "{{ deletingHousehold.name }}"? This will also delete all characters in the household.</p>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="deletingHousehold = null"
            class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
          >
            Cancel
          </button>
          <button
            @click="deleteHousehold"
            :disabled="saving"
            class="rounded border border-gf-border bg-gf-red/15 px-3 py-1.5 text-sm text-gf-red hover:bg-gf-red/25 disabled:opacity-50"
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
