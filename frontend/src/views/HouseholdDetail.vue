<template>
  <div>
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">Error: {{ error }}</p>
    </div>

    <div v-else-if="household" class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ household.name }}</h1>
          <p class="text-gray-600 mt-1">{{ household.lotName }}</p>
        </div>
        <router-link
          :to="`/world/${worldId}/region/${regionId}/household/${householdId}/edit`"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Edit Household
        </router-link>
      </div>

      <!-- Characters Section -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Characters</h2>

        <div v-if="household.characters.length === 0" class="text-gray-500 dark:text-gray-300 text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          No characters in this household.
        </div>

        <div v-else class="space-y-6">
          <div
            v-for="character in household.characters"
            :key="character.id"
            class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"
          >
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ character.name }}</h3>
                <p class="text-sm text-gray-500">Age: {{ character.age }}</p>
              </div>
            </div>

            <div v-if="character.bio" class="mt-4">
             
              <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                <MarkdownRenderer :text="character.bio" fontSize="small" />
              </div>
            </div>
            <div v-else class="text-gray-500 dark:text-gray-300 italic text-sm">
              No biography available.
            </div>
          </div>
        </div>
      </div>

      <!-- Animals Section -->
      <div v-if="household.animals && household.animals.length > 0" class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Pets</h2>
        <div class="space-y-6">
          <div
            v-for="animal in household.animals"
            :key="animal.id"
            class="bg-amber-50 p-6 rounded-lg shadow border border-amber-200"
          >
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ animal.name }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-300">Age: {{ animal.age }}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300" v-if="animal.traits && animal.traits.length > 0">
                  Traits: {{ animal.traits.join(', ') }}
                </p>
              </div>
            </div>

            <div v-if="animal.bio" class="mt-4">
              <div class="bg-white dark:bg-gray-900 p-4 rounded-md">
                <MarkdownRenderer :text="animal.bio" fontSize="small" />
              </div>
            </div>
            <div v-else class="text-gray-600 italic text-sm">
              No biography available.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import { client, queries } from '../graphql'

const route = useRoute()
const worldId = computed(() => route.params.worldId)
const regionId = computed(() => route.params.regionId)
const householdId = computed(() => route.params.householdId)

const household = ref(null)
const world = ref(null)
const region = ref(null)
const loading = ref(true)
const error = ref(null)

const breadcrumbs = computed(() => [
  { label: 'Worlds', to: '/' },
  { label: world.value?.name || 'Loading...', to: `/world/${worldId.value}` },
  { label: region.value?.name || 'Loading...', to: `/world/${worldId.value}/region/${regionId.value}` },
  { label: household.value?.name || 'Loading...', to: '#' }
])

const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    const [worldData, regionsData, householdData] = await Promise.all([
      client.request(queries.getWorld, { id: worldId.value }),
      client.request(queries.getRegions, { worldId: worldId.value }),
      client.request(queries.getHousehold, { id: householdId.value })
    ])
    world.value = worldData.world
    region.value = regionsData.regions.find(r => r.id === regionId.value)
    household.value = householdData.household
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
