<template>
  <div class="flex-1 flex flex-col">
    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sticky top-0 z-10 pb-2 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
      {{ title }}
    </h2>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <LotCard
        v-for="lot in normalizedLots"
        :key="lot.id"
        :lot="lot"
        :world-id="worldId"
        :region-id="regionId"
        :is-expanded="expandedLots[lot.id]"
        :characters-at-lot="charactersByLot?.[lot.id] || []"
        :characters-by-space="charactersBySpace"
        :variant="variant"
        @toggle-expanded="$emit('toggle-expanded', $event)"
      />
      <div v-if="lots.length === 0" class="col-span-2 text-center py-8 text-gray-500 dark:text-gray-300">
        {{ emptyMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LotCard from './LotCard.vue'
import type { InputLot, InputSpace } from '../stores/types'

interface CharacterSummary {
  id: string
  name: string
}

interface LotCardLot {
  id: string
  name: string
  lotType: string
  indoorRooms: InputSpace[]
  outdoorAreas: InputSpace[]
}

const props = defineProps<{
  title: string
  lots: InputLot[]
  worldId: string
  regionId: string
  expandedLots: Record<string, boolean>
  charactersByLot?: Record<string, CharacterSummary[]>
  charactersBySpace?: Record<string, CharacterSummary[]>
  variant?: 'blue' | 'green'
  emptyMessage?: string
}>()

const normalizedLots = computed<LotCardLot[]>(() =>
  props.lots.map((lot) => ({
    id: lot.id,
    name: lot.name,
    lotType: lot.lotType,
    indoorRooms: lot.indoorRooms || [],
    outdoorAreas: lot.outdoorAreas || []
  }))
)

defineEmits<{
  'toggle-expanded': [lotId: string]
}>()
</script>
