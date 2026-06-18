<template>
  <div class="flex h-full flex-col items-center justify-center rounded border border-gf-border bg-gf-surface px-3 py-4 text-center">
    <span class="text-[11px] font-semibold uppercase tracking-wider text-gf-text-weak">{{ label }}</span>
    <div class="mt-1 flex items-baseline gap-1">
      <span class="text-4xl font-semibold leading-none" :style="{ color: valueColor }">{{ value }}</span>
      <span v-if="unit" class="text-lg font-medium" :style="{ color: valueColor }">{{ unit }}</span>
    </div>
    <span v-if="sub" class="mt-1 text-xs text-gf-text-faint">{{ sub }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HealthStatus } from '../stores/utils/happinessMetrics'

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  unit?: string
  sub?: string
  status?: HealthStatus | 'neutral'
}>(), {
  unit: '',
  sub: '',
  status: 'neutral'
})

const STATUS_COLORS: Record<string, string> = {
  healthy: '#73bf69',
  warning: '#ff9830',
  critical: '#f2495c',
  neutral: '#d8d9da'
}

const valueColor = computed(() => STATUS_COLORS[props.status] ?? STATUS_COLORS.neutral)
</script>
