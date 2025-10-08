<template>
  <div>
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Loading templates...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading templates: {{ error.message }}</p>
    </div>

    <div v-else-if="!templates || templates.length === 0" class="text-center py-8">
      <p class="text-gray-500">No lot templates yet. Create one to get started!</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <router-link
        v-for="template in templates"
        :key="template.id"
        :to="`/library/lots/${template.id}`"
        class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow block"
      >
        <div class="p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">{{ template.name }}</h3>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {{ template.lotType }}
            </span>
          </div>

          <p v-if="template.description" class="mt-2 text-sm text-gray-500">
            {{ template.description }}
          </p>

          <div v-if="template.tags && template.tags.length > 0" class="mt-3 flex flex-wrap gap-1">
            <span
              v-for="tag in template.tags"
              :key="tag"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
            >
              {{ tag }}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-500">Indoor Rooms</p>
              <p class="font-medium text-gray-900">{{ template.indoorRooms?.length || 0 }}</p>
            </div>
            <div>
              <p class="text-gray-500">Outdoor Areas</p>
              <p class="font-medium text-gray-900">{{ template.outdoorAreas?.length || 0 }}</p>
            </div>
          </div>

          <div class="mt-4 text-sm text-indigo-600 font-medium">
            View Details →
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { gql } from 'graphql-request'
import { client } from '../graphql'

const templates = ref([])
const loading = ref(true)
const error = ref(null)

const QUERY_LOT_TEMPLATES = gql`
  query GetLotTemplates {
    lotTemplates {
      id
      name
      lotType
      description
      tags
      indoorRooms {
        name
        description
        items {
          name
          description
        }
      }
      outdoorAreas {
        name
        description
        items {
          name
          description
        }
      }
    }
  }
`

onMounted(async () => {
  try {
    const data = await client.request(QUERY_LOT_TEMPLATES)
    templates.value = data.lotTemplates
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
})
</script>
