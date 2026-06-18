<template>
  <div class="space-y-3">
    <div class="flex items-start justify-between gap-2">
      <div>
        <p class="text-sm text-gf-text-weak mb-1">Age</p>
        <p class="text-base text-gf-text">{{ character.age }}</p>
      </div>
      <button
        type="button"
        class="text-xs text-gf-blue hover:underline"
        @click="editingBio = !editingBio"
      >
        {{ editingBio ? 'Cancel' : 'Edit Bio' }}
      </button>
    </div>

    <div>
      <p class="text-sm text-gf-text-weak mb-1">Bio</p>
      <textarea
        v-if="editingBio"
        v-model="bioDraft"
        rows="5"
        class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
      />
      <p v-else class="text-sm text-gf-text whitespace-pre-wrap">{{ bioDraft || 'No bio yet.' }}</p>
      <button
        v-if="editingBio"
        type="button"
        class="mt-2 rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25"
        @click="saveBio"
      >
        Save Bio
      </button>
    </div>

    <div v-if="character.traits && character.traits.length > 0">
      <p class="text-sm text-gf-text-weak mb-1">Traits</p>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="trait in character.traits"
          :key="trait"
          class="px-2 py-1 text-xs font-medium border border-gf-purple/30 bg-gf-purple/15 text-gf-purple rounded-full"
        >
          {{ trait }}
        </span>
      </div>
    </div>

    <div v-if="characterState?.location">
      <p class="text-sm text-gf-text-weak mb-1">Location</p>
      <p class="text-base text-gf-text">
        {{ characterState.location.spaceName }} ({{ characterState.location.lotName }})
      </p>
    </div>

    <div v-if="characterState?.currentAction">
      <p class="text-sm text-gf-text-weak mb-1">Current Status</p>
      <p class="text-base text-gf-text">{{ statusSummary }}</p>
    </div>

    <div v-if="characterState?.workSchedule?.length">
      <p class="text-sm text-gf-text-weak mb-1">Work Schedule</p>
      <div class="space-y-1">
        <p
          v-for="shift in characterState.workSchedule"
          :key="`${shift.day}-${shift.start}-${shift.locationLotId || shift.locationLotName}`"
          class="text-sm text-gf-text"
        >
          {{ shift.day }} {{ shift.start }}-{{ shift.end }} at {{ shift.locationLotName || 'Work' }}
        </p>
      </div>
    </div>

    <div class="pt-2">
      <button
        type="button"
        class="text-xs font-medium text-gf-blue hover:underline"
        @click="openEditor"
      >
        Open Character Editor
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { routerKey } from 'vue-router'
import { getCharacterStatusText } from '../composables/useCharacterStatus'
import { useCharacterPanelStore } from '../stores/characterPanel'
import type { CharacterState } from '../stores/types'

interface CharacterBioEntity {
  id: string
  age: number
  bio?: string | null
  traits?: string[]
}

const props = defineProps<{
  character: CharacterBioEntity
  characterState: CharacterState | null
  formatAction: (action: string) => string
}>()

const router = inject(routerKey, null)
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
  editingBio.value = false
}

function openEditor() {
  if (!router) {
    return
  }

  const currentRoute = router.currentRoute.value
  const worldId = currentRoute.params.worldId
  const regionId = currentRoute.params.regionId
  if (typeof worldId !== 'string' || typeof regionId !== 'string') {
    return
  }

  router.push(`/world/${worldId}/region/${regionId}/character/${props.character.id}/edit`)
}
</script>
