<template>
  <button
    @click="$emit('select')"
    class="w-full text-left p-3 rounded transition-colors border border-gf-border mb-2"
    :class="[
      hoverClass,
      isActive ? activeClass : ''
    ]"
  >
    <div class="flex justify-between items-start">
      <p class="font-medium text-gf-text flex-1">
        {{ icon }} {{ entity.name }}, {{ entity.age }}
      </p>
      <!-- Status Badge -->
      <span
        v-if="simulationState"
        class="text-[10px] px-2 py-0.5 rounded-full font-medium ml-2"
        :class="statusBadgeClass"
      >
        {{ simulationState.currentAction }}
      </span>
    </div>

    <!-- Location -->
    <p v-if="simulationState?.location?.lotName" class="text-xs text-gf-text-faint mt-1 flex items-center">
      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {{ simulationState.location.lotName }}
      <span v-if="simulationState.location.spaceName" class="ml-1">→ {{ simulationState.location.spaceName }}</span>
    </p>

    <NeedSummaryStrip
      v-if="simulationState && showNeeds"
      :summaries="needSummaries"
      class="mt-2"
    />

    <!-- Needs - Show all for active character, compact for others -->
    <div v-if="simulationState && showNeeds && isActive" class="mt-2 space-y-1 text-[10px]">
      <div v-for="need in allNeeds" :key="need.key" class="flex items-center">
        <span class="mr-1">{{ need.icon }}</span>
        <div class="flex-1 bg-gf-surface-3 h-1.5 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="getNeedColorClass(simulationState.needs[need.key])"
            :style="{ width: `${simulationState.needs[need.key] * 100}%` }"
          />
        </div>
        <span class="ml-1 text-gf-text-weak w-8 text-right">
          {{ Math.round(simulationState.needs[need.key] * 100) }}%
        </span>
      </div>
    </div>

    <!-- Compact needs for non-active characters (just food & sleep) -->
    <div v-else-if="simulationState && showNeeds && !isActive" class="mt-2 grid grid-cols-2 gap-1 text-[10px]">
      <div v-for="need in compactNeeds" :key="need.key" class="flex items-center">
        <span class="mr-1">{{ need.icon }}</span>
        <div class="flex-1 bg-gf-surface-3 h-1.5 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="getNeedColorClass(simulationState.needs[need.key])"
            :style="{ width: `${simulationState.needs[need.key] * 100}%` }"
          />
        </div>
      </div>
    </div>

    <p v-if="showTraits && entity.traits && entity.traits.length > 0" class="text-xs text-gf-text-faint mt-1">
      {{ entity.traits.join(', ') }}
    </p>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSimulationStore } from '../stores/simulation'
import type { ActionName, NeedName } from '../stores/types'
import NeedSummaryStrip from './NeedSummaryStrip.vue'
import { createNeedSummaries } from '../composables/useNeedSummary'

const simulationStore = useSimulationStore()

interface ListEntity {
  id: string
  name: string
  age: number
  traits?: string[]
}

interface NeedDescriptor {
  key: NeedName
  icon: string
}

const props = defineProps<{
  entity: ListEntity
  type: 'character' | 'animal'
  isActive?: boolean
  showTraits?: boolean
  showNeeds?: boolean
}>()

defineEmits(['select'])

const icon = computed(() => {
  return props.type === 'animal' ? '🐾' : '👤'
})

const hoverClass = computed(() => {
  return 'hover:bg-gf-surface-2'
})

const activeClass = computed(() => {
  return props.type === 'animal' ? 'bg-gf-surface-3 border-gf-amber' : 'bg-gf-blue/10 border-gf-blue'
})

const simulationState = computed(() => {
  return simulationStore.getCharacterState(props.entity.id)
})

const needSummaries = computed(() => {
  if (!simulationState.value) {
    return []
  }

  return createNeedSummaries(simulationState.value.needs)
})

const statusBadgeClass = computed(() => {
  const action = simulationState.value?.currentAction
  const neutral = 'bg-gf-surface-3 text-gf-text-weak'
  if (!action) return neutral

  const statusColors: Partial<Record<ActionName, string>> = {
    idle: neutral,
    eat: 'bg-gf-green/15 text-gf-green',
    sleep: 'bg-gf-blue/15 text-gf-blue',
    use_toilet: 'bg-gf-blue/15 text-gf-blue',
    shower: 'bg-gf-blue/15 text-gf-blue',
    medicate: 'bg-gf-red/15 text-gf-red',
    date: 'bg-gf-purple/15 text-gf-purple',
    read: 'bg-gf-purple/15 text-gf-purple',
    write: 'bg-gf-purple/15 text-gf-purple',
    chat_friend: 'bg-gf-purple/15 text-gf-purple',
    view_art: 'bg-gf-purple/15 text-gf-purple',
    view_movie: 'bg-gf-purple/15 text-gf-purple',
    work: 'bg-gf-amber/15 text-gf-amber'
  }

  return statusColors[action] || neutral
})

const getNeedColorClass = (value: number): string => {
  if (value >= 0.7) return 'bg-gf-green'
  if (value >= 0.4) return 'bg-gf-amber'
  if (value >= 0.2) return 'bg-gf-amber'
  return 'bg-gf-red'
}

// All needs with their icons (for active character)
const allNeeds: NeedDescriptor[] = [
  { key: 'food', icon: '🍎' },
  { key: 'sleep', icon: '😴' },
  { key: 'bladder', icon: '🚽' },
  { key: 'hygiene', icon: '🫧' },
  { key: 'health', icon: '💊' },
  { key: 'friends', icon: '💬' },
  { key: 'family', icon: '👨‍👩‍👧' },
  { key: 'romance', icon: '💕' },
  { key: 'fulfillment', icon: '✨' }
]

// Compact needs (for non-active characters)
const compactNeeds: NeedDescriptor[] = [
  { key: 'food', icon: '🍎' },
  { key: 'sleep', icon: '😴' }
]
</script>
