<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="$emit('close')"
  >
    <div
      class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl dark:border-amber-800 dark:bg-gray-800"
    >
      <div class="flex items-start justify-between gap-4 border-b border-amber-100 bg-amber-50 px-5 py-4 dark:border-amber-900 dark:bg-amber-950/50">
        <div class="min-w-0">
          <h3 class="truncate text-xl font-bold text-gray-900 dark:text-amber-50">{{ animal.name }}</h3>
          <p class="mt-1 text-sm text-amber-900 dark:text-amber-200">Age {{ animal.age }}</p>
        </div>
        <button
          type="button"
          class="rounded-full p-2 text-gray-600 transition-colors hover:bg-white/70 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
          aria-label="Close animal details"
          @click="$emit('close')"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="overflow-y-auto px-5 py-4">
        <div v-if="animal.traits?.length" class="mb-4 flex flex-wrap gap-2">
          <span
            v-for="trait in animal.traits"
            :key="trait"
            class="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
          >
            {{ trait }}
          </span>
        </div>

        <div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
          <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Bio</p>
          <div class="max-h-[50vh] overflow-y-auto pr-1 text-gray-800 dark:text-gray-100">
            <MarkdownRenderer :text="animal.bio || 'No biography available.'" font-size="small" />
          </div>
        </div>
      </div>

      <div class="flex justify-end border-t border-gray-200 px-5 py-3 dark:border-gray-700">
        <button
          type="button"
          class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
          @click="$emit('close')"
        >
          Close
        </button>
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
