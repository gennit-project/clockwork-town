<template>
  <div>
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Loading templates...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading templates: {{ error.message }}</p>
    </div>

    <div v-else-if="!templates || templates.length === 0" class="text-center py-8">
      <p class="text-gray-500">No household templates yet. Create one to get started!</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="template in templates"
        :key="template.id"
        class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow relative group"
      >
        <router-link
          :to="`/library/households/${template.id}`"
          class="block p-5"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ template.name }}</h3>
          </div>

          <p v-if="template.description" class="mt-2 text-sm text-gray-500">
            {{ template.description }}
          </p>

          <div v-if="template.tags && template.tags.length > 0" class="mt-3 flex flex-wrap gap-1">
            <span
              v-for="tag in template.tags"
              :key="tag"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:text-gray-200 dark:bg-gray-700"
            >
              {{ tag }}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-500">Characters</p>
              <p class="font-medium text-gray-900 dark:text-gray-100">{{ template.characters?.length || 0 }}</p>
            </div>
            <div>
              <p class="text-gray-500">Pets</p>
              <p class="font-medium text-gray-900 dark:text-gray-100">{{ template.animals?.length || 0 }}</p>
            </div>
          </div>

          <div class="mt-4 text-sm text-indigo-600 font-medium">
            View Details →
          </div>
        </router-link>

        <!-- Delete Button -->
        <button
          @click="confirmDelete(template)"
          class="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-700 rounded-full shadow-sm"
          title="Delete template"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deletingTemplate" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Delete Template</h2>
        <p class="mb-2 text-gray-700 dark:text-gray-300">Are you sure you want to delete "{{ deletingTemplate.name }}"?</p>
        <p class="mb-4 text-sm text-gray-500">
          This will permanently delete the template with {{ (deletingTemplate.characters?.length || 0) }} characters and {{ (deletingTemplate.animals?.length || 0) }} animals.
        </p>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="deletingTemplate = null"
            :disabled="deleting"
            class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="deleteTemplate"
            :disabled="deleting"
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

interface HouseholdTemplateSummary {
  id: string
  name: string
  description?: string | null
  tags?: string[]
  characters?: TemplateCharacter[]
  animals?: TemplateAnimal[]
}

interface GetHouseholdTemplatesResult {
  householdTemplates: HouseholdTemplateSummary[]
}

const templates = ref<HouseholdTemplateSummary[]>([])
const loading = ref(true)
const error = ref<Error | null>(null)
const deletingTemplate = ref<HouseholdTemplateSummary | null>(null)
const deleting = ref(false)

const loadTemplates = async () => {
  try {
    loading.value = true
    const data = await client.request<GetHouseholdTemplatesResult>(queries.getHouseholdTemplates)
    templates.value = data.householdTemplates
  } catch (e: unknown) {
    error.value = e instanceof Error ? e : new Error('Failed to load household templates')
  } finally {
    loading.value = false
  }
}

const confirmDelete = (template: HouseholdTemplateSummary) => {
  deletingTemplate.value = template
}

const deleteTemplate = async () => {
  try {
    if (!deletingTemplate.value) {
      return
    }
    deleting.value = true
    await client.request(mutations.deleteHouseholdTemplate, {
      id: deletingTemplate.value.id
    })

    // Remove from local array
    templates.value = templates.value.filter((template) => template.id !== deletingTemplate.value?.id)

    // Close modal
    deletingTemplate.value = null
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error('Failed to delete household template')
    error.value = err
    alert('Error deleting template: ' + err.message)
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  void loadTemplates()
})
</script>
