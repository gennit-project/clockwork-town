<template>
  <div class="space-y-2">
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
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCharacterPanelStore } from '../stores/characterPanel'

const props = defineProps({
  characterId: {
    type: String,
    required: true
  },
  characterState: {
    type: Object,
    default: null
  }
})

const characterPanelStore = useCharacterPanelStore()
const memoryDraft = ref('')
const editingMemoryId = ref<string | null>(null)
const editingMemoryContent = ref('')

const longTermMemories = computed(() => props.characterState?.longTermMemories || [])

async function saveMemory() {
  if (!memoryDraft.value.trim()) {
    return
  }
  await characterPanelStore.createLongTermMemory(props.characterId, memoryDraft.value.trim())
  memoryDraft.value = ''
}

async function saveEditedMemory() {
  if (!editingMemoryId.value) {
    return
  }
  await characterPanelStore.updateLongTermMemory(props.characterId, editingMemoryId.value, editingMemoryContent.value)
  editingMemoryId.value = null
  editingMemoryContent.value = ''
}

async function removeMemory(memoryId: string) {
  await characterPanelStore.deleteLongTermMemory(props.characterId, memoryId)
}

function startEditingMemory(memory: { id: string; content: string }) {
  editingMemoryId.value = memory.id
  editingMemoryContent.value = memory.content
}
</script>
