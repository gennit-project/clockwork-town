<template>
  <div
    v-if="visible"
    class="absolute inset-0 bg-gf-bg/95 p-4 overflow-y-auto"
  >
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold text-gf-text">
        Satisfy {{ selectedNeed }}
      </h4>
      <button type="button" class="text-xs text-gf-text-faint hover:text-gf-text" @click="$emit('close')">Close</button>
    </div>
    <div v-if="options.length === 0" class="text-xs text-gf-text-faint">
      No options available right now.
    </div>
    <div v-else class="space-y-2">
      <button
        v-for="option in options"
        :key="option.label"
        type="button"
        class="w-full rounded border border-gf-border bg-gf-surface px-3 py-2 text-left text-xs text-gf-text hover:bg-gf-surface-2"
        @click="$emit('select', option.intent)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Intent, NeedName } from '../stores/types'

interface NeedPickerOption {
  label: string
  intent: Intent
}

defineProps<{
  visible?: boolean
  selectedNeed?: NeedName | ''
  options: NeedPickerOption[]
}>()

defineEmits<{
  close: []
  select: [intent: Intent]
}>()
</script>
