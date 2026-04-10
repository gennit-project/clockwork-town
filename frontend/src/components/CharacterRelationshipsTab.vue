<template>
  <div class="space-y-4">
    <div v-if="sortedRelationships.length === 0" class="rounded border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
      No relationships tracked yet.
    </div>

    <template v-else>
      <div class="space-y-2">
        <button
          v-for="relationship in sortedRelationships"
          :key="relationship.id"
          type="button"
          class="w-full rounded border px-3 py-3 text-left transition-colors"
          :class="relationship.id === selectedRelationshipId
            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
            : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'"
          @click="selectedRelationshipId = relationship.id"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {{ getRelationshipTargetName(relationship) }}
              </p>
              <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Long-term {{ formatScore(relationship.longTermScore) }} | Short-term {{ formatScore(relationship.shortTermScore) }}
              </p>
            </div>
            <span
              v-if="relationship.isDeceasedTarget"
              class="rounded-full bg-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
            >
              Deceased
            </span>
          </div>
          <div v-if="relationship.labels.length > 0" class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="label in relationship.labels"
              :key="label"
              class="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
            >
              {{ label }}
            </span>
          </div>
        </button>
      </div>

      <div v-if="selectedRelationship" class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-base font-semibold text-gray-900 dark:text-gray-100">
              {{ characterName }} -> {{ getRelationshipTargetName(selectedRelationship) }}
            </p>
            <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Directional relationship details
            </p>
          </div>
          <span
            v-if="selectedRelationship.isDeceasedTarget"
            class="rounded-full bg-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
          >
            Deceased
          </span>
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <div class="rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40">
            <p class="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {{ characterName }} -> {{ getRelationshipTargetName(selectedRelationship) }}
            </p>
            <div class="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Long-term</p>
                <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{{ formatScore(selectedRelationship.longTermScore) }}</p>
              </div>
              <div>
                <p class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Short-term</p>
                <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{{ formatScore(selectedRelationship.shortTermScore) }}</p>
              </div>
            </div>
          </div>

          <div class="rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40">
            <p class="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {{ getRelationshipTargetName(selectedRelationship) }} -> {{ characterName }}
            </p>
            <template v-if="reverseRelationship">
              <div class="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Long-term</p>
                  <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{{ formatScore(reverseRelationship.longTermScore) }}</p>
                </div>
                <div>
                  <p class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Short-term</p>
                  <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{{ formatScore(reverseRelationship.shortTermScore) }}</p>
                </div>
              </div>
            </template>
            <p v-else class="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No reverse relationship tracked yet.
            </p>
          </div>
        </div>

        <div
          v-if="reverseRelationship"
          class="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200"
        >
          <p class="font-medium">Directional discrepancy</p>
          <p class="mt-1">
            {{ characterName }} currently values this relationship
            {{ compareScoreDirection(selectedRelationship.longTermScore, reverseRelationship.longTermScore) }}
            than {{ getRelationshipTargetName(selectedRelationship) }} does.
          </p>
        </div>

        <div class="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <span class="font-medium text-gray-900 dark:text-gray-100">Availability:</span>
            {{ relationshipAvailability }}
          </p>
          <p>
            <span class="font-medium text-gray-900 dark:text-gray-100">Last seen:</span>
            {{ formatDateTime(selectedRelationship.lastSeenAt) }}
          </p>
          <p>
            <span class="font-medium text-gray-900 dark:text-gray-100">Last spoke:</span>
            {{ formatDateTime(selectedRelationship.lastSpokeAt) }}
          </p>
        </div>

        <div class="mt-4">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Contact</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-800"
              :disabled="!canContactSelectedRelationship"
              @click="queueRelationshipContactAction('text_romance')"
            >
              Text
            </button>
            <button
              type="button"
              class="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-800"
              :disabled="!canContactSelectedRelationship"
              @click="queueRelationshipContactAction('call_romance')"
            >
              Call
            </button>
            <button
              type="button"
              class="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-800"
              :disabled="!canInviteSelectedRelationship"
              @click="queueRelationshipContactAction('invite_over')"
            >
              Invite Over
            </button>
          </div>
        </div>

        <div class="mt-4">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Labels</p>
          <div v-if="selectedRelationship.labels.length > 0" class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="label in selectedRelationship.labels"
              :key="label"
              class="rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
            >
              {{ label }}
            </span>
          </div>
          <p v-else class="mt-2 text-sm text-gray-500 dark:text-gray-400">No labels assigned yet.</p>
        </div>

        <div class="mt-5">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Linked memories</p>
          <div v-if="linkedMemories.length > 0" class="mt-2 space-y-2">
            <div
              v-for="memory in linkedMemories"
              :key="memory.id"
              class="rounded border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900/40"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-medium text-gray-900 dark:text-gray-100">{{ formatMemoryTitle(memory) }}</span>
                <span class="text-[11px] text-gray-500 dark:text-gray-400">{{ formatDateTime(memory.createdAt) }}</span>
              </div>
              <p class="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ memory.content }}</p>
              <p v-if="memory.locationLotName || memory.locationSpaceName" class="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                {{ formatMemoryLocation(memory) }}
              </p>
            </div>
          </div>
          <p v-else class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No memories linked to this relationship yet.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSimulationStore } from '../stores/simulation'
import type { ActionName, CharacterRelationship, CharacterState, Intent, LongTermMemory } from '../stores/types'
import { canQueueRelationshipAction, evaluateRelationshipAvailability } from '../stores/utils/relationshipAvailability'

interface CharacterSummary {
  id: string
  name: string
}

const props = defineProps<{
  characterName: string
  characterId?: string
  characterState: CharacterState | null
  availableCharacters?: CharacterSummary[]
}>()

const simulationStore = useSimulationStore()
const selectedRelationshipId = ref<string | null>(null)

const sortedRelationships = computed(() => {
  return [...(props.characterState?.relationships || [])].sort((left, right) => {
    if (right.longTermScore !== left.longTermScore) {
      return right.longTermScore - left.longTermScore
    }

    if (right.shortTermScore !== left.shortTermScore) {
      return right.shortTermScore - left.shortTermScore
    }

    return getRelationshipTargetName(left).localeCompare(getRelationshipTargetName(right))
  })
})

const selectedRelationship = computed<CharacterRelationship | null>(() => {
  if (!selectedRelationshipId.value) {
    return sortedRelationships.value[0] || null
  }

  return sortedRelationships.value.find((relationship) => relationship.id === selectedRelationshipId.value) || sortedRelationships.value[0] || null
})

const linkedMemories = computed<LongTermMemory[]>(() => {
  const relationshipId = selectedRelationship.value?.id
  if (!relationshipId) {
    return []
  }

  return (props.characterState?.longTermMemories || []).filter((memory) =>
    (memory.relationshipIds || []).includes(relationshipId)
  )
})

const reverseRelationship = computed<CharacterRelationship | null>(() => {
  const relationship = selectedRelationship.value
  const characterId = props.characterId
  if (!relationship || !characterId) {
    return null
  }

  const targetState = simulationStore.characterStates[relationship.toCharacterId]
  if (!targetState?.relationships?.length) {
    return null
  }

  return targetState.relationships.find((entry) => entry.toCharacterId === characterId) || null
})

const selectedRelationshipTargetState = computed<CharacterState | null>(() => {
  const relationship = selectedRelationship.value
  if (!relationship) {
    return null
  }

  return simulationStore.characterStates[relationship.toCharacterId] || null
})

const selectedRelationshipAvailability = computed(() => {
  return evaluateRelationshipAvailability({
    relationship: selectedRelationship.value,
    targetState: selectedRelationshipTargetState.value
  })
})

const canContactSelectedRelationship = computed(() => {
  return selectedRelationshipAvailability.value.canText || selectedRelationshipAvailability.value.canCall
})

const canInviteSelectedRelationship = computed(() => selectedRelationshipAvailability.value.canInviteOver)

const relationshipAvailability = computed(() => selectedRelationshipAvailability.value.summary)

watch(sortedRelationships, (relationships) => {
  if (!relationships.length) {
    selectedRelationshipId.value = null
    return
  }

  if (!selectedRelationshipId.value || !relationships.some((relationship) => relationship.id === selectedRelationshipId.value)) {
    selectedRelationshipId.value = relationships[0].id
  }
}, { immediate: true })

function getRelationshipTargetName(relationship: CharacterRelationship): string {
  return props.availableCharacters?.find((character) => character.id === relationship.toCharacterId)?.name
    || relationship.toCharacterId
}

function formatScore(value: number): string {
  return value.toFixed(1)
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Never'
  }

  return new Date(value).toLocaleString()
}

function formatMemoryTitle(memory: LongTermMemory): string {
  return memory.eventType
    ? memory.eventType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    : 'Memory'
}

function formatMemoryLocation(memory: LongTermMemory): string {
  if (memory.locationLotName && memory.locationSpaceName) {
    return `${memory.locationLotName} -> ${memory.locationSpaceName}`
  }

  return memory.locationLotName || memory.locationSpaceName || ''
}

function compareScoreDirection(left: number, right: number): string {
  if (left > right) {
    return 'more strongly'
  }

  if (left < right) {
    return 'less strongly'
  }

  return 'about as strongly'
}

function queueRelationshipContactAction(action: Extract<ActionName, 'text_romance' | 'call_romance' | 'invite_over'>) {
  const relationship = selectedRelationship.value
  if (!relationship || !canQueueRelationshipAction({
    action,
    availability: selectedRelationshipAvailability.value
  })) {
    return
  }

  const intent: Intent = {
    action,
    utility: 1,
    source: 'manual',
    socialTargetId: relationship.toCharacterId,
    socialTargetName: getRelationshipTargetName(relationship)
  }

  simulationStore.enqueueIntent(props.characterId || relationship.fromCharacterId, intent)
}
</script>
