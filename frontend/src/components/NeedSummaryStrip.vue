<template>
  <div class="grid grid-cols-3 gap-2">
    <div
      v-for="summary in summaries"
      :key="summary.key"
      class="rounded border border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-900/40"
    >
      <div class="mb-1 flex items-center justify-between text-[10px] font-medium text-gray-600 dark:text-gray-300">
        <span>{{ summary.icon }} {{ summary.label }}</span>
        <span>{{ Math.round(summary.value * 100) }}%</span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          class="h-full rounded-full transition-all"
          :class="getColorClass(summary.value)"
          :style="{ width: `${summary.value * 100}%` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NeedGroupSummary } from '../composables/useNeedSummary'

defineProps<{
  summaries: NeedGroupSummary[]
}>()

function getColorClass(value: number): string {
  if (value >= 0.7) return 'bg-green-500'
  if (value >= 0.4) return 'bg-yellow-500'
  if (value >= 0.2) return 'bg-orange-500'
  return 'bg-red-500'
}
</script>
