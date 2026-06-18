<template>
  <div class="bg-gf-surface border border-gf-border rounded-lg p-5">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h3 class="text-lg font-medium text-gf-text">{{ space.name }}</h3>
        <p class="mt-1 text-sm text-gf-text-weak">{{ space.description }}</p>
      </div>
    </div>

    <div v-if="space.items && space.items.length > 0" class="mt-4">
      <h4 class="text-sm font-medium text-gf-text-weak mb-2">Items ({{ space.items.length }})</h4>
      <ul class="space-y-2">
        <li
          v-for="(item, itemIndex) in space.items"
          :key="itemIndex"
          class="rounded border px-3 py-2"
          :class="getItemCardClass(item)"
        >
          <div
            v-if="item.id && getActiveUsersForItem(item.id).length"
            class="mb-2 rounded-lg border border-gf-border bg-gf-surface-2 px-2.5 py-2"
          >
            <p class="text-[11px] font-semibold uppercase tracking-wide text-gf-blue">
              In use now
            </p>
            <div class="mt-1 space-y-1">
              <p
                v-for="user in getActiveUsersForItem(item.id)"
                :key="user.id"
                class="text-xs font-medium text-gf-text"
              >
                {{ user.name }}: {{ getCharacterStatus(user.id) }}
              </p>
            </div>
          </div>

          <div class="flex items-start gap-2">
            <span class="mt-1 text-xs text-gf-text-faint">•</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline gap-2">
                <p class="text-sm font-medium text-gf-text">{{ item.name }}</p>
                <span v-if="item.count && item.count > 1" class="text-xs text-gf-text-faint">×{{ item.count }}</span>
              </div>
              <p v-if="item.description" class="mt-0.5 text-xs text-gf-text-faint">{{ item.description }}</p>

              <div v-if="getItemActions(item).length > 0" class="mt-1.5 flex flex-wrap gap-1">
                <span
                  v-for="activity in getItemActions(item)"
                  :key="activity"
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gf-purple/15 text-gf-purple"
                >
                  {{ activity }}
                </span>
              </div>
            </div>
          </div>

          <!-- Slot Visualization -->
          <div v-if="item.maxSimultaneousUsers && item.maxSimultaneousUsers >= 1" class="mt-2 ml-5">
            <div class="grid grid-cols-1'">
              <div
                v-for="slotIndex in item.maxSimultaneousUsers"
                :key="slotIndex"
                class="border-2 rounded p-1 min-h-[28px] flex items-center justify-center"
                :class="item.id && getActiveUsersForItem(item.id)[slotIndex - 1]
                  ? 'border-gf-blue bg-gf-blue/15'
                  : 'border-gf-border bg-gf-surface-2'"
              >
                <span
                  v-if="item.id && getActiveUsersForItem(item.id)[slotIndex - 1]"
                  class="text-[10px] font-medium text-gf-blue truncate"
                >
                  👤 {{ getActiveUsersForItem(item.id)[slotIndex - 1].name }}
                </span>
                <span v-else class="text-[10px] text-gf-text-faint">
                  —
                </span>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Idle Characters Section -->
    <div v-if="idleCharacters.length > 0" class="mt-4">
      <h4 class="text-sm font-medium text-gf-text-weak mb-2">Idle</h4>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="char in idleCharacters"
          :key="char.id"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gf-border bg-gf-surface-2 text-gf-text"
        >
          {{ char.name }}
        </span>
      </div>
    </div>

    <div v-else-if="showEmptyState" class="mt-4 text-center py-4 bg-gf-surface-2 rounded">
      <p class="text-sm text-gf-text-faint">No items in this space</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCharacterStatusText } from '../composables/useCharacterStatus'
import { useSimulationStore } from '../stores/simulation'
import type { ActionName, ItemAffordance } from '../stores/types'

const simulationStore = useSimulationStore()

interface SpaceCardItem {
  id?: string
  name: string
  description?: string
  count?: number
  allowedActivities?: string[]
  affordances?: ItemAffordance[]
  maxSimultaneousUsers?: number | null
}

interface SpaceCardData {
  id?: string
  name: string
  description?: string
  items?: SpaceCardItem[]
}

interface CharacterSummary {
  id: string
  name: string
}

const props = defineProps<{
  space: SpaceCardData
  characters?: CharacterSummary[]
  showEmptyState?: boolean
}>()

// Helper to get active users from Pinia store
function getActiveUsersForItem(itemId: string) {
  return simulationStore.getItemActiveUsers(itemId)
}

function getItemActions(item: SpaceCardItem): ActionName[] {
  if (item.allowedActivities?.length) {
    return item.allowedActivities as ActionName[]
  }

  return (item.affordances || []).map((entry) => entry.action as ActionName)
}

function getCharacterStatus(characterId: string): string {
  return getCharacterStatusText(simulationStore.characterStates[characterId])
}

function getItemCardClass(item: SpaceCardItem): string {
  if (item.id && getActiveUsersForItem(item.id).length) {
    return 'border-gf-blue bg-gf-blue/10'
  }

  return 'border-gf-border bg-gf-surface-2'
}

// Calculate idle characters (in space but not using any items)
const idleCharacters = computed(() => {
  // Get all character IDs currently using items in this space
  const charactersUsingItems = new Set<string>()

  if (props.space.items) {
    props.space.items.forEach(item => {
      const activeUsers = item.id ? getActiveUsersForItem(item.id) : []
      activeUsers.forEach(user => charactersUsingItems.add(user.id))
    })
  }

  // Filter characters who are:
  // 1. Not using items
  // 2. Actually in this space according to simulation store
  return (props.characters || []).filter(char => {
    // Skip if using an item
    if (charactersUsingItems.has(char.id)) {
      return false
    }

    // Verify character is actually in this space
    const charState = simulationStore.characterStates[char.id]
    return !!props.space.id && charState?.location?.spaceId === props.space.id
  })
})
</script>
