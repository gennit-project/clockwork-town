<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {{ isEditing ? 'Edit Household' : 'Create Household' }}
      </h1>

      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading...</p>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <p class="text-red-800">Error: {{ error }}</p>
      </div>

      <form v-else @submit.prevent="saveHousehold" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <!-- Household Name -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Household Name
          </label>
          <input
            v-model="formData.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter household name"
          />
        </div>

        <!-- Lot Selection -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Lot
          </label>
          <select
            v-model="formData.lotId"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a lot</option>
            <option v-for="lot in availableLots" :key="lot.id" :value="lot.id">
              {{ lot.name }} ({{ lot.lotType }})
            </option>
          </select>
        </div>

        <!-- Characters Section -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Characters
            </label>
            <button
              type="button"
              @click="addCharacter"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + Add Character
            </button>
          </div>

          <div v-if="formData.characters.length === 0" class="text-gray-500 dark:text-gray-300 text-sm">
            No characters yet. Click "Add Character" to create one.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(character, index) in formData.characters"
              :key="index"
              class="border border-gray-300 rounded-md p-4 relative"
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
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    v-model="character.name"
                    type="text"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Character name"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Age *
                  </label>
                  <input
                    v-model.number="character.age"
                    type="number"
                    required
                    min="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Age"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  v-model="character.bio"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Optional bio"
                  rows="6"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Animals Section -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Animals (Pets)
            </label>
            <button
              type="button"
              @click="addAnimal"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + Add Animal
            </button>
          </div>

          <div v-if="formData.animals.length === 0" class="text-gray-500 dark:text-gray-300 text-sm">
            No animals yet. Click "Add Animal" to add a pet.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(animal, index) in formData.animals"
              :key="index"
              class="border border-gray-300 rounded-md p-4 relative bg-amber-50"
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
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    v-model="animal.name"
                    type="text"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Animal name"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Age *
                  </label>
                  <input
                    v-model.number="animal.age"
                    type="number"
                    required
                    min="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Age"
                  />
                </div>
              </div>
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Owner *
                </label>
                <select
                  v-model="animal.ownerId"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select owner</option>
                  <option v-for="char in formData.characters" :key="char.id" :value="char.id">
                    {{ char.name }}
                  </option>
                </select>
              </div>
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Traits (comma separated)
                </label>
                <input
                  v-model="animal.traitsString"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., friendly, playful, loyal"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Biography
                </label>
                <textarea
                  v-model="animal.bio"
                  rows="6"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Write about this animal's personality, history, etc. (supports markdown)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="goBack"
            class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving || formData.characters.length === 0"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : 'Save Household' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import { client, queries, mutations } from '../graphql'

const route = useRoute()
const router = useRouter()
const worldId = computed(() => route.params.worldId)
const regionId = computed(() => route.params.regionId)
const householdId = computed(() => route.params.householdId)
const isEditing = computed(() => !!householdId.value)

const world = ref(null)
const region = ref(null)
const lots = ref([])
const households = ref([])
const loading = ref(true)
const error = ref(null)
const saving = ref(false)

const formData = ref({
  name: '',
  lotId: '',
  characters: [],
  animals: []
})

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: isEditing.value ? 'Edit Household' : 'Create Household', to: '#' }
])

const availableLots = computed(() => {
  const occupiedLotIds = new Set(households.value.map(h => h.lotId))
  return lots.value.filter(lot =>
    !occupiedLotIds.has(lot.id) || lot.id === formData.value.lotId
  )
})

const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    const [worldData, regionsData, lotsData, householdsData] = await Promise.all([
      client.request(queries.getWorld, { id: worldId.value }),
      client.request(queries.getRegions, { worldId: worldId.value }),
      client.request(queries.getLots, { regionId: regionId.value }),
      client.request(queries.getHouseholds, { regionId: regionId.value })
    ])
    world.value = worldData.world
    region.value = regionsData.regions.find(r => r.id === regionId.value)
    lots.value = lotsData.lots || []
    households.value = householdsData.households || []

    if (isEditing.value) {
      const householdData = await client.request(queries.getHousehold, { id: householdId.value })
      const household = householdData.household
      if (household) {
        formData.value = {
          name: household.name,
          lotId: household.lotId,
          characters: household.characters.map(c => ({
            id: c.id,
            name: c.name,
            age: c.age,
            bio: c.bio || ''
          })),
          animals: household.animals.map(a => ({
            id: a.id,
            name: a.name,
            age: a.age,
            ownerId: a.ownerId || '',
            traitsString: (a.traits || []).join(', '),
            bio: a.bio || ''
          }))
        }
      }
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const addCharacter = () => {
  formData.value.characters.push({
    id: crypto.randomUUID(),
    name: '',
    age: 0,
    bio: ''
  })
}

const removeCharacter = (index) => {
  formData.value.characters.splice(index, 1)
}

const addAnimal = () => {
  formData.value.animals.push({
    id: crypto.randomUUID(),
    name: '',
    age: 0,
    ownerId: '',
    traitsString: ''
  })
}

const removeAnimal = (index) => {
  formData.value.animals.splice(index, 1)
}

const saveHousehold = async () => {
  try {
    saving.value = true
    error.value = null

    if (isEditing.value) {
      await client.request(mutations.updateHousehold, {
        id: householdId.value,
        name: formData.value.name,
        lotId: formData.value.lotId,
        characters: formData.value.characters.map(c => ({
          id: c.id,
          name: c.name,
          age: c.age,
          bio: c.bio || null
        })),
        animals: formData.value.animals.map(a => ({
          id: a.id,
          name: a.name,
          age: a.age,
          ownerId: a.ownerId,
          traits: a.traitsString ? a.traitsString.split(',').map(t => t.trim()).filter(t => t) : [],
          bio: a.bio || null
        }))
      })
    } else {
      await client.request(mutations.createHousehold, {
        input: {
          id: crypto.randomUUID(),
          name: formData.value.name,
          regionId: regionId.value,
          lotId: formData.value.lotId
        },
        characters: formData.value.characters.map(c => ({
          id: c.id,
          name: c.name,
          age: c.age,
          bio: c.bio || null
        })),
        animals: formData.value.animals.map(a => ({
          id: a.id,
          name: a.name,
          age: a.age,
          ownerId: a.ownerId,
          traits: a.traitsString ? a.traitsString.split(',').map(t => t.trim()).filter(t => t) : [],
          bio: a.bio || null
        }))
      })
    }

    goBack()
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  router.push(`/world/${worldId.value}/region/${regionId.value}`)
}

onMounted(loadData)
</script>
