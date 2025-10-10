<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
    <!-- Lot Header -->
    <div class="text-white p-4" :class="headerBgClass">
      <div class="flex justify-between items-start">
        <div>
          <router-link
            :to="`/world/${worldId}/region/${regionId}/lot/${lot.id}`"
            class="text-xl font-bold hover:underline cursor-pointer"
          >
            {{ lot.name }}
          </router-link>
        </div>
        <router-link
          :to="`/world/${worldId}/region/${regionId}/lot/${lot.id}`"
          class="text-white hover:opacity-80"
          title="View Details"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </router-link>
      </div>
    </div>

    <!-- Spaces Content -->
    <div class="p-4 bg-gray-50 dark:bg-gray-800">
      <!-- Show/Hide Rooms Toggle -->
      <div v-if="lot.indoorRooms.length > 0 || lot.outdoorAreas.length > 0" class="mb-3">
        <button
          @click="toggleExpanded"
          class="text-sm font-medium"
          :class="toggleButtonClass"
        >
          {{ isExpanded ? 'Hide rooms' : 'Show rooms' }}
        </button>
      </div>

      <!-- Collapsible Rooms Section -->
      <div v-show="isExpanded">
        <!-- Indoor Rooms -->
        <div v-if="lot.indoorRooms.length > 0" class="mb-4">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Indoor Rooms ({{ lot.indoorRooms.length }})
          </h3>
          <div class="space-y-2">
            <router-link
              v-for="room in lot.indoorRooms"
              :key="room.id"
              :to="`/world/${worldId}/region/${regionId}/lot/${lot.id}/space/${room.id}`"
              class="block bg-white dark:bg-gray-900 border-2 rounded p-3 hover:border-opacity-100 transition-colors cursor-pointer"
              :class="spaceBorderClass"
            >
              <p class="font-medium text-sm text-gray-900 dark:text-gray-100">{{ room.name }}</p>
              <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">{{ room.description }}</p>
            </router-link>
          </div>
        </div>

        <!-- Outdoor Areas -->
        <div v-if="lot.outdoorAreas.length > 0">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Outdoor Areas ({{ lot.outdoorAreas.length }})
          </h3>
          <div class="space-y-2">
            <router-link
              v-for="area in lot.outdoorAreas"
              :key="area.id"
              :to="`/world/${worldId}/region/${regionId}/lot/${lot.id}/space/${area.id}`"
              class="block bg-white dark:bg-gray-900 border-2 border-green-200 dark:border-green-700 dark:hover:border-green-500 rounded p-3 hover:border-green-400 transition-colors cursor-pointer"
            >
              <p class="font-medium text-sm text-gray-900 dark:text-gray-100">{{ area.name }}</p>
              <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">{{ area.description }}</p>
            </router-link>
          </div>
        </div>
      </div>

      <!-- No Spaces Message -->
      <div v-if="lot.indoorRooms.length === 0 && lot.outdoorAreas.length === 0" class="text-center py-6">
        <p class="text-sm text-gray-500 dark:text-gray-300">No spaces yet</p>
        <router-link
          :to="`/world/${worldId}/region/${regionId}/lot/${lot.id}`"
          class="text-xs mt-2 inline-block"
          :class="linkClass"
        >
          Add spaces →
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  lot: {
    type: Object,
    required: true
  },
  worldId: {
    type: String,
    required: true
  },
  regionId: {
    type: String,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  charactersAtLot: {
    type: Array,
    default: () => []
  },
  charactersBySpace: {
    type: Object,
    default: () => ({})
  },
  variant: {
    type: String,
    default: 'blue', // 'blue' or 'green'
    validator: (value) => ['blue', 'green'].includes(value)
  }
})

const emit = defineEmits(['toggle-expanded'])

const toggleExpanded = () => {
  emit('toggle-expanded', props.lot.id)
}

const headerBgClass = computed(() => {
  return props.variant === 'blue' ? 'bg-blue-600 dark:bg-blue-800' : 'bg-green-600 dark:bg-green-800'
})

const subtitleClass = computed(() => {
  return props.variant === 'blue' ? 'text-blue-100' : 'text-green-100'
})

const toggleButtonClass = computed(() => {
  return props.variant === 'blue'
    ? 'text-blue-600 hover:text-blue-800'
    : 'text-green-600 hover:text-green-800'
})

const spaceBorderClass = computed(() => {
  return props.variant === 'blue'
    ? 'border-blue-200 hover:border-blue-400 dark:border-blue-700 dark:hover:border-blue-500'
    : 'border-green-200 hover:border-green-400 dark:border-green-700 dark:hover:border-green-500'
})

const linkClass = computed(() => {
  return props.variant === 'blue'
    ? 'text-blue-600 hover:text-blue-800'
    : 'text-green-600 hover:text-green-800'
})
</script>
