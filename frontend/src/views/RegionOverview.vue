<template>
  <div class="h-screen flex flex-col">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Region Overview: {{ region?.name || 'Loading...' }}</h1>
      <div class="flex space-x-3 items-center">
        <!-- Expand/Collapse All Button -->
        <button
          @click="toggleAllLots"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium"
          title="Expand or collapse all lot cards"
        >
          {{ allLotsExpanded ? '▼ Collapse All' : '▶ Expand All' }}
        </button>

        <!-- Debug Toggle Button -->
        <button
          @click="showDebugPanel = !showDebugPanel"
          class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-medium"
          title="Toggle debug action panel"
        >
          🔧 Debug
        </button>

        <button
          @click="showEditModal = true"
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
        >
          Edit Region
        </button>
        <router-link
          :to="`/world/${worldId}/region/${regionId}/lots`"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Manage Lots & Households
        </router-link>
      </div>
    </div>

    <!-- Debug Panel -->
    <DebugActionPanel
      v-if="showDebugPanel && !loading && !error"
      :characters="characters"
      @close="showDebugPanel = false"
    />

    <AsyncContainer
      :loading="loading"
      :error="error ?? undefined"
      :is-empty="lotsWithSpaces.length === 0"
      empty-message="No lots in this region yet."
    >
      <template #empty>
        <p class="text-gray-500 dark:text-gray-300 mb-4">No lots in this region yet.</p>
        <router-link
          :to="`/world/${worldId}/region/${regionId}`"
          class="text-blue-600 hover:text-blue-800 font-medium"
        >
          Go to Region to create lots
        </router-link>
      </template>

      <div class="flex-1 flex gap-4 p-4 overflow-auto">
      <!-- Three Column Layout -->
      <!-- Residential Column -->
      <LotColumn
        title="Residential"
        :lots="residentialLots"
        :world-id="worldId || ''"
        :region-id="regionId || ''"
        :expanded-lots="expandedLots"
        :characters-by-lot="charactersByLot"
        :characters-by-space="charactersBySpace"
        variant="blue"
        empty-message="No residential lots yet"
        @toggle-expanded="toggleLotRooms"
      />

      <!-- Community Column -->
      <LotColumn
        title="Community"
        :lots="communityLots"
        :world-id="worldId || ''"
        :region-id="regionId || ''"
        :expanded-lots="expandedLots"
        :characters-by-lot="charactersByLot"
        :characters-by-space="charactersBySpace"
        variant="green"
        empty-message="No community lots yet"
        @toggle-expanded="toggleLotRooms"
      />
      </div>
    </AsyncContainer>

    <!-- Edit Region Modal -->
    <Modal :is-open="showEditModal" title="Edit Region" @close="closeEditModal">
      <form @submit.prevent="saveRegion">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Region Name
          </label>
          <input
            v-model="formData.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter region name"
          />
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type
          </label>
          <input
            v-model="formData.kind"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., urban, rural, mountain"
          />
        </div>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="closeEditModal"
            :disabled="saving"
            class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100 disabled:opacity-50"
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
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { gql } from 'graphql-request'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import AsyncContainer from '../components/AsyncContainer.vue'
import Modal from '../components/Modal.vue'
import LotColumn from '../components/LotColumn.vue'
import DebugActionPanel from '../components/DebugActionPanel.vue'
import { client, queries } from '../graphql'
import { useSimulationStore } from '../stores/simulation'
import { useRouteParams } from '../composables/useRouteParams'
import { useBreadcrumbs } from '../composables/useBreadcrumbs'
import type { InputLot } from '../stores/types'

const simulationStore = useSimulationStore()
const { worldId, regionId } = useRouteParams()
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

interface CharacterLocationSummary {
  id: string
  name: string
}

interface CharacterSummary {
  id: string
  name: string
  age: number
  bio?: string | null
  location?: CharacterLocationSummary | null
}

interface AnimalSummary {
  id: string
  name: string
  age: number
  traits?: string[]
  bio?: string | null
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

interface HouseholdSummary {
  id: string
  lotId?: string | null
  lotName?: string | null
  characters: Array<{ id: string }>
}

interface GetHouseholdsResult {
  households: HouseholdSummary[]
}

interface GetRegionResult {
  region?: {
    characters?: CharacterSummary[]
    animals?: AnimalSummary[]
  } | null
}

const lotsWithSpaces = ref<InputLot[]>([])
const world = ref<WorldSummary | null>(null)
const region = ref<RegionSummary | null>(null)
const characters = ref<CharacterSummary[]>([])
const animals = ref<AnimalSummary[]>([])
const expandedLots = ref<Record<string, boolean>>({})
const loading = ref(true)
const error = ref<string | null>(null)
const showEditModal = ref(false)
const showDebugPanel = ref(false)
const formData = ref({ name: '', kind: '' })
const saving = ref(false)

const breadcrumbs = computed(() => buildBreadcrumbs({
  worldId: worldId.value,
  regionId: regionId.value,
  world: world.value ?? undefined,
  region: region.value ?? undefined,
  current: 'Overview'
}))

const residentialLots = computed(() =>
  lotsWithSpaces.value.filter(lot => lot.lotType === 'RESIDENTIAL')
)

const communityLots = computed(() =>
  lotsWithSpaces.value.filter(lot => lot.lotType === 'COMMUNITY')
)

const charactersByLot = computed<Record<string, CharacterSummary[]>>(() => {
  const byLot: Record<string, CharacterSummary[]> = {}
  characters.value.forEach(char => {
    const charState = simulationStore.characterStates[char.id]
    const currentLotId = charState?.location?.lotId || char.location?.id

    if (currentLotId) {
      if (!byLot[currentLotId]) {
        byLot[currentLotId] = []
      }
      byLot[currentLotId].push(char)
    }
  })
  return byLot
})

const charactersBySpace = computed<Record<string, CharacterSummary[]>>(() => {
  const bySpace: Record<string, CharacterSummary[]> = {}
  characters.value.forEach(char => {
    const charState = simulationStore.characterStates[char.id]
    if (charState?.location?.spaceId) {
      if (!bySpace[charState.location.spaceId]) {
        bySpace[charState.location.spaceId] = []
      }
      bySpace[charState.location.spaceId].push(char)
    }
  })
  return bySpace
})

const allLotsExpanded = computed(() => {
  const lotIds = Object.keys(expandedLots.value)
  return lotIds.length > 0 && lotIds.every(id => expandedLots.value[id])
})

const toggleLotRooms = (lotId: string) => {
  expandedLots.value[lotId] = !expandedLots.value[lotId]
}

const toggleAllLots = () => {
  const shouldExpand = !allLotsExpanded.value
  const newExpandedState: Record<string, boolean> = {}
  lotsWithSpaces.value.forEach(lot => {
    newExpandedState[lot.id] = shouldExpand
  })
  expandedLots.value = newExpandedState
}

const MUTATION_UPDATE_REGION = gql`
  mutation UpdateRegion($id: ID!, $name: String!, $kind: String!) {
    updateRegion(id: $id, name: $name, kind: $kind) {
      id
      name
      kind
    }
  }
`

const closeEditModal = () => {
  showEditModal.value = false
  formData.value = { name: '', kind: '' }
}

const saveRegion = async () => {
  try {
    if (!regionId.value) {
      error.value = 'Missing region id'
      return
    }

    saving.value = true
    await client.request(MUTATION_UPDATE_REGION, {
      id: regionId.value,
      name: formData.value.name,
      kind: formData.value.kind
    })
    closeEditModal()
    await loadData()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update region'
    error.value = message
    alert('Error updating region: ' + message)
  } finally {
    saving.value = false
  }
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
    region.value = regionsData.regions.find(r => r.id === regionId.value) || null

    if (region.value) {
      formData.value = {
        name: region.value.name,
        kind: region.value.kind
      }
    }

    const lots = lotsData.lots || []
    const lotsWithSpacesData = await Promise.all(
      lots.map(async (lot): Promise<InputLot> => {
        try {
          const spacesData = await client.request<{ lot: InputLot | null }>(queries.getSpacesWithItems, { lotId: lot.id })
          return {
            ...lot,
            indoorRooms: spacesData.lot?.indoorRooms || [],
            outdoorAreas: spacesData.lot?.outdoorAreas || []
          }
        } catch (e: unknown) {
          console.error(`Error loading spaces for lot ${lot.id}:`, e)
          return {
            ...lot,
            indoorRooms: [],
            outdoorAreas: []
          }
        }
      })
    )

    lotsWithSpaces.value = lotsWithSpacesData

    const expandedState: Record<string, boolean> = {}
    lotsWithSpacesData.forEach(lot => {
      expandedState[lot.id] = true
    })
    expandedLots.value = expandedState

    simulationStore.loadWorldData(lotsWithSpacesData, regionId.value)

    const households = householdsData.households || []

    try {
      const regionData = await client.request<GetRegionResult>(queries.getRegion, { id: regionId.value })
      characters.value = regionData.region?.characters || []
      animals.value = regionData.region?.animals || []

      for (const character of characters.value) {
        const household = households.find((entry) => entry.characters.some((member) => member.id === character.id))
        simulationStore.initializeCharacter({
          ...character,
          householdId: household?.id ?? null,
          homeLotId: household?.lotId ?? character.location?.id ?? null,
          homeLotName: household?.lotName ?? character.location?.name ?? null
        })
      }
    } catch (e: unknown) {
      console.error('Error loading characters and animals:', e)
      characters.value = []
      animals.value = []
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load region overview'
  } finally {
    loading.value = false
  }
}

watch(characters, (newCharacters: CharacterSummary[]) => {
  for (const character of newCharacters) {
    if (!character.location?.id || !regionId.value) {
      continue
    }

    const lot = simulationStore.worldData.lots[character.location.id]
    if (!lot || lot.spaceIds.length === 0) {
      continue
    }

    const firstSpaceId = lot.spaceIds[0]
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
})

onMounted(() => {
  void loadData()
})
</script>
