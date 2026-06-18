<template>
  <button
    type="button"
    class="flex items-center w-full text-left"
    :disabled="!clickable"
    :class="clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'"
    @click="$emit('select')"
  >
    <span class="text-lg mr-2">{{ icon }}</span>
    <div class="flex-1">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-medium text-gf-text-weak">{{ label }}</span>
        <span class="text-xs text-gf-text-weak">{{ Math.round(percentage) }}%</span>
      </div>
      <div class="w-full bg-gf-surface-3 h-2 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all"
          :class="getColorClass(percentage / 100)"
          :style="{ width: percentage + '%' }"
        />
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  label: string
  percentage: number
  clickable?: boolean
}>()

defineEmits<{
  select: []
}>()

const getColorClass = (value: number): string => {
  if (value >= 0.7) return 'bg-gf-green'
  if (value >= 0.4) return 'bg-gf-amber'
  if (value >= 0.2) return 'bg-gf-amber'
  return 'bg-gf-red'
}
</script>
