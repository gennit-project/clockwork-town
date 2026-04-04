<template>
  <div>
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Loading template...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading template: {{ error.message }}</p>
    </div>

    <div v-else-if="template">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3">
              <router-link
                to="/library/households"
                class="text-gray-400 hover:text-gray-600 dark:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
              </router-link>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ template.name }}</h1>
            </div>
            <p v-if="template.description" class="mt-2 text-gray-600 dark:text-gray-300">
              {{ template.description }}
            </p>
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              @click="openEditModal"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Edit Template
            </button>
            <button
              type="button"
              @click="showCloneModal = true"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Place in World
            </button>
          </div>
        </div>

        <div v-if="template.tags && template.tags.length > 0" class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="tag in template.tags"
            :key="tag"
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:text-gray-200 dark:bg-gray-700"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- Characters -->
      <div v-if="template.characters && template.characters.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Characters ({{ template.characters.length }})</h2>
        <div class="space-y-4">
          <div
            v-for="(character, index) in template.characters"
            :key="index"
            class="bg-white dark:bg-gray-800 shadow rounded-lg p-5"
          >
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ character.name }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Age: {{ character.age }}</p>
            <div v-if="character.bio" class="mt-3">
              <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <MarkdownRenderer :text="character.bio" fontSize="small" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Animals -->
      <div v-if="template.animals && template.animals.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Pets ({{ template.animals.length }})</h2>
        <div class="space-y-4">
          <div
            v-for="(animal, index) in template.animals"
            :key="index"
            class="bg-amber-50 dark:bg-amber-950 shadow rounded-lg p-5 border border-amber-200 dark:border-amber-800"
          >
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ animal.name }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">Age: {{ animal.age }}</p>
            <p v-if="animal.traits && animal.traits.length > 0" class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Traits: {{ animal.traits.join(', ') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="(!template.characters || template.characters.length === 0) && (!template.animals || template.animals.length === 0)" class="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p class="text-gray-500">This template has no characters or animals defined.</p>
      </div>
    </div>

    <!-- Edit Template Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full my-8">
        <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Edit Household Template</h2>

        <form @submit.prevent="saveTemplate" class="space-y-6">
          <!-- Template Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Name *
            </label>
            <input
              v-model="editForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter template name"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              v-model="editForm.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Describe this household template"
            ></textarea>
          </div>

          <!-- Tags -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              v-model="editForm.tagsInput"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., family, nuclear, starter"
            />
          </div>

          <!-- Characters Section -->
          <div>
            <div class="flex justify-between items-center mb-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Characters *
              </label>
              <button
                type="button"
                @click="addCharacter"
                class="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                + Add Character
              </button>
            </div>

            <div v-if="editForm.characters.length === 0" class="text-gray-500 dark:text-gray-300 text-sm">
              No characters yet. Click "Add Character" to create one.
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="(character, index) in editForm.characters"
                :key="index"
                class="border border-gray-300 dark:border-gray-600 rounded-md p-4 relative bg-white dark:bg-gray-700"
              >
                <button
                  type="button"
                  @click="removeCharacter(index)"
                  class="absolute top-2 right-2 text-red-600 hover:text-red-800"
                  title="Remove character"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div class="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      v-model="character.name"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="Character name"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Age *
                    </label>
                    <input
                      v-model.number="character.age"
                      type="number"
                      required
                      min="0"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="Age"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    v-model="character.bio"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="Optional bio (supports markdown)"
                    rows="4"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Animals Section -->
          <div>
            <div class="flex justify-between items-center mb-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Animals (Pets)
              </label>
              <button
                type="button"
                @click="addAnimal"
                class="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                + Add Animal
              </button>
            </div>

            <div v-if="editForm.animals.length === 0" class="text-gray-500 dark:text-gray-300 text-sm">
              No animals yet. Click "Add Animal" to add a pet.
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="(animal, index) in editForm.animals"
                :key="index"
                class="border border-amber-300 dark:border-amber-700 rounded-md p-4 relative bg-amber-50 dark:bg-amber-950"
              >
                <button
                  type="button"
                  @click="removeAnimal(index)"
                  class="absolute top-2 right-2 text-red-600 hover:text-red-800"
                  title="Remove animal"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div class="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      v-model="animal.name"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="Animal name"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Age *
                    </label>
                    <input
                      v-model.number="animal.age"
                      type="number"
                      required
                      min="0"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="Age"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Traits (comma separated)
                  </label>
                  <input
                    v-model="animal.traitsString"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="e.g., friendly, playful, loyal"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              :disabled="saving || editForm.characters.length === 0"
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Template' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Clone to World Modal -->
    <div v-if="showCloneModal" class="fixed inset-0 bg-black dark:text-white bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Place Household in World</h2>

        <form @submit.prevent="cloneTemplate">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Select World
            </label>
            <select
              v-model="selectedWorldId"
              @change="onWorldChange"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select a world --</option>
              <option v-for="world in worlds" :key="world.id" :value="world.id">
                {{ world.name }}
              </option>
            </select>
          </div>

          <div v-if="selectedWorldId" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Select Region
            </label>
            <select
              v-model="selectedRegionId"
              @change="onRegionChange"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select a region --</option>
              <option v-for="region in regions" :key="region.id" :value="region.id">
                {{ region.name }}
              </option>
            </select>
          </div>

          <div v-if="selectedRegionId" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Select Lot (Home)
            </label>
            <select
              v-model="selectedLotId"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select a lot --</option>
              <option v-for="lot in lots" :key="lot.id" :value="lot.id">
                {{ lot.name }}
              </option>
            </select>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeCloneModal"
              :disabled="cloning"
              class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="cloning || !selectedLotId"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              {{ cloning ? 'Placing...' : 'Place Household' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gql } from 'graphql-request'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import { client, queries, mutations } from '../graphql'

interface TemplateCharacter {
  name: string
  age: number
  bio?: string | null
}

interface TemplateAnimal {
  name: string
  age: number
  traits?: string[]
}

interface HouseholdTemplateDetail {
  id: string
  name: string
  description?: string | null
  tags?: string[]
  characters?: TemplateCharacter[]
  animals?: TemplateAnimal[]
}

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

interface GetHouseholdTemplateResult {
  householdTemplate: HouseholdTemplateDetail | null
}

interface GetWorldsResult {
  worlds: WorldSummary[]
}

interface GetRegionsResult {
  regions: RegionSummary[]
}

interface GetLotsResult {
  lots: LotSummary[]
}

interface UpdateHouseholdTemplateResult {
  updateHouseholdTemplate: HouseholdTemplateDetail
}

const route = useRoute()
const router = useRouter()
const template = ref<HouseholdTemplateDetail | null>(null)
const loading = ref(true)
const error = ref<Error | null>(null)

// Edit modal state
const showEditModal = ref(false)
const saving = ref(false)
const editForm = ref({
  name: '',
  description: '',
  tagsInput: '',
  characters: [] as Array<{ name: string; age: number; bio: string }>,
  animals: [] as Array<{ name: string; age: number; traitsString: string }>
})

// Clone modal state
const showCloneModal = ref(false)
const worlds = ref<WorldSummary[]>([])
const regions = ref<RegionSummary[]>([])
const lots = ref<LotSummary[]>([])
const selectedWorldId = ref('')
const selectedRegionId = ref('')
const selectedLotId = ref('')
const cloning = ref(false)

const QUERY_HOUSEHOLD_TEMPLATE = gql`
  query GetHouseholdTemplate($id: ID!) {
    householdTemplate(id: $id) {
      id
      name
      description
      tags
      characters {
        name
        age
        bio
      }
      animals {
        name
        age
        traits
      }
    }
  }
`

// Edit functions
const openEditModal = () => {
  if (!template.value) {
    return
  }
  editForm.value = {
    name: template.value.name,
    description: template.value.description || '',
    tagsInput: (template.value.tags || []).join(', '),
    characters: (template.value.characters || []).map((character) => ({
      name: character.name,
      age: character.age,
      bio: character.bio || ''
    })),
    animals: (template.value.animals || []).map((animal) => ({
      name: animal.name,
      age: animal.age,
      traitsString: (animal.traits || []).join(', ')
    }))
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editForm.value = {
    name: '',
    description: '',
    tagsInput: '',
    characters: [],
    animals: []
  }
}

const addCharacter = () => {
  editForm.value.characters.push({
    name: '',
    age: 0,
    bio: ''
  })
}

const removeCharacter = (index: number) => {
  editForm.value.characters.splice(index, 1)
}

const addAnimal = () => {
  editForm.value.animals.push({
    name: '',
    age: 0,
    traitsString: ''
  })
}

const removeAnimal = (index: number) => {
  editForm.value.animals.splice(index, 1)
}

const saveTemplate = async () => {
  try {
    if (!template.value) {
      return
    }
    saving.value = true
    error.value = null

    const tags = editForm.value.tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    const input = {
      householdName: editForm.value.name,
      householdDescription: editForm.value.description || '',
      characters: editForm.value.characters.map((character) => ({
        characterName: character.name,
        characterAge: character.age,
        characterBio: character.bio || ''
      })),
      animals: editForm.value.animals.map((animal) => ({
        animalName: animal.name,
        animalAge: animal.age,
        animalTraits: animal.traitsString ? animal.traitsString.split(',').map((trait) => trait.trim()).filter(Boolean) : []
      }))
    }

    const result = await client.request<UpdateHouseholdTemplateResult>(mutations.updateHouseholdTemplate, {
      id: route.params.templateId,
      input,
      tags
    })

    template.value = result.updateHouseholdTemplate
    closeEditModal()
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error('Failed to save household template')
    error.value = err
    alert('Error saving template: ' + err.message)
  } finally {
    saving.value = false
  }
}

// Clone functions
const loadWorlds = async () => {
  try {
    const data = await client.request<GetWorldsResult>(queries.getWorlds)
    worlds.value = data.worlds || []
  } catch (e: unknown) {
    console.error('Error loading worlds:', e)
  }
}

const onWorldChange = async () => {
  selectedRegionId.value = ''
  selectedLotId.value = ''
  regions.value = []
  lots.value = []

  if (!selectedWorldId.value) return

  try {
    const data = await client.request<GetRegionsResult>(queries.getRegions, {
      worldId: selectedWorldId.value
    })
    regions.value = data.regions || []
  } catch (e: unknown) {
    console.error('Error loading regions:', e)
  }
}

const onRegionChange = async () => {
  selectedLotId.value = ''
  lots.value = []

  if (!selectedRegionId.value) return

  try {
    const data = await client.request<GetLotsResult>(queries.getLots, {
      regionId: selectedRegionId.value
    })
    lots.value = data.lots || []
  } catch (e: unknown) {
    console.error('Error loading lots:', e)
  }
}

const closeCloneModal = () => {
  showCloneModal.value = false
  selectedWorldId.value = ''
  selectedRegionId.value = ''
  selectedLotId.value = ''
  regions.value = []
  lots.value = []
}

const cloneTemplate = async () => {
  try {
    if (!template.value) {
      return
    }
    cloning.value = true

    // Create household from template
    const householdId = crypto.randomUUID()
    const input = {
      id: householdId,
      name: template.value.name,
      regionId: selectedRegionId.value,
      lotId: selectedLotId.value
    }

    const characters = (template.value.characters || []).map((character) => ({
      id: crypto.randomUUID(),
      name: character.name,
      age: character.age,
      bio: character.bio || ''
    }))

    const animals = (template.value.animals || []).map((animal) => ({
      id: crypto.randomUUID(),
      name: animal.name,
      age: animal.age,
      traits: animal.traits || [],
      ownerId: characters[0]?.id || '' // Assign to first character
    }))

    await client.request(mutations.createHousehold, {
      input,
      characters,
      animals
    })

    // Navigate to the household detail page
    router.push(`/world/${selectedWorldId.value}/region/${selectedRegionId.value}/household/${householdId}`)
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error('Failed to place household')
    error.value = err
    alert('Error placing household: ' + err.message)
  } finally {
    cloning.value = false
  }
}

onMounted(async () => {
  try {
    const data = await client.request<GetHouseholdTemplateResult>(QUERY_HOUSEHOLD_TEMPLATE, {
      id: route.params.templateId
    })
    template.value = data.householdTemplate

    // Load worlds for the clone modal
    await loadWorlds()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e : new Error('Failed to load household template')
  } finally {
    loading.value = false
  }
})
</script>
