<template>
  <div
    v-if="visible"
    class="absolute inset-0 bg-white/95 dark:bg-gray-900/95 p-4 overflow-y-auto"
  >
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Satisfy {{ selectedNeed }}
      </h4>
      <button type="button" class="text-xs text-gray-500" @click="$emit('close')">Close</button>
    </div>
    <div v-if="options.length === 0" class="text-xs text-gray-500 dark:text-gray-400">
      No options available right now.
    </div>
    <div v-else class="space-y-2">
      <button
        v-for="option in options"
        :key="option.label"
        type="button"
        class="w-full rounded border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-xs text-gray-900 dark:text-gray-100"
        @click="$emit('select', option.intent)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  selectedNeed: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  }
})

defineEmits(['close', 'select'])
</script>
