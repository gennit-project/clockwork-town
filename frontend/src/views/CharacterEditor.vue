<template>
  <div class="p-4">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="mx-auto max-w-3xl">
      <h1 class="mb-6 text-xl font-semibold text-gf-text">{{ isCreating ? 'Create Character' : 'Edit Character' }}</h1>

      <div v-if="loading" class="py-12 text-center text-gf-text-faint">
        Loading...
      </div>

      <div v-else-if="error" class="mb-4 rounded border border-gf-red/40 bg-gf-red/10 p-4 text-gf-red">
        {{ error }}
      </div>

      <form v-else @submit.prevent="saveCharacter" class="rounded-lg border border-gf-border bg-gf-surface p-6">
        <div class="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-gf-text-weak">Name</label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-gf-text-weak">Age</label>
            <input
              v-model.number="formData.age"
              type="number"
              min="0"
              required
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            />
          </div>
        </div>

        <div class="mb-6">
          <label class="mb-2 block text-sm font-medium text-gf-text-weak">Bio</label>
          <textarea
            v-model="formData.bio"
            rows="6"
            class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
          />
        </div>

        <div class="mb-6">
          <label class="mb-2 block text-sm font-medium text-gf-text-weak">Traits</label>
          <div v-if="availableTraits.length === 0" class="text-sm text-gf-text-faint">
            No traits available.
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <button
              v-for="trait in availableTraits"
              :key="trait.id"
              type="button"
              :title="trait.description"
              :aria-pressed="formData.traitIds.includes(trait.id)"
              class="rounded border px-2.5 py-1 text-xs transition-colors"
              :class="formData.traitIds.includes(trait.id)
                ? 'border-gf-blue bg-gf-blue/20 text-gf-blue'
                : 'border-gf-border bg-gf-surface-2 text-gf-text-weak hover:bg-gf-surface-3'"
              @click="toggleTrait(trait.id)"
            >
              {{ trait.name }}
            </button>
          </div>
        </div>

        <div class="mb-6">
          <label class="mb-1 block text-sm font-medium text-gf-text-weak">Values</label>
          <p class="mb-2 text-xs text-gf-text-faint">
            Ranked by importance, most important first. Neglecting a value drags mood down.
          </p>

          <div v-if="formData.valueIds.length === 0" class="mb-2 text-sm text-gf-text-faint">
            No values yet.
          </div>
          <ol v-else class="mb-2 space-y-2">
            <li
              v-for="(valueId, index) in formData.valueIds"
              :key="valueId"
              class="flex items-center gap-3 rounded border border-gf-border bg-gf-surface-2 px-3 py-2"
            >
              <span class="w-5 text-center text-xs font-semibold text-gf-text-faint">{{ index + 1 }}</span>
              <div class="min-w-0 flex-1">
                <div class="text-sm text-gf-text">{{ valueName(valueId) }}</div>
                <div class="text-xs text-gf-text-faint">{{ valueActivities(valueId) }}</div>
              </div>
              <button
                type="button"
                class="rounded border border-gf-border px-2 py-0.5 text-xs text-gf-text-weak hover:bg-gf-surface-3 disabled:opacity-30"
                :disabled="index === 0"
                :aria-label="`Move ${valueName(valueId)} up`"
                @click="moveValue(index, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="rounded border border-gf-border px-2 py-0.5 text-xs text-gf-text-weak hover:bg-gf-surface-3 disabled:opacity-30"
                :disabled="index === formData.valueIds.length - 1"
                :aria-label="`Move ${valueName(valueId)} down`"
                @click="moveValue(index, 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="text-xs text-gf-red hover:opacity-80"
                :aria-label="`Remove ${valueName(valueId)}`"
                @click="removeValue(index)"
              >
                Remove
              </button>
            </li>
          </ol>

          <select
            v-if="unusedValues.length > 0"
            v-model="valueToAdd"
            aria-label="Add a value"
            class="rounded border border-gf-border bg-gf-bg px-2 py-1.5 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            @change="addSelectedValue"
          >
            <option value="">+ Add a value…</option>
            <option v-for="value in unusedValues" :key="value.id" :value="value.id">
              {{ value.name }}
            </option>
          </select>
        </div>

        <div class="mb-6">
          <label class="mb-1 block text-sm font-medium text-gf-text-weak">Opinions</label>
          <p class="mb-2 text-xs text-gf-text-faint">
            What they approve or disapprove of seeing other people do. Disapproval lowers their feelings
            toward whoever does it and files a ticket.
          </p>
          <ul class="space-y-2">
            <li
              v-for="topic in approvalTopics"
              :key="topic.id"
              class="flex items-center justify-between gap-3 rounded border border-gf-border bg-gf-surface-2 px-3 py-2"
            >
              <span class="text-sm text-gf-text">{{ topic.label }}</span>
              <div class="flex gap-1" role="group" :aria-label="`Opinion about ${topic.label}`">
                <button
                  v-for="option in stanceOptions"
                  :key="option.key"
                  type="button"
                  :aria-pressed="stanceOf(topic.id) === option.value"
                  class="rounded border px-2 py-0.5 text-xs transition-colors"
                  :class="stanceOf(topic.id) === option.value ? option.activeClass : 'border-gf-border bg-gf-surface text-gf-text-weak hover:bg-gf-surface-3'"
                  @click="setStance(topic.id, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div class="mb-6">
          <div class="mb-3 flex items-center justify-between">
            <label class="block text-sm font-medium text-gf-text-weak">Work Schedule</label>
            <button
              type="button"
              class="text-sm font-medium text-gf-blue hover:underline"
              @click="addWorkShift"
            >
              + Add Shift
            </button>
          </div>

          <div v-if="formData.workSchedule.length === 0" class="text-sm text-gf-text-faint">
            No scheduled shifts yet.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(shift, index) in formData.workSchedule"
              :key="`${shift.day}-${shift.start}-${index}`"
              class="rounded border border-gf-border bg-gf-surface-2 p-4"
            >
              <div class="mb-2 flex items-center justify-between">
                <span
                  v-if="shift.activity === 'sleep'"
                  class="rounded border border-gf-border bg-gf-surface-3 px-1.5 py-0.5 text-[11px] text-gf-text-weak"
                >
                  Sleep block (at home)
                </span>
                <span v-else />
                <button
                  type="button"
                  class="text-xs text-gf-red hover:opacity-80"
                  @click="removeWorkShift(index)"
                >
                  Remove Shift
                </button>
              </div>
              <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <label class="mb-1 block text-xs font-medium text-gf-text-weak">Day</label>
                  <select v-model="shift.day" class="w-full rounded border border-gf-border bg-gf-bg px-2 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue">
                    <option v-for="weekday in weekdayOptions" :key="weekday" :value="weekday">
                      {{ weekday }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gf-text-weak">Start</label>
                  <input v-model="shift.start" type="time" class="w-full rounded border border-gf-border bg-gf-bg px-2 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue">
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gf-text-weak">End</label>
                  <input v-model="shift.end" type="time" class="w-full rounded border border-gf-border bg-gf-bg px-2 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue">
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-gf-text-weak">Workplace</label>
                  <select v-model="shift.locationLotId" class="w-full rounded border border-gf-border bg-gf-bg px-2 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue">
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
          <button type="button" class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2" @click="goBack">
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25 disabled:opacity-50"
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
import { pinDisabledNeeds } from '../stores/utils/traitEffects'
import { describeAction, getValueDef } from '../stores/utils/valueEffects'
import { mergeValueSeed, toValueSeed } from '../stores/utils/valueSeed'
import { fromStanceRecord, toStanceSeed } from '../stores/utils/stanceSeed'
import { APPROVAL_TOPICS } from '../stores/config/approvalTopics'
import type { StanceValue } from '../stores/types'

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
    traits?: Array<{ id: string; name: string }>
    values?: Array<{ id: string; name: string }>
    stances?: Array<{ topicId: string; stance: string }>
    workSchedule?: Array<{
      day: string
      start: string
      end: string
      activity?: string | null
      location: {
        id: string
        name: string
      }
    }>
  } | null
}

interface TraitOption {
  id: string
  name: string
  description: string
}

interface ValueOption {
  id: string
  name: string
  description: string
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

const availableTraits = ref<TraitOption[]>([])
const availableValues = ref<ValueOption[]>([])
const valueToAdd = ref('')
const approvalTopics = APPROVAL_TOPICS
const stanceOptions = [
  { key: 'disapproves', value: 'disapproves' as const, label: 'Disapproves', activeClass: 'border-gf-red bg-gf-red/20 text-gf-red' },
  { key: 'neutral', value: null, label: 'Neutral', activeClass: 'border-gf-blue bg-gf-blue/20 text-gf-blue' },
  { key: 'approves', value: 'approves' as const, label: 'Approves', activeClass: 'border-gf-green bg-gf-green/20 text-gf-green' }
]

const formData = ref({
  name: '',
  age: 0,
  bio: '',
  traitIds: [] as string[],
  /** Value ids in rank order, most important first. */
  valueIds: [] as string[],
  /** Topic id -> stance; a topic that is absent is neutral. */
  stances: {} as Record<string, StanceValue>,
  workSchedule: [] as Array<{
    day: string
    start: string
    end: string
    // Preserved from the loaded shift so editing never turns a sleep block into work.
    activity?: string | null
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
    activity: 'work',
    locationLotId: lots.value[0]?.id || ''
  })
}

function toggleTrait(traitId: string) {
  const ids = formData.value.traitIds
  const index = ids.indexOf(traitId)
  if (index === -1) {
    ids.push(traitId)
  } else {
    ids.splice(index, 1)
  }
}

const unusedValues = computed(() =>
  availableValues.value.filter((value) => !formData.value.valueIds.includes(value.id))
)

function valueName(valueId: string): string {
  return availableValues.value.find((value) => value.id === valueId)?.name ?? valueId
}

function valueActivities(valueId: string): string {
  const actions = getValueDef(valueId)?.actions
  return actions ? `Fulfilled by: ${actions.map(describeAction).join(', ')}` : 'No activities mapped yet'
}

function addSelectedValue() {
  if (valueToAdd.value && !formData.value.valueIds.includes(valueToAdd.value)) {
    formData.value.valueIds.push(valueToAdd.value)
  }
  valueToAdd.value = ''
}

function moveValue(index: number, delta: -1 | 1) {
  const ids = formData.value.valueIds
  const target = index + delta
  if (target < 0 || target >= ids.length) return
  ;[ids[index], ids[target]] = [ids[target], ids[index]]
}

function removeValue(index: number) {
  formData.value.valueIds.splice(index, 1)
}

const stanceOf = (topicId: string): StanceValue | null => formData.value.stances[topicId] ?? null

function setStance(topicId: string, stance: StanceValue | null) {
  const next = { ...formData.value.stances }
  if (stance) {
    next[topicId] = stance
  } else {
    delete next[topicId]
  }
  formData.value.stances = next
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

    const [worldData, regionsData, lotsData, traitsData, valuesData] = await Promise.all([
      client.request<{ world: WorldSummary | null }>(queries.getWorld, { id: worldId.value }),
      client.request<{ regions: RegionSummary[] }>(queries.getRegions, { worldId: worldId.value }),
      client.request<{ lots: LotSummary[] }>(queries.getLots, { regionId: regionId.value }),
      client.request<{ traits: TraitOption[] }>(queries.getTraits),
      client.request<{ values: ValueOption[] }>(queries.getValues)
    ])
    availableTraits.value = traitsData.traits || []
    availableValues.value = valuesData.values || []

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
      traitIds: (characterData.character.traits || []).map((trait) => trait.id),
      valueIds: (characterData.character.values || []).map((value) => value.id),
      stances: toStanceSeed(characterData.character.stances).stances,
      workSchedule: (characterData.character.workSchedule || []).map((shift) => ({
        day: shift.day,
        start: shift.start,
        end: shift.end,
        activity: shift.activity ?? null,
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
      activity: shift.activity ?? null,
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
        traitIds: formData.value.traitIds,
        valueIds: formData.value.valueIds,
        stances: fromStanceRecord(formData.value.stances),
        workSchedule: normalizedWorkSchedule
      })
    } else if (savedCharacterId) {
      await persistCharacterDetails({
        id: savedCharacterId,
        name: formData.value.name,
        age: formData.value.age,
        bio: formData.value.bio,
        traitIds: formData.value.traitIds,
        valueIds: formData.value.valueIds,
        stances: fromStanceRecord(formData.value.stances),
        workSchedule: normalizedWorkSchedule
      })
    }

    if (savedCharacterId) {
      const state = simulationStore.characterStates[savedCharacterId]
      if (state) {
        state.name = formData.value.name
        state.traitIds = [...formData.value.traitIds]
        state.traits = formData.value.traitIds.map(
          (id) => availableTraits.value.find((trait) => trait.id === id)?.name ?? id
        )
        state.stances = { ...formData.value.stances }
        pinDisabledNeeds(state.needs, state.traitIds)
        state.values = mergeValueSeed(
          toValueSeed(formData.value.valueIds.map((id) => ({ id, name: valueName(id) }))).values,
          state.values
        )
        state.workSchedule = normalizedWorkSchedule.map((shift) => ({
          day: shift.day,
          start: shift.start,
          end: shift.end,
          activity: shift.activity,
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
