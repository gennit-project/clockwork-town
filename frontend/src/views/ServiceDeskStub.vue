<template>
  <div class="p-4">
    <h1 class="mb-3 text-lg font-semibold text-gf-text">{{ title }}</h1>
    <Panel :title="title">
      <div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <span class="text-3xl">🛠️</span>
        <p class="text-sm font-medium text-gf-text">Not yet instrumented</p>
        <p class="max-w-md text-xs text-gf-text-faint">
          {{ blurb }}
        </p>
        <span class="mt-2 rounded border border-gf-border bg-gf-surface-2 px-2 py-1 font-mono text-[11px] text-gf-text-weak">
          planned · Service Desk roadmap
        </span>
      </div>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Panel from '../components/Panel.vue'

const route = useRoute()

const title = computed(() => (route.meta.sectionTitle as string) || 'Section')
const blurb = computed(
  () => (route.meta.sectionBlurb as string) || 'This service-desk section is on the roadmap and not wired up yet.'
)
</script>
