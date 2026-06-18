<template>
  <div class="p-4">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-xl font-semibold text-gf-text">Lots</h1>
      <div class="flex space-x-3">
        <router-link
          :to="`/world/${worldId}/region/${regionId}/overview`"
          class="rounded border border-gf-border bg-gf-green/15 px-3 py-1.5 text-sm font-medium text-gf-green hover:bg-gf-green/25"
        >
          View Overview
        </router-link>
        <button
          @click="showCreateModal = true"
          class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25"
        >
          Create Lot
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gf-text-faint">Loading...</p>
    </div>

    <div v-else-if="error" class="border border-gf-red/40 bg-gf-red/10 rounded-md p-4">
      <p class="text-gf-red">Error: {{ error }}</p>
    </div>

    <div v-else-if="lots.length === 0" class="text-center py-12 bg-gf-surface border border-gf-border rounded-lg">
      <p class="text-gf-text-faint mb-4">No lots yet. Create your first lot!</p>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="lot in lots"
        :key="lot.id"
        class="bg-gf-surface border border-gf-border p-6 rounded-lg transition-colors"
      >
        <div class="flex justify-between items-start mb-2">
          <div>
            <h2 class="text-xl font-semibold text-gf-text">{{ lot.name }}</h2>

            <div v-if="getHouseholdForLot(lot.id)" class="mt-2">
              <p class="text-xs font-medium text-gf-text-weak">Household:</p>
              <p class="text-xs text-gf-text-weak">{{ getHouseholdForLot(lot.id)?.name }}</p>
              <p class="text-xs text-gf-text-faint">{{ getHouseholdForLot(lot.id)?.characters.length ?? 0 }} member(s)</p>
            </div>
          </div>
          <div class="flex space-x-2">
            <button
              @click="editLot(lot)"
              class="text-gf-blue hover:underline"
              title="Edit"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="confirmDelete(lot)"
              class="text-gf-red hover:opacity-80"
              title="Delete"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <router-link
          :to="`/world/${worldId}/region/${regionId}/lot/${lot.id}`"
          class="text-gf-blue hover:underline font-medium"
        >
          View Spaces →
        </router-link>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingLot" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-gf-surface border border-gf-border rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gf-text">
          {{ editingLot ? 'Edit Lot' : 'Create Lot' }}
        </h2>
        <form @submit.prevent="saveLot">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gf-text-weak mb-2">
              Lot Name
            </label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
              placeholder="Enter lot name"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gf-text-weak mb-2">
              Type
            </label>
            <select
              v-model="formData.lotType"
              required
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            >
              <option value="">Select type</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMUNITY">Community</option>
              <option value="GENERIC">Generic</option>
            </select>
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeModal"
              class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25 disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deletingLot" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-gf-surface border border-gf-border rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gf-text">Delete Lot</h2>
        <p class="mb-4 text-gf-text-weak">Are you sure you want to delete "{{ deletingLot.name }}"?</p>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="deletingLot = null"
            class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
          >
            Cancel
          </button>
          <button
            @click="deleteLot"
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
  lotType: string
}

interface HouseholdCharacterSummary {
  id: string
  name: string
  age: number
}

interface HouseholdSummary {
  id: string
  name: string
  lotId: string
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

const { worldId, regionId } = useRouteParams()

const lots = ref<LotSummary[]>([])
const households = ref<HouseholdSummary[]>([])
const world = ref<WorldSummary | null>(null)
const region = ref<RegionSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const showCreateModal = ref(false)
const editingLot = ref<LotSummary | null>(null)
const deletingLot = ref<LotSummary | null>(null)
const saving = ref(false)
const formData = ref({ name: '', lotType: '' })

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: 'Lots', to: '#' }
])

const getHouseholdForLot = (lotId: string): HouseholdSummary | undefined => {
  return households.value.find((household) => household.lotId === lotId)
}

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
    error.value = e instanceof Error ? e.message : 'Failed to load lots'
  } finally {
    loading.value = false
  }
}

const editLot = (lot: LotSummary) => {
  editingLot.value = lot
  formData.value = { name: lot.name, lotType: lot.lotType }
}

const confirmDelete = (lot: LotSummary) => {
  deletingLot.value = lot
}

const closeModal = () => {
  showCreateModal.value = false
  editingLot.value = null
  formData.value = { name: '', lotType: '' }
}

const saveLot = async () => {
  try {
    if (!regionId.value) {
      error.value = 'Missing region id'
      return
    }

    saving.value = true
    if (editingLot.value) {
      await client.request(mutations.updateLot, {
        id: editingLot.value.id,
        name: formData.value.name,
        lotType: formData.value.lotType
      })
    } else {
      await client.request(mutations.createLot, {
        input: {
          id: crypto.randomUUID(),
          regionId: regionId.value,
          name: formData.value.name,
          lotType: formData.value.lotType
        }
      })
    }
    closeModal()
    await loadData()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save lot'
  } finally {
    saving.value = false
  }
}

const deleteLot = async () => {
  try {
    if (!deletingLot.value) {
      return
    }

    saving.value = true
    await client.request(mutations.deleteLot, { id: deletingLot.value.id })
    deletingLot.value = null
    await loadData()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to delete lot'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadData()
})
</script>
