<template>
  <div class="flex h-full min-h-0 w-full flex-col bg-gf-surface border border-gf-border">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gf-border flex-shrink-0">
      <div class="min-w-0">
        <h3 class="text-lg font-bold text-gf-text">{{ character.name }}</h3>
        <p class="mt-1 truncate text-xs font-medium text-gf-blue">
          {{ statusSummary }}
        </p>
      </div>
      <button
        @click="$emit('close')"
        class="text-gf-text-faint hover:text-gf-text"
        title="Close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gf-border overflow-x-auto flex-shrink-0">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="activeTab = tab"
        class="flex-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap"
        :class="activeTab === tab
          ? 'text-gf-blue border-b-2 border-gf-blue'
          : 'text-gf-text-weak hover:text-gf-text'"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Content -->
    <div class="p-4 overflow-y-auto flex-1">
      <div v-if="activeTab === 'Needs'" class="space-y-5">
        <NeedSummaryStrip
          v-if="characterState"
          :summaries="needSummaries"
        />

        <!-- Location & Status -->
        <div class="flex items-center justify-between text-xs mb-4 pb-3 border-b border-gf-border">
          <div class="flex items-center text-gf-text-weak">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{{ statusLocation }}</span>
          </div>
          <div class="flex items-center text-gf-purple">
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
          <h4 class="text-xs font-semibold uppercase tracking-wide text-gf-text-faint">
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

      <CharacterRelationshipsTab
        v-else-if="activeTab === 'Relationships'"
        :character-name="character.name"
        :character-id="character.id"
        :character-state="characterState"
        :available-characters="availableRomanceTargets"
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
import CharacterRelationshipsTab from './CharacterRelationshipsTab.vue'
import NeedBar from './NeedBar.vue'
import NeedSummaryStrip from './NeedSummaryStrip.vue'
import { createNeedSummaries } from '../composables/useNeedSummary'

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

const tabs = ['Needs', 'Bio', 'Relationships', 'Memories'] as const

const { characterState, selectedNeed, selectableOptions } = useCharacterIntentOptions(
  props.character,
  props.availableRomanceTargets ?? []
)

const statusMeta = computed(() => getCharacterStatusMeta(characterState.value))
const statusSummary = computed(() => statusMeta.value.summary)
const statusLocation = computed(() => statusMeta.value.location)
const needSummaries = computed(() => {
  if (!characterState.value) {
    return []
  }

  return createNeedSummaries(characterState.value.needs)
})

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
