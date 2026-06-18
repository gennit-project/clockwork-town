<template>
  <div class="grid grid-cols-3 gap-2">
    <div
      v-for="summary in summaries"
      :key="summary.key"
      class="rounded border border-gf-border bg-gf-surface-2 px-2 py-1"
    >
      <div class="mb-1 flex items-center justify-between text-[10px] font-medium text-gf-text-weak">
        <span>{{ summary.icon }} {{ summary.label }}</span>
        <span>{{ Math.round(summary.value * 100) }}%</span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-gf-surface-3">
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
  if (value >= 0.7) return 'bg-gf-green'
  if (value >= 0.4) return 'bg-gf-amber'
  if (value >= 0.2) return 'bg-gf-amber'
  return 'bg-gf-red'
}
</script>
