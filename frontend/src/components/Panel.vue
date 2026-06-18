<template>
  <section class="flex flex-col rounded border border-gf-border bg-gf-surface min-w-0">
    <header
      v-if="title || $slots.actions"
      class="flex items-center justify-between gap-2 border-b border-gf-border px-3 py-2"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="truncate text-[11px] font-semibold uppercase tracking-wider text-gf-text-weak">
          {{ title }}
        </span>
        <span
          v-if="status"
          class="h-1.5 w-1.5 shrink-0 rounded-full"
          :class="statusDotClass"
          :title="status"
        />
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-1 text-gf-text-weak">
        <slot name="actions" />
      </div>
    </header>
    <div class="min-h-0 flex-1" :class="bodyClass">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HealthStatus } from '../stores/utils/happinessMetrics'

const props = withDefaults(defineProps<{
  title?: string
  status?: HealthStatus | null
  /** Set false to drop the default body padding (e.g. for full-bleed charts). */
  padded?: boolean
}>(), {
  title: '',
  status: null,
  padded: true
})

const bodyClass = computed(() => (props.padded ? 'p-3' : ''))

const statusDotClass = computed(() => {
  switch (props.status) {
    case 'critical':
      return 'bg-gf-red'
    case 'warning':
      return 'bg-gf-amber'
    case 'healthy':
      return 'bg-gf-green'
    default:
      return 'bg-gf-text-faint'
  }
})
</script>
