<template>
  <div class="p-4">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-xl font-semibold text-gf-text">{{ lot?.name || 'Loading...' }}</h1>
      <div class="flex gap-3">
        <button
          @click="showSaveTemplateModal = true"
          class="rounded border border-gf-border bg-gf-green/15 px-3 py-1.5 text-sm font-medium text-gf-green hover:bg-gf-green/25"
        >
          Save as Template
        </button>
        <button
          @click="showCreateModal = true"
          class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25"
        >
          Create Space
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gf-text-faint">Loading...</p>
    </div>

    <div v-else-if="error" class="border border-gf-red/40 bg-gf-red/10 rounded-md p-4">
      <p class="text-gf-red">Error: {{ error }}</p>
    </div>

    <div v-else-if="allSpaces.length === 0" class="text-center py-12 bg-gf-surface border border-gf-border rounded-lg">
      <p class="text-gf-text-faint mb-4">No spaces yet. Create your first space!</p>
    </div>

    <div v-else>
      <!-- Household Info Banner -->
      <div v-if="household" class="mb-6 bg-gf-surface-2 border border-gf-border rounded-lg p-3">
        <h2 class="text-base font-semibold text-gf-text mb-2">{{ household.name }}</h2>
        <div v-if="household.characters.length > 0" class="flex flex-wrap gap-2">
          <span
            v-for="char in household.characters"
            :key="char.id"
            class="text-sm bg-gf-surface text-gf-text-weak px-3 py-1 rounded-full border border-gf-border"
          >
            {{ char.name }} - <span :class="isCharacterAtLot(char.id) ? 'text-gf-green font-medium' : 'text-gf-text-faint'">{{ isCharacterAtLot(char.id) ? 'here' : 'away' }}</span>
          </span>
        </div>
      </div>

      <div v-if="indoorSpaces.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold text-gf-text mb-4">Indoor Rooms ({{ indoorSpaces.length }})</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="space in indoorSpaces"
            :key="space.id"
            class="relative group"
          >
            <div
              class="cursor-pointer"
              @click="viewSpace(space)"
            >
              <SpaceCard :space="space" :characters="charactersBySpace[space.id] || []" />
            </div>
            <div class="absolute top-5 right-5 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
              <button
                @click="editSpace(space)"
                class="text-gf-blue hover:opacity-80 bg-gf-surface-3 border border-gf-border rounded-full p-2"
                title="Edit"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click="confirmDelete(space)"
                class="text-gf-red hover:opacity-80 bg-gf-surface-3 border border-gf-border rounded-full p-2"
                title="Delete"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="outdoorSpaces.length > 0">
        <h2 class="text-xl font-semibold text-gf-text mb-4">Outdoor Areas ({{ outdoorSpaces.length }})</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="space in outdoorSpaces"
            :key="space.id"
            class="relative group"
          >
            <div
              class="cursor-pointer"
              @click="viewSpace(space)"
            >
              <SpaceCard :space="space" :characters="charactersBySpace[space.id] || []" />
            </div>
            <div class="absolute top-5 right-5 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
              <button
                @click="editSpace(space)"
                class="text-gf-blue hover:opacity-80 bg-gf-surface-3 border border-gf-border rounded-full p-2"
                title="Edit"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click="confirmDelete(space)"
                class="text-gf-red hover:opacity-80 bg-gf-surface-3 border border-gf-border rounded-full p-2"
                title="Delete"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingSpace" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-gf-surface border border-gf-border rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gf-text">
          {{ editingSpace ? 'Edit Space' : 'Create Space' }}
        </h2>
        <form @submit.prevent="saveSpace">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gf-text-weak mb-2">
              Space Name
            </label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
              placeholder="Enter space name"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gf-text-weak mb-2">
              Description
            </label>
            <textarea
              v-model="formData.description"
              required
              rows="3"
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
              placeholder="Enter description"
            ></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gf-text-weak mb-2">
              Type
            </label>
            <select
              v-model="formData.isIndoor"
              required
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
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
    <div v-if="deletingSpace" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-gf-surface border border-gf-border rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gf-text">Delete Space</h2>
        <p class="mb-4 text-gf-text-weak">Are you sure you want to delete "{{ deletingSpace.name }}"?</p>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="deletingSpace = null"
            class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
          >
            Cancel
          </button>
          <button
            @click="deleteSpace"
            :disabled="saving"
            class="rounded border border-gf-border bg-gf-red/15 px-3 py-1.5 text-sm text-gf-red hover:bg-gf-red/25 disabled:opacity-50"
          >
            {{ saving ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Save as Template Modal -->
    <div v-if="showSaveTemplateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-gf-surface border border-gf-border rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gf-text">Save Lot as Template</h2>
        <form @submit.prevent="saveAsTemplate">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gf-text-weak mb-2">
              Template Description (optional)
            </label>
            <textarea
              v-model="templateData.description"
              rows="3"
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
              placeholder="Describe this template"
            ></textarea>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gf-text-weak mb-2">
              Tags (comma-separated)
            </label>
            <input
              v-model="templateData.tagsInput"
              type="text"
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
              placeholder="e.g., residential, starter, cozy"
            />
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeSaveTemplateModal"
              class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="rounded border border-gf-border bg-gf-green/15 px-3 py-1.5 text-sm font-medium text-gf-green hover:bg-gf-green/25 disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Template' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SpaceCard from '../components/SpaceCard.vue'
import { client, queries, mutations } from '../graphql'
import { useSimulationStore } from '../stores/simulation'
import type { InputLot, InputSpace } from '../stores/types'
import { useRouteParams } from '../composables/useRouteParams'

const simulationStore = useSimulationStore()
const router = useRouter()
const { worldId, regionId, lotId } = useRouteParams()

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

interface CharacterLocationSummary {
  id: string
  name: string
}

interface CharacterSummary {
  id: string
  name: string
  age: number
  workSchedule?: Array<{
    day: string
    start: string
    end: string
    location: { id: string; name: string }
  }>
  location?: CharacterLocationSummary | null
}

interface HouseholdSummary {
  id: string
  name: string
  lotId: string
  lotName: string
  characters: CharacterSummary[]
}

interface SpaceSummary extends InputSpace {
  description: string
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

interface GetRegionResult {
  region?: {
    characters?: CharacterSummary[]
  } | null
}

interface GetSpacesWithItemsResult {
  lot: InputLot
}

const indoorSpaces = ref<SpaceSummary[]>([])
const outdoorSpaces = ref<SpaceSummary[]>([])
const world = ref<WorldSummary | null>(null)
const region = ref<RegionSummary | null>(null)
const lot = ref<LotSummary | null>(null)
const household = ref<HouseholdSummary | null>(null)
const characters = ref<CharacterSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const showCreateModal = ref(false)
const editingSpace = ref<SpaceSummary | null>(null)
const deletingSpace = ref<SpaceSummary | null>(null)
const saving = ref(false)
const formData = ref<{ name: string; description: string; isIndoor: boolean | '' }>({ name: '', description: '', isIndoor: '' })
const showSaveTemplateModal = ref(false)
const templateData = ref({ description: '', tagsInput: '' })

const allSpaces = computed(() => [...indoorSpaces.value, ...outdoorSpaces.value])

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

const isCharacterAtLot = (characterId: string): boolean => {
  const char = characters.value.find(c => c.id === characterId)
  return char?.location?.id === lotId.value
}

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: lot.value?.name || 'Loading...', to: '#' }
])

const loadData = async () => {
  try {
    if (!worldId.value || !regionId.value || !lotId.value) {
      error.value = 'Missing route parameters'
      return
    }

    loading.value = true
    error.value = null
    const [worldData, regionsData, lotsData, householdsData, regionData] = await Promise.all([
      client.request<GetWorldResult>(queries.getWorld, { id: worldId.value }),
      client.request<GetRegionsResult>(queries.getRegions, { worldId: worldId.value }),
      client.request<GetLotsResult>(queries.getLots, { regionId: regionId.value }),
      client.request<GetHouseholdsResult>(queries.getHouseholds, { regionId: regionId.value }),
      client.request<GetRegionResult>(queries.getRegion, { id: regionId.value })
    ])

    world.value = worldData.world
    region.value = regionsData.regions.find(r => r.id === regionId.value) || null
    lot.value = lotsData.lots.find(l => l.id === lotId.value) || null
    household.value = householdsData.households.find(h => h.lotId === lotId.value) || null
    characters.value = regionData.region?.characters || []

    const lotsWithSpacesData: InputLot[] = []
    for (const regionLot of lotsData.lots) {
      try {
        const spacesData = await client.request<GetSpacesWithItemsResult>(queries.getSpacesWithItems, { lotId: regionLot.id })
        lotsWithSpacesData.push(spacesData.lot)
      } catch (e: unknown) {
        console.error(`Failed to load spaces for lot ${regionLot.id}:`, e)
      }
    }

    simulationStore.loadWorldData(lotsWithSpacesData, regionId.value, worldId.value)

    const currentLotData = lotsWithSpacesData.find(currentLot => currentLot.id === lotId.value)
    if (currentLotData) {
      indoorSpaces.value = (currentLotData.indoorRooms || []) as SpaceSummary[]
      outdoorSpaces.value = (currentLotData.outdoorAreas || []) as SpaceSummary[]
    }

    for (const character of characters.value) {
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

      const lotData = simulationStore.worldData.lots[character.location.id]
      if (!lotData || lotData.spaceIds.length === 0) {
        continue
      }

      const firstSpaceId = lotData.spaceIds[0]
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
    error.value = e instanceof Error ? e.message : 'Failed to load data'
  } finally {
    loading.value = false
  }
}

const editSpace = (space: SpaceSummary) => {
  editingSpace.value = space
  const isIndoor = indoorSpaces.value.some(currentSpace => currentSpace.id === space.id)
  formData.value = {
    name: space.name,
    description: space.description || '',
    isIndoor
  }
}

const confirmDelete = (space: SpaceSummary) => {
  deletingSpace.value = space
}

const closeModal = () => {
  showCreateModal.value = false
  editingSpace.value = null
  formData.value = { name: '', description: '', isIndoor: '' }
}

const saveSpace = async () => {
  try {
    if (!lotId.value) {
      error.value = 'Missing lot id'
      return
    }

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
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save space'
  } finally {
    saving.value = false
  }
}

const deleteSpace = async () => {
  try {
    if (!deletingSpace.value) {
      return
    }

    saving.value = true
    await client.request(mutations.deleteSpace, { id: deletingSpace.value.id })
    deletingSpace.value = null
    await loadData()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to delete space'
  } finally {
    saving.value = false
  }
}

const viewSpace = (space: SpaceSummary) => {
  router.push(`/world/${worldId.value}/region/${regionId.value}/lot/${lotId.value}/space/${space.id}`)
}

const closeSaveTemplateModal = () => {
  showSaveTemplateModal.value = false
  templateData.value = { description: '', tagsInput: '' }
}

const saveAsTemplate = async () => {
  try {
    if (!lotId.value) {
      error.value = 'Missing lot id'
      return
    }

    saving.value = true
    error.value = null

    const lotData = await client.request<GetSpacesWithItemsResult>(queries.getSpacesWithItems, { lotId: lotId.value })
    const tags = templateData.value.tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    const input = {
      lotName: lotData.lot.name,
      lotType: lotData.lot.lotType,
      lotDescription: templateData.value.description || '',
      indoorRooms: (lotData.lot.indoorRooms || []).map(room => ({
        spaceName: room.name,
        spaceDescription: room.description || '',
        items: (room.items || []).map(item => ({
          itemName: item.name,
          itemDescription: item.description || '',
          itemCount: 1
        }))
      })),
      outdoorSpaces: (lotData.lot.outdoorAreas || []).map(area => ({
        spaceName: area.name,
        spaceDescription: area.description || '',
        items: (area.items || []).map(item => ({
          itemName: item.name,
          itemDescription: item.description || '',
          itemCount: 1
        }))
      }))
    }

    await client.request(mutations.createLotTemplate, { input, tags })

    alert('Template saved successfully!')
    closeSaveTemplateModal()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to save template'
    error.value = message
    alert('Error saving template: ' + message)
  } finally {
    saving.value = false
  }
}

onMounted(loadData)

watch(lotId, (newLotId, oldLotId) => {
  if (newLotId && newLotId !== oldLotId) {
    void loadData()
  }
})
</script>
