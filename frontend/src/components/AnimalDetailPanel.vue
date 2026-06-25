<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="$emit('close')"
  >
    <div
      class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gf-border bg-gf-surface"
    >
      <div class="flex items-start justify-between gap-4 border-b border-gf-border bg-gf-surface-2 px-5 py-4">
        <div class="min-w-0">
          <h3 class="truncate text-xl font-bold text-gf-text">{{ animal.name }}</h3>
          <p class="mt-1 text-sm text-gf-text-weak">Age {{ animal.age }}</p>
        </div>
        <button
          type="button"
          class="rounded-full p-2 text-gf-text-weak transition-colors hover:bg-gf-surface-3 hover:text-gf-text"
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
            class="rounded-full border border-gf-border bg-gf-surface-2 px-2 py-1 text-xs font-medium text-gf-text-weak"
          >
            {{ trait }}
          </span>
        </div>

        <!-- Live runtime status -->
        <div v-if="state" class="mb-4 rounded-xl bg-gf-surface-2 p-4">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-medium text-gf-text-weak">Status</p>
            <span class="text-xs text-gf-text-faint">{{ locationText }}</span>
          </div>
          <div class="mb-3 flex items-center gap-2 text-sm text-gf-text">
            <span>🐾</span>
            <span>{{ actionVerb }}</span>
            <span class="ml-auto text-xs text-gf-text-faint">contentment {{ pct(wellbeing) }}</span>
          </div>
          <div class="space-y-1.5">
            <div v-for="need in needs" :key="need.name">
              <div class="mb-0.5 flex justify-between text-[10px] text-gf-text-faint">
                <span>{{ label(need.name) }}</span><span>{{ pct(need.value) }}</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded bg-gf-surface-3">
                <div class="h-full rounded" :style="{ width: pct(need.value), backgroundColor: needColor(need.value) }" />
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-gf-surface-2 p-4">
          <p class="mb-2 text-sm font-medium text-gf-text-weak">Bio</p>
          <div class="max-h-[50vh] overflow-y-auto pr-1 text-gf-text">
            <MarkdownRenderer :text="animal.bio || 'No biography available.'" font-size="small" />
          </div>
        </div>
      </div>

      <div class="flex justify-end border-t border-gf-border px-5 py-3">
        <button
          type="button"
          class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue transition-colors hover:bg-gf-blue/25"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import { useSimulationStore } from '../stores/simulation'
import { computeAnimalWellbeing } from '../stores/utils/animalRuntime'
import { ANIMAL_NEED_NAMES } from '../stores/config/animalConfig'
import type { AnimalActionName } from '../stores/types'

const props = defineProps<{
  animal: { id: string; name: string; age?: number; traits?: string[]; bio?: string }
}>()

defineEmits(['close'])

const store = useSimulationStore()
const state = computed(() => store.animalStates[props.animal.id])

const ACTION_VERBS: Record<AnimalActionName, string> = {
  eat: 'eating',
  sleep: 'sleeping',
  relieve: 'relieving itself',
  play: 'playing',
  groom: 'grooming',
  wander: 'wandering',
  idle: 'resting'
}

const actionVerb = computed(() => (state.value ? ACTION_VERBS[state.value.currentAction] : ''))
const wellbeing = computed(() => (state.value ? computeAnimalWellbeing(state.value) : 0))
const needs = computed(() =>
  state.value ? ANIMAL_NEED_NAMES.map((name) => ({ name, value: state.value!.needs[name] })) : []
)
const locationText = computed(() => {
  const loc = state.value?.location
  if (!loc?.lotName) {
    return 'Unknown'
  }
  return loc.spaceName ? `${loc.lotName} → ${loc.spaceName}` : loc.lotName
})

const pct = (v: number) => `${Math.round(v * 100)}%`
const label = (n: string) => n.charAt(0).toUpperCase() + n.slice(1)
const needColor = (v: number) => (v < 0.3 ? '#f2495c' : v < 0.55 ? '#ff9830' : '#73bf69')
</script>
