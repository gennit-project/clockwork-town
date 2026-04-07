<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="mx-auto max-w-3xl">
      <h1 class="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">{{ isCreating ? 'Create Character' : 'Edit Character' }}</h1>

      <div v-if="loading" class="py-12 text-center text-gray-500">
        Loading...
      </div>

      <div v-else-if="error" class="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
        {{ error }}
      </div>

      <form v-else @submit.prevent="saveCharacter" class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div class="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Age</label>
            <input
              v-model.number="formData.age"
              type="number"
              min="0"
              required
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div class="mb-6">
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Bio</label>
          <textarea
            v-model="formData.bio"
            rows="6"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div class="mb-6">
          <div class="mb-3 flex items-center justify-between">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Work Schedule</label>
            <button
              type="button"
              class="text-sm font-medium text-blue-600 hover:text-blue-800"
              @click="addWorkShift"
            >
              + Add Shift
            </button>
          </div>

          <div v-if="formData.workSchedule.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
            No scheduled shifts yet.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(shift, index) in formData.workSchedule"
              :key="`${shift.day}-${shift.start}-${index}`"
              class="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
            >
              <div class="mb-2 flex justify-end">
                <button
                  type="button"
                  class="text-xs text-red-600 hover:text-red-800"
                  @click="removeWorkShift(index)"
                >
                  Remove Shift
                </button>
              </div>
              <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Day</label>
                  <select v-model="shift.day" class="w-full rounded-md border border-gray-300 px-2 py-2 text-sm">
                    <option v-for="weekday in weekdayOptions" :key="weekday" :value="weekday">
                      {{ weekday }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Start</label>
                  <input v-model="shift.start" type="time" class="w-full rounded-md border border-gray-300 px-2 py-2 text-sm">
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">End</label>
                  <input v-model="shift.end" type="time" class="w-full rounded-md border border-gray-300 px-2 py-2 text-sm">
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Workplace</label>
                  <select v-model="shift.locationLotId" class="w-full rounded-md border border-gray-300 px-2 py-2 text-sm">
                    <option value="">Select lot</option>
                    <option v-for="lot in lots" :key="lot.id" :value="lot.id">
                      {{ lot.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <button type="button" class="px-4 py-2 text-gray-700 dark:text-gray-200" @click="goBack">
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : 'Save Character' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import { client, queries } from '../graphql'
import { useRouteParams } from '../composables/useRouteParams'
import { createCharacterDetails, persistCharacterDetails } from '../stores/simulationPersistence'
import { useSimulationStore } from '../stores/simulation'

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

interface CharacterResult {
  character: {
    id: string
    name: string
    age: number
    bio?: string | null
    workSchedule?: Array<{
      day: string
      start: string
      end: string
      location: {
        id: string
        name: string
      }
    }>
  } | null
}

interface HouseholdResult {
  household: {
    lotId: string
  } | null
}

const router = useRouter()
const simulationStore = useSimulationStore()
const { worldId, regionId, householdId, characterId } = useRouteParams()
const isCreating = computed(() => !characterId.value)

const world = ref<WorldSummary | null>(null)
const region = ref<RegionSummary | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const lots = ref<LotSummary[]>([])
const householdLotId = ref<string | null>(null)
const weekdayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const formData = ref({
  name: '',
  age: 0,
  bio: '',
  workSchedule: [] as Array<{
    day: string
    start: string
    end: string
    locationLotId: string
  }>
})

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: isCreating.value ? 'Create Character' : 'Edit Character', to: '#' }
])

function addWorkShift() {
  formData.value.workSchedule.push({
    day: 'Monday',
    start: '09:00',
    end: '17:00',
    locationLotId: lots.value[0]?.id || ''
  })
}

function removeWorkShift(index: number) {
  formData.value.workSchedule.splice(index, 1)
}

async function loadData() {
  try {
    if (!worldId.value || !regionId.value) {
      error.value = 'Missing route parameters'
      return
    }

    loading.value = true
    error.value = null

    const [worldData, regionsData, lotsData] = await Promise.all([
      client.request<{ world: WorldSummary | null }>(queries.getWorld, { id: worldId.value }),
      client.request<{ regions: RegionSummary[] }>(queries.getRegions, { worldId: worldId.value }),
      client.request<{ lots: LotSummary[] }>(queries.getLots, { regionId: regionId.value })
    ])

    world.value = worldData.world
    region.value = regionsData.regions.find((entry) => entry.id === regionId.value) || null
    lots.value = lotsData.lots || []

    if (isCreating.value) {
      if (householdId.value) {
        const householdData = await client.request<HouseholdResult>(queries.getHousehold, { id: householdId.value })
        householdLotId.value = householdData.household?.lotId ?? null
      }
      return
    }

    if (!characterId.value) {
      error.value = 'Character not found'
      return
    }

    const characterData = await client.request<CharacterResult>(queries.getCharacter, { id: characterId.value })
    if (!characterData.character) {
      error.value = 'Character not found'
      return
    }

    formData.value = {
      name: characterData.character.name,
      age: characterData.character.age,
      bio: characterData.character.bio || '',
      workSchedule: (characterData.character.workSchedule || []).map((shift) => ({
        day: shift.day,
        start: shift.start,
        end: shift.end,
        locationLotId: shift.location.id
      }))
    }
  } catch (loadError: unknown) {
    error.value = loadError instanceof Error ? loadError.message : 'Failed to load character'
  } finally {
    loading.value = false
  }
}

async function saveCharacter() {
  try {
    saving.value = true
    error.value = null

    const normalizedWorkSchedule = formData.value.workSchedule.map((shift) => ({
      day: shift.day,
      start: shift.start,
      end: shift.end,
      locationLotId: shift.locationLotId
    }))

    let savedCharacterId = characterId.value

    if (isCreating.value) {
      if (!householdId.value) {
        throw new Error('Missing household id for new character')
      }

      savedCharacterId = crypto.randomUUID()
      const homeLotId = householdLotId.value || lots.value[0]?.id
      if (!homeLotId) {
        throw new Error('No lots available for new character')
      }

      await createCharacterDetails({
        id: savedCharacterId,
        name: formData.value.name,
        age: formData.value.age,
        bio: formData.value.bio,
        homeLotId,
        householdId: householdId.value,
        workSchedule: normalizedWorkSchedule
      })
    } else if (savedCharacterId) {
      await persistCharacterDetails({
        id: savedCharacterId,
        name: formData.value.name,
        age: formData.value.age,
        bio: formData.value.bio,
        workSchedule: normalizedWorkSchedule
      })
    }

    if (savedCharacterId) {
      const state = simulationStore.characterStates[savedCharacterId]
      if (state) {
        state.name = formData.value.name
        state.workSchedule = normalizedWorkSchedule.map((shift) => ({
          day: shift.day,
          start: shift.start,
          end: shift.end,
          locationLotId: shift.locationLotId,
          locationLotName: lots.value.find((lot) => lot.id === shift.locationLotId)?.name ?? null
        }))
      }
    }

    goBack()
  } catch (saveError: unknown) {
    error.value = saveError instanceof Error ? saveError.message : 'Failed to save character'
  } finally {
    saving.value = false
  }
}

function goBack() {
  if (householdId.value && worldId.value && regionId.value) {
    router.push(`/world/${worldId.value}/region/${regionId.value}/household/${householdId.value}`)
    return
  }

  router.back()
}

onMounted(() => {
  void loadData()
})
</script>
