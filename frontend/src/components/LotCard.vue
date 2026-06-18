<template>
  <div class="bg-gf-surface border border-gf-border rounded-lg overflow-hidden">
    <!-- Lot Header -->
    <div class="p-4 border-b border-gf-border" :class="headerBgClass">
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
          class="hover:opacity-80"
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
    <div class="p-4 bg-gf-surface">
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
          <h3 class="text-sm font-semibold text-gf-text-weak mb-2 flex items-center">
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
              class="block bg-gf-surface-2 border-2 rounded p-3 transition-colors cursor-pointer"
              :class="spaceBorderClass"
            >
              <p class="font-medium text-sm text-gf-text">{{ room.name }}</p>
              <p class="text-xs text-gf-text-weak mt-1">{{ room.description }}</p>

              <!-- Characters in this space -->
              <div v-if="getCharactersInSpace(room.id).length > 0" class="mt-2">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="char in getCharactersInSpace(room.id)"
                    :key="char.id"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-gf-border bg-gf-blue/15 text-gf-blue"
                    :title="getCharacterActivity(char, room)"
                  >
                    👤 {{ char.name }}{{ getCharacterItemText(char, room) }}
                  </span>
                </div>
              </div>
            </router-link>
          </div>
        </div>

        <!-- Outdoor Areas -->
        <div v-if="lot.outdoorAreas.length > 0">
          <h3 class="text-sm font-semibold text-gf-text-weak mb-2 flex items-center">
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
              class="block bg-gf-surface-2 border-2 border-gf-border rounded p-3 hover:border-gf-green transition-colors cursor-pointer"
            >
              <p class="font-medium text-sm text-gf-text">{{ area.name }}</p>
              <p class="text-xs text-gf-text-weak mt-1">{{ area.description }}</p>

              <!-- Characters in this space -->
              <div v-if="getCharactersInSpace(area.id).length > 0" class="mt-2">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="char in getCharactersInSpace(area.id)"
                    :key="char.id"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-gf-border bg-gf-green/15 text-gf-green"
                    :title="getCharacterActivity(char, area)"
                  >
                    👤 {{ char.name }}{{ getCharacterItemText(char, area) }}
                  </span>
                </div>
              </div>
            </router-link>
          </div>
        </div>
      </div>

      <!-- No Spaces Message -->
      <div v-if="lot.indoorRooms.length === 0 && lot.outdoorAreas.length === 0" class="text-center py-6">
        <p class="text-sm text-gf-text-faint">No spaces yet</p>
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
import { useSimulationStore } from '../stores/simulation'
import type { ItemAffordance, InputLot } from '../stores/types'

const simulationStore = useSimulationStore()

interface SpaceItem {
  id: string
  name: string
  allowedActivities?: string[]
  affordances?: ItemAffordance[]
}

interface LotSpace {
  id: string
  name: string
  description?: string
  items?: SpaceItem[]
}

interface LotCardData extends InputLot {
  indoorRooms: LotSpace[]
  outdoorAreas: LotSpace[]
}

interface CharacterSummary {
  id: string
  name: string
}

const props = defineProps<{
  lot: LotCardData
  worldId: string
  regionId: string
  isExpanded?: boolean
  charactersAtLot?: CharacterSummary[]
  charactersBySpace?: Record<string, CharacterSummary[]>
  variant?: 'blue' | 'green'
}>()

const emit = defineEmits<{
  'toggle-expanded': [lotId: string]
}>()

const toggleExpanded = () => {
  emit('toggle-expanded', props.lot.id)
}

const getCharactersInSpace = (spaceId: string): CharacterSummary[] => {
  return props.charactersBySpace?.[spaceId] || []
}

const getCharacterActivity = (char: CharacterSummary, space: LotSpace): string => {
  const charState = simulationStore.characterStates[char.id]
  if (charState?.currentActivity?.itemId) {
    // Find the item in this space
    const item = space.items?.find((i: SpaceItem) => i.id === charState.currentActivity?.itemId)
    if (item) {
      return `${char.name} is using ${item.name}`
    }
  }
  return `${char.name} is in ${space.name}`
}

const getCharacterItemText = (char: CharacterSummary, space: LotSpace): string => {
  const charState = simulationStore.characterStates[char.id]
  if (charState?.currentActivity?.itemId) {
    // Find the item in this space
    const item = space.items?.find((i: SpaceItem) => i.id === charState.currentActivity?.itemId)
    if (item) {
      return ` → ${item.name}`
    }
  }
  return ''
}

const headerBgClass = computed(() => {
  return (props.variant ?? 'blue') === 'blue' ? 'bg-gf-surface-2 text-gf-blue' : 'bg-gf-surface-2 text-gf-green'
})

const subtitleClass = computed(() => {
  return props.variant === 'blue' ? 'text-gf-text-weak' : 'text-gf-text-weak'
})

const toggleButtonClass = computed(() => {
  return props.variant === 'blue'
    ? 'text-gf-blue hover:underline'
    : 'text-gf-green hover:underline'
})

const spaceBorderClass = computed(() => {
  return props.variant === 'blue'
    ? 'border-gf-border hover:border-gf-blue'
    : 'border-gf-border hover:border-gf-green'
})

const linkClass = computed(() => {
  return props.variant === 'blue'
    ? 'text-gf-blue hover:underline'
    : 'text-gf-green hover:underline'
})
</script>
