<template>
  <div class="space-y-3">
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
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Status</p>
      <p class="text-base text-gray-900 dark:text-gray-100">{{ statusSummary }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getCharacterStatusText } from '../composables/useCharacterStatus'
import { useCharacterPanelStore } from '../stores/characterPanel'

const props = defineProps({
  character: {
    type: Object,
    required: true
  },
  characterState: {
    type: Object,
    default: null
  },
  formatAction: {
    type: Function,
    required: true
  }
})

const characterPanelStore = useCharacterPanelStore()
const editingBio = ref(false)
const bioDraft = ref('')
const statusSummary = computed(() => getCharacterStatusText(props.characterState))

watch(
  () => props.character.bio,
  (value) => {
    bioDraft.value = value || ''
  },
  { immediate: true }
)

async function saveBio() {
  await characterPanelStore.updateCharacterBio(props.character.id, bioDraft.value)
  props.character.bio = bioDraft.value
  editingBio.value = false
}
</script>
