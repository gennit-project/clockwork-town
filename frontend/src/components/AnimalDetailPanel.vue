<template>
  <div class="fixed bottom-4 left-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-amber-300 dark:border-amber-700 z-40 flex flex-col">
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ animal.name }}</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400">Age {{ animal.age }}</p>
      </div>
      <button
        type="button"
        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        @click="$emit('close')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="p-4 space-y-3">
      <div v-if="animal.traits?.length" class="flex flex-wrap gap-2">
        <span
          v-for="trait in animal.traits"
          :key="trait"
          class="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
        >
          {{ trait }}
        </span>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Bio</p>
        <div class="rounded bg-gray-50 p-3 dark:bg-gray-900">
          <MarkdownRenderer :text="animal.bio || 'No biography available.'" font-size="small" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarkdownRenderer from './MarkdownRenderer.vue'

defineProps({
  animal: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])
</script>
