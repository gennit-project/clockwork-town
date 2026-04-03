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
        <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ label }}</span>
        <span class="text-xs text-gray-600 dark:text-gray-400">{{ Math.round(percentage) }}%</span>
      </div>
      <div class="w-full bg-gray-200 dark:bg-gray-600 h-2 rounded-full overflow-hidden">
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
defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  percentage: {
    type: Number,
    required: true,
    default: 0
  },
  clickable: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select'])

const getColorClass = (value) => {
  if (value >= 0.7) return 'bg-green-500'
  if (value >= 0.4) return 'bg-yellow-500'
  if (value >= 0.2) return 'bg-orange-500'
  return 'bg-red-500'
}
</script>
