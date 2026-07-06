<template>
  <div class="flex h-full flex-col p-4">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-semibold text-gf-text">Region Overview: {{ region?.name || 'Loading…' }}</h1>
        <span
          class="flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium"
          :style="{ backgroundColor: timeOfDay.bg, color: timeOfDay.fg, borderColor: timeOfDay.border }"
          :title="`${timeOfDay.weekday} · ${timeOfDay.clock}`"
        >
          <span class="leading-none">{{ timeOfDay.icon }}</span>
          <span>{{ timeOfDay.label }}</span>
          <span class="opacity-70">· {{ timeOfDay.weekday }} {{ timeOfDay.clock }}</span>
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="showDebugPanel = !showDebugPanel"
          class="whitespace-nowrap rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
          title="Toggle debug action panel"
        >
          Debug
        </button>
        <button
          @click="showEditModal = true"
          class="whitespace-nowrap rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
        >
          Edit region
        </button>
        <router-link
          :to="`/world/${worldId}/region/${regionId}/lots`"
          class="whitespace-nowrap rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm text-gf-blue hover:bg-gf-blue/25"
        >
          Manage lots &amp; households
        </router-link>
      </div>
    </div>

    <!-- Control bar -->
    <div class="mb-3 flex flex-wrap items-center gap-2 rounded border border-gf-border bg-gf-surface px-2 py-1.5">
      <div class="flex overflow-hidden rounded border border-gf-border">
        <button
          @click="viewMode = 'map'"
          class="px-3 py-1 text-xs font-medium"
          :class="viewMode === 'map' ? 'bg-gf-blue/20 text-gf-blue' : 'text-gf-text-weak hover:bg-gf-surface-2'"
        >
          Residents
        </button>
        <button
          @click="viewMode = 'nested'"
          class="border-l border-gf-border px-3 py-1 text-xs font-medium"
          :class="viewMode === 'nested' ? 'bg-gf-blue/20 text-gf-blue' : 'text-gf-text-weak hover:bg-gf-surface-2'"
        >
          Rooms
        </button>
      </div>
      <span class="ml-1 text-xs text-gf-text-faint">Fill by</span>
      <select
        v-model="fillMetric"
        class="rounded border border-gf-border bg-gf-bg px-2 py-1 text-xs text-gf-text focus:outline-none"
      >
        <option v-for="opt in FILL_OPTIONS" :key="opt.value" :value="opt.value" class="bg-gf-surface">
          {{ opt.label }}
        </option>
      </select>
      <span class="rounded border border-gf-border bg-gf-bg px-2 py-1 text-xs text-gf-text-faint">avg</span>
      <span class="rounded border border-gf-border bg-gf-bg px-2 py-1 text-xs text-gf-text-faint">Size by: —</span>
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
        <p class="mb-4 text-gf-text-weak">No lots in this region yet.</p>
        <router-link
          :to="`/world/${worldId}/region/${regionId}`"
          class="font-medium text-gf-blue hover:underline"
        >
          Go to Region to create lots
        </router-link>
      </template>

      <!-- Fill-metric color scale, prominent above the map -->
      <div class="mb-3 flex shrink-0 items-center gap-2 rounded border border-gf-border bg-gf-surface px-3 py-2">
        <span class="text-xs font-medium text-gf-text-weak">{{ fillLabel }}</span>
        <span class="text-[11px] text-gf-text-faint">0%</span>
        <span class="h-2.5 flex-1 rounded" :style="{ background: gradient }" />
        <span class="text-[11px] text-gf-text-faint">100%</span>
      </div>

      <!-- Resident-health host map (default) -->
      <Panel v-if="viewMode === 'map'" title="Resident health" class="flex-1 overflow-auto">
        <HexMap
          :groups="hexGroups"
          @select="onSelectHex"
          @select-building="onSelectBuilding"
        />
      </Panel>

      <!-- Nested rooms: residents as hexes inside room hexes -->
      <Panel v-else title="Rooms &amp; residents" class="flex-1 overflow-auto">
        <NestedHexMap
          :groups="nestedGroups"
          @select="onSelectHex"
          @select-room="onSelectRoom"
          @select-building="onSelectBuilding"
        />
      </Panel>
    </AsyncContainer>

    <!-- Character detail popover (opened by clicking a hex) -->
    <div
      v-if="panelCharacter"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeCharacterPopover"
    >
      <div class="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-lg shadow-xl">
        <CharacterDetailPanel
          :character="panelCharacter"
          :available-romance-targets="characters"
          class="min-h-0 flex-1"
          @close="closeCharacterPopover"
        />
        <button
          class="flex items-center justify-center gap-1.5 border border-t-0 border-gf-border bg-gf-surface-2 px-3 py-2.5 text-sm font-medium text-gf-blue transition-colors hover:bg-gf-surface-3"
          @click="goToCharacterLot(panelCharacter.id)"
        >
          Go to {{ panelCharacter.name }}'s current lot
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>

    <!-- Edit Region Modal -->
    <Modal :is-open="showEditModal" title="Edit Region" @close="closeEditModal">
      <form @submit.prevent="saveRegion">
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium text-gf-text-weak">
            Region Name
          </label>
          <input
            v-model="formData.name"
            type="text"
            required
            class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            placeholder="Enter region name"
          />
        </div>
        <div class="mb-4">
          <label class="mb-2 block text-sm font-medium text-gf-text-weak">
            Type
          </label>
          <input
            v-model="formData.kind"
            type="text"
            required
            class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            placeholder="e.g., urban, rural, mountain"
          />
        </div>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="closeEditModal"
            :disabled="saving"
            class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2 disabled:opacity-50"
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
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { gql } from 'graphql-request'
import { useRouter } from 'vue-router'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import AsyncContainer from '../components/AsyncContainer.vue'
import Modal from '../components/Modal.vue'
import Panel from '../components/Panel.vue'
import DebugActionPanel from '../components/DebugActionPanel.vue'
import HexMap, { type HexGroup } from '../components/charts/HexMap.vue'
import NestedHexMap, { type NestedBuilding } from '../components/charts/NestedHexMap.vue'
import CharacterDetailPanel from '../components/CharacterDetailPanel.vue'
import { useCharacterPanelStore } from '../stores/characterPanel'
import { VIRIDIS_GRADIENT as gradient } from '../charts/viridis'
import { client, queries } from '../graphql'
import { useSimulationStore } from '../stores/simulation'
import { useRouteParams } from '../composables/useRouteParams'
import { useBreadcrumbs } from '../composables/useBreadcrumbs'
import { computeCharacterHappiness } from '../stores/utils/happinessMetrics'
import type { InputLot, InputSpace, NeedName } from '../stores/types'

const simulationStore = useSimulationStore()
const characterPanelStore = useCharacterPanelStore()
const router = useRouter()
const { worldId, regionId } = useRouteParams()
const { buildBreadcrumbs } = useBreadcrumbs()

// Character clicked on the hex map — shows the detail popover.
const panelCharacter = ref<CharacterSummary | null>(null)

type FillMetric = 'happiness' | NeedName

const viewMode = ref<'map' | 'nested'>('map')
const fillMetric = ref<FillMetric>('happiness')

// Day/night indicator for the region header — makes day-vs-night screenshots
// read at a glance and mirrors where the schedule sends everyone.
const timeOfDay = computed(() => {
  const dt = simulationStore.simulationDateTime
  const h = dt.hour
  let phase: { icon: string; label: string; bg: string; fg: string; border: string }
  if (h >= 22 || h < 6) {
    phase = { icon: '🌙', label: 'Night', bg: 'rgba(74,94,168,0.18)', fg: '#aab7e6', border: 'rgba(74,94,168,0.55)' }
  } else if (h < 8) {
    phase = { icon: '🌅', label: 'Dawn', bg: 'rgba(230,150,90,0.18)', fg: '#e6a878', border: 'rgba(230,150,90,0.55)' }
  } else if (h < 18) {
    phase = { icon: '☀️', label: 'Daytime', bg: 'rgba(240,190,80,0.18)', fg: '#e8c561', border: 'rgba(240,190,80,0.55)' }
  } else {
    phase = { icon: '🌇', label: 'Evening', bg: 'rgba(220,120,90,0.18)', fg: '#e0977a', border: 'rgba(220,120,90,0.55)' }
  }
  const hr12 = ((h + 11) % 12) + 1
  const clock = `${hr12}:${String(dt.minute).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
  return { ...phase, clock, weekday: dt.weekday }
})

const FILL_OPTIONS: { value: FillMetric; label: string }[] = [
  { value: 'happiness', label: 'Happiness' },
  { value: 'food', label: 'Food' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'bladder', label: 'Bladder' },
  { value: 'hygiene', label: 'Hygiene' },
  { value: 'health', label: 'Health' },
  { value: 'friends', label: 'Friends' },
  { value: 'family', label: 'Family' },
  { value: 'romance', label: 'Romance' },
  { value: 'fulfillment', label: 'Fulfillment' }
]

const fillLabel = computed(
  () => FILL_OPTIONS.find((o) => o.value === fillMetric.value)?.label ?? 'Happiness'
)

function metricValue(characterId: string): number {
  const state = simulationStore.characterStates[characterId]
  if (!state) {
    return 0
  }
  if (fillMetric.value === 'happiness') {
    return computeCharacterHappiness(state.needs)
  }
  return state.needs[fillMetric.value] ?? 0
}

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
  workSchedule?: Array<{
    day: string
    start: string
    end: string
    activity?: string | null
    location: { id: string; name: string }
  }>
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

const hexGroups = computed<HexGroup[]>(() => {
  const groups: HexGroup[] = []
  const claimed = new Set<string>()

  for (const lot of lotsWithSpaces.value) {
    const occupants = charactersByLot.value[lot.id] || []
    occupants.forEach((c) => claimed.add(c.id))
    groups.push({
      key: lot.id,
      label: lot.name,
      kind: lot.lotType === 'RESIDENTIAL' ? 'residential' : lot.lotType === 'COMMUNITY' ? 'community' : 'other',
      tint: lot.lotType === 'RESIDENTIAL' ? 'rgba(50,116,217,0.10)' : 'rgba(115,191,105,0.10)',
      nodes: occupants.map((c) => ({ id: c.id, name: c.name, value: metricValue(c.id) }))
    })
  }

  // Residents currently outside this region's known lots.
  const elsewhere = characters.value.filter((c) => !claimed.has(c.id))
  if (elsewhere.length > 0) {
    groups.push({
      key: '__elsewhere__',
      label: 'Elsewhere',
      nodes: elsewhere.map((c) => ({ id: c.id, name: c.name, value: metricValue(c.id) }))
    })
  }

  return groups
})

const nestedGroups = computed<NestedBuilding[]>(() => {
  const buildings: NestedBuilding[] = []
  const claimed = new Set<string>()

  const buildRoom = (space: InputSpace, outdoor: boolean) => {
    const occupants = charactersBySpace.value[space.id] || []
    occupants.forEach((c) => claimed.add(c.id))
    return {
      id: space.id,
      name: space.name,
      description: space.description,
      outdoor,
      occupants: occupants.map((c) => ({ id: c.id, name: c.name, value: metricValue(c.id) })),
      objects: (space.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        inUse: simulationStore.getItemActiveUsers(item.id).length > 0,
        detail: item.description
      }))
    }
  }

  for (const lot of lotsWithSpaces.value) {
    buildings.push({
      key: lot.id,
      label: lot.name,
      section: lot.lotType === 'RESIDENTIAL' ? 'Residential' : 'Community',
      tint: lot.lotType === 'RESIDENTIAL' ? 'rgba(50,116,217,0.06)' : 'rgba(115,191,105,0.06)',
      rooms: [
        ...(lot.indoorRooms || []).map((space) => buildRoom(space, false)),
        ...(lot.outdoorAreas || []).map((space) => buildRoom(space, true))
      ]
    })
  }

  const elsewhere = characters.value.filter((c) => !claimed.has(c.id))
  if (elsewhere.length > 0) {
    buildings.push({
      key: '__elsewhere__',
      label: 'Elsewhere',
      rooms: [
        {
          id: '__elsewhere_room__',
          name: 'Off the map',
          description: 'Residents not currently in a known room',
          occupants: elsewhere.map((c) => ({ id: c.id, name: c.name, value: metricValue(c.id) }))
        }
      ]
    })
  }

  return buildings
})

function onSelectHex(characterId: string) {
  const char = characters.value.find((c) => c.id === characterId)
  if (!char) {
    return
  }
  panelCharacter.value = char
  // Hydrate relationships/memories for the panel's tabs.
  void characterPanelStore.loadCharacterDetails(characterId)
}

function closeCharacterPopover() {
  panelCharacter.value = null
}

// Navigate to the character's current lot/space (the popover's "go there" link).
function goToCharacterLot(characterId: string) {
  const state = simulationStore.characterStates[characterId]
  const lotId = state?.location?.lotId
  const spaceId = state?.location?.spaceId
  if (worldId.value && regionId.value && lotId) {
    router.push(spaceId
      ? `/world/${worldId.value}/region/${regionId.value}/lot/${lotId}/space/${spaceId}`
      : `/world/${worldId.value}/region/${regionId.value}/lot/${lotId}`)
  }
  closeCharacterPopover()
}

function onSelectRoom(spaceId: string) {
  const lotId = simulationStore.worldData.spaces[spaceId]?.lotId
  if (worldId.value && regionId.value && lotId) {
    router.push(`/world/${worldId.value}/region/${regionId.value}/lot/${lotId}/space/${spaceId}`)
  }
}

function onSelectBuilding(lotId: string) {
  if (worldId.value && regionId.value && simulationStore.worldData.lots[lotId]) {
    router.push(`/world/${worldId.value}/region/${regionId.value}/lot/${lotId}`)
  }
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

    simulationStore.loadWorldData(lotsWithSpacesData, regionId.value, worldId.value)

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
          homeLotName: household?.lotName ?? character.location?.name ?? null,
          workSchedule: (character.workSchedule || []).map((shift) => ({
            day: shift.day,
            start: shift.start,
            end: shift.end,
            activity: shift.activity,
            locationLotId: shift.location.id,
            locationLotName: shift.location.name
          }))
        })
      }

      for (const animal of animals.value) {
        simulationStore.initializeAnimal({ id: animal.id, name: animal.name, traits: animal.traits })
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

// Refetch when the world/region changes (e.g. via the world switcher), since
// vue-router reuses this component across param-only navigations.
watch([worldId, regionId], () => {
  void loadData()
})
</script>
