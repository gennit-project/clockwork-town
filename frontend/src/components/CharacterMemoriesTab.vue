<template>
  <div class="space-y-2">
    <div class="space-y-2 mb-4">
      <textarea
        v-model="memoryDraft"
        rows="3"
        class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
        placeholder="Add a long-term memory"
      />
      <button
        type="button"
        class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25"
        @click="saveMemory"
      >
        Add Memory
      </button>
    </div>
    <div v-if="longTermMemories.length > 0">
      <div
        v-for="memory in longTermMemories"
        :key="memory.id"
        class="p-2 bg-gf-surface-2 rounded text-xs"
      >
        <div class="flex items-center justify-between mb-1 gap-2">
          <span class="font-medium text-gf-text">{{ new Date(memory.createdAt).toLocaleDateString() }}</span>
          <div class="flex gap-2">
            <button type="button" class="text-gf-blue hover:underline" @click="startEditingMemory(memory)">Edit</button>
            <button type="button" class="text-gf-red hover:underline" @click="removeMemory(memory.id)">Delete</button>
          </div>
        </div>
        <textarea
          v-if="editingMemoryId === memory.id"
          v-model="editingMemoryContent"
          rows="3"
          class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
        />
        <p v-else class="text-gf-text-weak whitespace-pre-wrap">{{ memory.content }}</p>
        <button
          v-if="editingMemoryId === memory.id"
          type="button"
          class="mt-2 rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25"
          @click="saveEditedMemory"
        >
          Save
        </button>
      </div>
    </div>
    <div v-else class="text-center py-8 text-gf-text-faint">
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
