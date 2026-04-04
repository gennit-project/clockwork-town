<template>
  <div class="flex h-full min-h-0 w-full flex-col bg-white dark:bg-gray-800">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div class="min-w-0">
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ character.name }}</h3>
        <p class="mt-1 truncate text-xs font-medium text-blue-700 dark:text-blue-300">
          {{ statusSummary }}
        </p>
      </div>
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
      <div v-if="activeTab === 'Needs'" class="space-y-5">
        <!-- Location & Status -->
        <div class="flex items-center justify-between text-xs mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center text-gray-700 dark:text-gray-300">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{{ statusLocation }}</span>
          </div>
          <div class="flex items-center text-purple-600 dark:text-purple-400">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{{ statusSummary }}</span>
          </div>
        </div>

        <div
          v-for="section in needSections"
          :key="section.label"
          class="space-y-2"
        >
          <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {{ section.label }}
          </h4>
          <NeedBar
            v-for="need in section.needs"
            :key="need.key"
            :icon="need.icon"
            :label="need.label"
            :percentage="(characterState?.needs?.[need.key] || 0) * 100"
            clickable
            @select="openNeedPicker(need.key)"
          />
        </div>
      </div>

      <CharacterBioTab
        v-else-if="activeTab === 'Bio'"
        :character="character"
        :character-state="characterState"
        :format-action="formatAction"
      />

      <!-- Memories Tab -->
      <CharacterMemoriesTab
        v-else-if="activeTab === 'Memories'"
        :character-id="character.id"
        :character-state="characterState"
      />
    </div>

    <CharacterNeedPicker
      :visible="showNeedPicker"
      :selected-need="selectedNeed ?? ''"
      :options="selectableOptions"
      @close="showNeedPicker = false"
      @select="queueIntent"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSimulationStore } from '../stores/simulation'
import { useCharacterIntentOptions } from '../composables/useCharacterIntentOptions'
import { getCharacterStatusMeta } from '../composables/useCharacterStatus'
import type { Intent, NeedName } from '../stores/types'
import CharacterBioTab from './CharacterBioTab.vue'
import CharacterMemoriesTab from './CharacterMemoriesTab.vue'
import CharacterNeedPicker from './CharacterNeedPicker.vue'
import NeedBar from './NeedBar.vue'

interface CharacterPanelEntity {
  id: string
  name: string
  age: number
  bio?: string | null
  traits?: string[]
}

interface RomanceTarget {
  id: string
  name: string
}

interface NeedDescriptor {
  key: NeedName
  icon: string
  label: string
}

interface NeedSection {
  label: string
  needs: NeedDescriptor[]
}

const props = defineProps<{
  character: CharacterPanelEntity
  availableRomanceTargets?: RomanceTarget[]
}>()

defineEmits<{
  close: []
}>()

const simulationStore = useSimulationStore()
const activeTab = ref('Needs')
const showNeedPicker = ref(false)

const tabs = ['Needs', 'Bio', 'Memories'] as const

const { characterState, selectedNeed, selectableOptions } = useCharacterIntentOptions(
  props.character,
  props.availableRomanceTargets ?? []
)

const statusMeta = computed(() => getCharacterStatusMeta(characterState.value))
const statusSummary = computed(() => statusMeta.value.summary)
const statusLocation = computed(() => statusMeta.value.location)

const formatAction = (action: string): string => {
  return action
    .split('_')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const basicNeeds: NeedDescriptor[] = [
  { key: 'food', icon: '🍎', label: 'Food' },
  { key: 'sleep', icon: '😴', label: 'Sleep' },
  { key: 'bladder', icon: '🚽', label: 'Bladder' },
  { key: 'hygiene', icon: '🫧', label: 'Hygiene' },
  { key: 'health', icon: '💊', label: 'Health' }
]

const emotionalNeeds: NeedDescriptor[] = [
  { key: 'friends', icon: '💬', label: 'Friends' },
  { key: 'family', icon: '👨‍👩‍👧', label: 'Family' },
  { key: 'romance', icon: '💕', label: 'Romance' }
]

const fulfillmentNeeds: NeedDescriptor[] = [
  { key: 'fulfillment', icon: '✨', label: 'Fulfillment' }
]

const needSections: NeedSection[] = [
  { label: 'Basics', needs: basicNeeds },
  { label: 'Emotions', needs: emotionalNeeds },
  { label: 'Fulfillment', needs: fulfillmentNeeds }
]

function openNeedPicker(needKey: NeedName) {
  selectedNeed.value = needKey
  showNeedPicker.value = true
}

function queueIntent(intent: Intent) {
  simulationStore.enqueueIntent(props.character.id, intent)
  showNeedPicker.value = false
}
</script>
