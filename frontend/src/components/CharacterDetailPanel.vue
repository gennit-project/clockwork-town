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
            clickable
            @select="openNeedPicker(need.key)"
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
          clickable
          @select="openNeedPicker(need.key)"
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
          clickable
          @select="openNeedPicker(need.key)"
        />
      </div>

      <!-- Bio Tab -->
      <div v-else-if="activeTab === 'Bio'" class="space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Age</p>
            <p class="text-base text-gray-900 dark:text-gray-100">{{ character.age }}</p>
          </div>
          <button
            type="button"
            class="text-xs text-blue-600 dark:text-blue-400"
            @click="editingBio = !editingBio"
          >
            {{ editingBio ? 'Cancel' : 'Edit Bio' }}
          </button>
        </div>

        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Bio</p>
          <textarea
            v-if="editingBio"
            v-model="bioDraft"
            rows="5"
            class="w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm"
          />
          <p v-else class="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{{ character.bio || 'No bio yet.' }}</p>
          <button
            v-if="editingBio"
            type="button"
            class="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white"
            @click="saveBio"
          >
            Save Bio
          </button>
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
        <div class="space-y-2 mb-4">
          <textarea
            v-model="memoryDraft"
            rows="3"
            class="w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm"
            placeholder="Add a long-term memory"
          />
          <button
            type="button"
            class="rounded bg-blue-600 px-3 py-1 text-xs text-white"
            @click="saveMemory"
          >
            Add Memory
          </button>
        </div>
        <div v-if="longTermMemories.length > 0">
          <div
            v-for="memory in longTermMemories"
            :key="memory.id"
            class="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"
          >
            <div class="flex items-center justify-between mb-1 gap-2">
              <span class="font-medium text-gray-900 dark:text-gray-100">{{ new Date(memory.createdAt).toLocaleDateString() }}</span>
              <div class="flex gap-2">
                <button type="button" class="text-blue-600 dark:text-blue-400" @click="startEditingMemory(memory)">Edit</button>
                <button type="button" class="text-red-600 dark:text-red-400" @click="removeMemory(memory.id)">Delete</button>
              </div>
            </div>
            <textarea
              v-if="editingMemoryId === memory.id"
              v-model="editingMemoryContent"
              rows="3"
              class="w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-2 py-1"
            />
            <p v-else class="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{{ memory.content }}</p>
            <button
              v-if="editingMemoryId === memory.id"
              type="button"
              class="mt-2 rounded bg-blue-600 px-2 py-1 text-[11px] text-white"
              @click="saveEditedMemory"
            >
              Save
            </button>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No long-term memories yet</p>
        </div>
      </div>
    </div>

    <div
      v-if="showNeedPicker"
      class="absolute inset-0 bg-white/95 dark:bg-gray-900/95 p-4 overflow-y-auto"
    >
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Satisfy {{ selectedNeed }}
        </h4>
        <button type="button" class="text-xs text-gray-500" @click="showNeedPicker = false">Close</button>
      </div>
      <div v-if="selectableOptions.length === 0" class="text-xs text-gray-500 dark:text-gray-400">
        No options available right now.
      </div>
      <div v-else class="space-y-2">
        <button
          v-for="option in selectableOptions"
          :key="option.label"
          type="button"
          class="w-full rounded border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-xs text-gray-900 dark:text-gray-100"
          @click="queueIntent(option.intent)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSimulationStore } from '../stores/simulation'
import { findItemsWithAffordance } from '../stores/utils/pathfinding'
import NeedBar from './NeedBar.vue'

const props = defineProps({
  character: {
    type: Object,
    required: true
  },
  availableRomanceTargets: {
    type: Array,
    default: () => []
  }
})

defineEmits(['close'])

const simulationStore = useSimulationStore()
const activeTab = ref('Basics')
const showNeedPicker = ref(false)
const selectedNeed = ref<string | null>(null)
const editingBio = ref(false)
const bioDraft = ref('')
const memoryDraft = ref('')
const editingMemoryId = ref<string | null>(null)
const editingMemoryContent = ref('')

const tabs = ['Basics', 'Emotions', 'Fulfillment', 'Bio', 'Memories']

const characterState = computed(() => {
  return simulationStore.characterStates[props.character.id]
})

watch(
  () => props.character.bio,
  (value) => {
    bioDraft.value = value || ''
  },
  { immediate: true }
)

const formatAction = (action) => {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const basicNeeds = [
  { key: 'food', icon: '🍎', label: 'Food' },
  { key: 'sleep', icon: '😴', label: 'Sleep' },
  { key: 'bladder', icon: '🚽', label: 'Bladder' },
  { key: 'hygiene', icon: '🫧', label: 'Hygiene' },
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

const selectableOptions = computed(() => {
  const state = characterState.value
  if (!state || !selectedNeed.value) {
    return []
  }

  const needToAction = {
    food: 'eat',
    sleep: 'sleep',
    bladder: 'use_toilet',
    hygiene: 'shower',
    health: 'medicate',
    romance: 'date',
    friends: 'chat_friend',
    family: 'call_mom',
    fulfillment: 'read'
  }

  if (selectedNeed.value === 'romance') {
    return (props.availableRomanceTargets || [])
      .filter((target: any) => target.id !== props.character.id)
      .flatMap((target: any) => ([
        { label: `Text ${target.name}`, intent: { action: 'text_romance', utility: 1, source: 'manual', socialTargetId: target.id, socialTargetName: target.name } },
        { label: `Call ${target.name}`, intent: { action: 'call_romance', utility: 1, source: 'manual', socialTargetId: target.id, socialTargetName: target.name } },
        { label: `Invite ${target.name} over`, intent: { action: 'invite_over', utility: 1, source: 'manual', socialTargetId: target.id, socialTargetName: target.name } }
      ]))
  }

  const action = needToAction[selectedNeed.value]
  if (!action) {
    return []
  }

  return findItemsWithAffordance(props.character.id, action, state.location, simulationStore.worldData, {})
    .map((option) => ({
      label: `${option.itemName} in ${option.lotName} → ${option.spaceName}`,
      intent: {
        action,
        itemId: option.itemId,
        itemName: option.itemName,
        targetSpaceId: option.spaceId,
        targetSpaceName: option.spaceName,
        targetLotId: option.lotId,
        targetLotName: option.lotName,
        travelCost: option.travelCost,
        utility: option.affordanceWeight,
        source: 'manual'
      }
    }))
})

const longTermMemories = computed(() => characterState.value?.longTermMemories || [])

function openNeedPicker(needKey: string) {
  selectedNeed.value = needKey
  showNeedPicker.value = true
}

function queueIntent(intent: any) {
  simulationStore.enqueueIntent(props.character.id, intent)
  showNeedPicker.value = false
}

async function saveBio() {
  await simulationStore.updateCharacterBio(props.character.id, bioDraft.value)
  props.character.bio = bioDraft.value
  editingBio.value = false
}

async function saveMemory() {
  if (!memoryDraft.value.trim()) {
    return
  }
  await simulationStore.createLongTermMemory(props.character.id, memoryDraft.value.trim())
  memoryDraft.value = ''
}

async function saveEditedMemory() {
  if (!editingMemoryId.value) {
    return
  }
  await simulationStore.updateLongTermMemory(props.character.id, editingMemoryId.value, editingMemoryContent.value)
  editingMemoryId.value = null
  editingMemoryContent.value = ''
}

async function removeMemory(memoryId: string) {
  await simulationStore.deleteLongTermMemory(props.character.id, memoryId)
}

function startEditingMemory(memory: any) {
  editingMemoryId.value = memory.id
  editingMemoryContent.value = memory.content
}
</script>
