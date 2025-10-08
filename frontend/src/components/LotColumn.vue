<template>
  <div class="flex-1 flex flex-col">
    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sticky top-0 z-10 pb-2 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
      {{ title }}
    </h2>
    <div class="space-y-4">
      <LotCard
        v-for="lot in lots"
        :key="lot.id"
        :lot="lot"
        :world-id="worldId"
        :region-id="regionId"
        :is-expanded="expandedLots[lot.id]"
        :characters-at-lot="charactersByLot[lot.id] || []"
        :characters-by-space="charactersBySpace"
        :variant="variant"
        @toggle-expanded="$emit('toggle-expanded', $event)"
      />
      <div v-if="lots.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-300">
        {{ emptyMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import LotCard from './LotCard.vue'

defineProps({
  title: {
    type: String,
    required: true
  },
  lots: {
    type: Array,
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
  expandedLots: {
    type: Object,
    required: true
  },
  charactersByLot: {
    type: Object,
    default: () => ({})
  },
  charactersBySpace: {
    type: Object,
    default: () => ({})
  },
  variant: {
    type: String,
    default: 'blue'
  },
  emptyMessage: {
    type: String,
    default: 'No lots yet'
  }
})

defineEmits(['toggle-expanded'])
</script>
