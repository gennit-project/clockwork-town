<template>
  <div class="p-4">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div v-if="loading" class="text-center py-12">
      <p class="text-gf-text-faint">Loading...</p>
    </div>

    <div v-else-if="error" class="rounded border border-gf-red/40 bg-gf-red/10 p-4">
      <p class="text-gf-red">Error: {{ error }}</p>
    </div>

    <div v-else-if="household" class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-xl font-semibold text-gf-text">{{ household.name }}</h1>
          <p class="text-gf-text-weak mt-1">{{ household.lotName }}</p>
        </div>
        <div class="flex gap-3">
          <button
            @click="showSaveTemplateModal = true"
            class="rounded border border-gf-border bg-gf-green/15 px-3 py-1.5 text-sm font-medium text-gf-green hover:bg-gf-green/25"
          >
            Save as Template
          </button>
          <router-link
            :to="`/world/${worldId}/region/${regionId}/household/${householdId}/edit`"
            class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25"
          >
            Edit Household
          </router-link>
        </div>
      </div>

      <!-- Characters Section -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gf-text mb-4">Characters</h2>

        <div v-if="household.characters.length === 0" class="text-gf-text-weak text-center py-8 bg-gf-surface border border-gf-border rounded">
          No characters in this household.
        </div>

        <div v-else class="space-y-6">
          <div class="flex justify-end">
            <router-link
              :to="`/world/${worldId}/region/${regionId}/household/${householdId}/character/new`"
              class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25"
            >
              Add Character
            </router-link>
          </div>
          <div
            v-for="character in household.characters"
            :key="character.id"
            class="bg-gf-surface border border-gf-border p-6 rounded"
          >
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-xl font-semibold text-gf-text">{{ character.name }}</h3>
                <p class="text-sm text-gf-text-faint">Age: {{ character.age }}</p>
              </div>
              <router-link
                :to="`/world/${worldId}/region/${regionId}/character/${character.id}/edit`"
                class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-xs font-medium text-gf-text-weak hover:bg-gf-surface-2"
              >
                Edit Character
              </router-link>
            </div>

            <div v-if="character.bio" class="mt-4">

              <div class="bg-gf-surface-2 p-4 rounded">
                <MarkdownRenderer :text="character.bio" fontSize="small" />
              </div>
            </div>
            <div v-else class="text-gf-text-weak italic text-sm">
              No biography available.
            </div>
          </div>
        </div>
      </div>

      <!-- Animals Section -->
      <div v-if="household.animals && household.animals.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold text-gf-text mb-4">Pets</h2>
        <div class="space-y-6">
          <div
            v-for="animal in household.animals"
            :key="animal.id"
            class="bg-gf-surface p-6 rounded border border-gf-border"
          >
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-xl font-semibold text-gf-text">{{ animal.name }}</h3>
                <p class="text-sm text-gf-text-weak">Age: {{ animal.age }}</p>
                <p class="text-sm text-gf-text-weak" v-if="animal.traits && animal.traits.length > 0">
                  Traits: {{ animal.traits.join(', ') }}
                </p>
              </div>
            </div>

            <div v-if="animal.bio" class="mt-4">
              <div class="bg-gf-surface-2 p-4 rounded">
                <MarkdownRenderer :text="animal.bio" fontSize="small" />
              </div>
            </div>
            <div v-else class="text-gf-text-weak italic text-sm">
              No biography available.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save as Template Modal -->
    <div v-if="showSaveTemplateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-gf-surface border border-gf-border rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-semibold mb-4 text-gf-text">Save Household as Template</h2>
        <form @submit.prevent="saveAsTemplate">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gf-text-weak mb-2">
              Template Description (optional)
            </label>
            <textarea
              v-model="templateData.description"
              rows="3"
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
              placeholder="Describe this household template"
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
              placeholder="e.g., family, nuclear, starter"
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
import { ref, computed, onMounted } from 'vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
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

interface CharacterSummary {
  id: string
  name: string
  age: number
  bio?: string | null
}

interface AnimalSummary {
  id: string
  name: string
  age: number
  traits?: string[]
  bio?: string | null
}

interface HouseholdSummary {
  id: string
  name: string
  lotId: string
  lotName: string
  characters: CharacterSummary[]
  animals?: AnimalSummary[]
}

interface GetWorldResult {
  world: WorldSummary | null
}

interface GetRegionsResult {
  regions: RegionSummary[]
}

interface GetHouseholdResult {
  household: HouseholdSummary | null
}

const { worldId, regionId, householdId } = useRouteParams()

const household = ref<HouseholdSummary | null>(null)
const world = ref<WorldSummary | null>(null)
const region = ref<RegionSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const showSaveTemplateModal = ref(false)
const saving = ref(false)
const templateData = ref({ description: '', tagsInput: '' })

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: household.value?.name || 'Loading...', to: '#' }
])

const loadData = async () => {
  try {
    if (!worldId.value || !regionId.value || !householdId.value) {
      error.value = 'Missing route parameters'
      return
    }

    loading.value = true
    error.value = null
    const [worldData, regionsData, householdData] = await Promise.all([
      client.request<GetWorldResult>(queries.getWorld, { id: worldId.value }),
      client.request<GetRegionsResult>(queries.getRegions, { worldId: worldId.value }),
      client.request<GetHouseholdResult>(queries.getHousehold, { id: householdId.value })
    ])
    world.value = worldData.world
    region.value = regionsData.regions.find((entry) => entry.id === regionId.value) || null
    household.value = householdData.household
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load household'
  } finally {
    loading.value = false
  }
}

const closeSaveTemplateModal = () => {
  showSaveTemplateModal.value = false
  templateData.value = { description: '', tagsInput: '' }
}

const saveAsTemplate = async () => {
  try {
    if (!household.value) {
      return
    }

    saving.value = true
    error.value = null

    const tags = templateData.value.tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    const input = {
      householdName: household.value.name,
      householdDescription: templateData.value.description || '',
      characters: household.value.characters.map((character) => ({
        characterName: character.name,
        characterAge: character.age,
        characterBio: character.bio || ''
      })),
      animals: (household.value.animals || []).map((animal) => ({
        animalName: animal.name,
        animalAge: animal.age,
        animalTraits: animal.traits || []
      }))
    }

    await client.request(mutations.createHouseholdTemplate, { input, tags })

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

onMounted(() => {
  void loadData()
})
</script>
