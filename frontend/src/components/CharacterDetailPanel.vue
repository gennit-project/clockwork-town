<template>
  <div class="fixed bottom-4 left-4 w-80 h-[300px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-gray-300 dark:border-gray-600 z-40 flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ character.name }}</h3>
      <button
        @click="$emit('close')"
        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        title="Close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto flex-shrink-0">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="activeTab = tab"
        class="flex-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap"
        :class="activeTab === tab
          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Content -->
    <div class="p-4 overflow-y-auto flex-1">
      <!-- Basics Tab -->
      <div v-if="activeTab === 'Basics'" class="space-y-4">
        <!-- Location & Status -->
        <div class="flex items-center justify-between text-xs mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center text-gray-700 dark:text-gray-300">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{{ characterState?.location?.lotName || 'Unknown' }}</span>
          </div>
          <div class="flex items-center text-purple-600 dark:text-purple-400">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{{ formatAction(characterState?.currentAction || 'idle') }}</span>
          </div>
        </div>

        <!-- Basic Needs -->
        <div class="space-y-2">
          <NeedBar
            v-for="need in basicNeeds"
            :key="need.key"
            :icon="need.icon"
            :label="need.label"
            :percentage="(characterState?.needs?.[need.key] || 0) * 100"
          />
        </div>
      </div>

      <!-- Emotions Tab -->
      <div v-else-if="activeTab === 'Emotions'" class="space-y-2">
        <NeedBar
          v-for="need in emotionalNeeds"
          :key="need.key"
          :icon="need.icon"
          :label="need.label"
          :percentage="(characterState?.needs?.[need.key] || 0) * 100"
        />
      </div>

      <!-- Fulfillment Tab -->
      <div v-else-if="activeTab === 'Fulfillment'" class="space-y-2">
        <NeedBar
          v-for="need in fulfillmentNeeds"
          :key="need.key"
          :icon="need.icon"
          :label="need.label"
          :percentage="(characterState?.needs?.[need.key] || 0) * 100"
        />
      </div>

      <!-- Bio Tab -->
      <div v-else-if="activeTab === 'Bio'" class="space-y-3">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Age</p>
          <p class="text-base text-gray-900 dark:text-gray-100">{{ character.age }}</p>
        </div>

        <div v-if="character.traits && character.traits.length > 0">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Traits</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="trait in character.traits"
              :key="trait"
              class="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-full"
            >
              {{ trait }}
            </span>
          </div>
        </div>

        <div v-if="characterState?.location">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</p>
          <p class="text-base text-gray-900 dark:text-gray-100">
            {{ characterState.location.spaceName }} ({{ characterState.location.lotName }})
          </p>
        </div>

        <div v-if="characterState?.currentAction">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Activity</p>
          <p class="text-base text-gray-900 dark:text-gray-100">{{ formatAction(characterState.currentAction) }}</p>
        </div>
      </div>

      <!-- Memories Tab -->
      <div v-else-if="activeTab === 'Memories'" class="space-y-2">
        <div v-if="characterState?.memories && characterState.memories.length > 0">
          <div
            v-for="(memory, index) in characterState.memories.slice().reverse()"
            :key="index"
            class="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium text-gray-900 dark:text-gray-100">{{ formatAction(memory.action) }}</span>
              <span class="text-gray-500 dark:text-gray-400">Tick {{ memory.tick }}</span>
            </div>
            <p class="text-gray-600 dark:text-gray-300">{{ memory.item }} at {{ memory.location }}</p>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No memories yet</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSimulationStore } from '../stores/simulation'
import NeedBar from './NeedBar.vue'

const props = defineProps({
  character: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])

const simulationStore = useSimulationStore()
const activeTab = ref('Basics')

const tabs = ['Basics', 'Emotions', 'Fulfillment', 'Bio', 'Memories']

const characterState = computed(() => {
  return simulationStore.characterStates[props.character.id]
})

const formatAction = (action) => {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const basicNeeds = [
  { key: 'food', icon: '🍎', label: 'Food' },
  { key: 'sleep', icon: '😴', label: 'Sleep' },
  { key: 'health', icon: '💊', label: 'Health' }
]

const emotionalNeeds = [
  { key: 'friends', icon: '💬', label: 'Friends' },
  { key: 'family', icon: '👨‍👩‍👧', label: 'Family' },
  { key: 'romance', icon: '💕', label: 'Romance' }
]

const fulfillmentNeeds = [
  { key: 'fulfillment', icon: '✨', label: 'Fulfillment' }
]
</script>
