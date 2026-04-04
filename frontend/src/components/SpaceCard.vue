<template>
  <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-5">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ space.name }}</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ space.description }}</p>
      </div>
    </div>

    <div v-if="space.items && space.items.length > 0" class="mt-4">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Items ({{ space.items.length }})</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="(item, itemIndex) in space.items"
          :key="itemIndex"
          class="bg-gray-50 dark:bg-gray-900 rounded p-3"
        >
          <div class="flex items-baseline gap-2">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ item.name }}</p>
            <span v-if="item.count && item.count > 1" class="text-xs text-gray-500 dark:text-gray-400">×{{ item.count }}</span>
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-300">{{ item.description }}</p>

          <!-- Slot Visualization -->
          <div v-if="item.maxSimultaneousUsers && item.maxSimultaneousUsers >= 1" class="mt-2">
            <div class="grid grid-cols-1'">
              <div
                v-for="slotIndex in item.maxSimultaneousUsers"
                :key="slotIndex"
                class="border-2 rounded p-1 min-h-[28px] flex items-center justify-center"
                :class="getActiveUsersForItem(item.id)[slotIndex - 1]
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950 dark:border-blue-600'
                  : 'border-gray-300 bg-gray-100 dark:bg-gray-700 dark:border-gray-600'"
              >
                <span
                  v-if="getActiveUsersForItem(item.id)[slotIndex - 1]"
                  class="text-[10px] font-medium text-blue-800 dark:text-blue-200 truncate"
                >
                  👤 {{ getActiveUsersForItem(item.id)[slotIndex - 1].name }}
                </span>
                <span v-else class="text-[10px] text-gray-400 dark:text-gray-500">
                  —
                </span>
              </div>
            </div>
          </div>

          <!-- Affordances -->
          <div v-if="getItemActions(item).length > 0" class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="activity in getItemActions(item)"
              :key="activity"
              class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            >
              {{ activity }}
            </span>
          </div>
          <div v-else class="mt-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-200 text-blue-600 dark:bg-blue-700 dark:text-blue-400">
              no actions
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Idle Characters Section -->
    <div v-if="idleCharacters.length > 0" class="mt-4">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Idle</h4>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="char in idleCharacters"
          :key="char.id"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border-2 border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-200"
        >
          {{ char.name }}
        </span>
      </div>
    </div>

    <div v-else-if="showEmptyState" class="mt-4 text-center py-4 bg-gray-50 dark:bg-gray-900 rounded">
      <p class="text-sm text-gray-400">No items in this space</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSimulationStore } from '../stores/simulation'

const simulationStore = useSimulationStore()

const props = defineProps({
  space: {
    type: Object,
    required: true
  },
  characters: {
    type: Array,
    default: () => []
  },
  showEmptyState: {
    type: Boolean,
    default: false
  }
})

// Helper to get active users from Pinia store
function getActiveUsersForItem(itemId) {
  return simulationStore.getItemActiveUsers(itemId)
}

function getItemActions(item) {
  if (item.allowedActivities?.length) {
    return item.allowedActivities
  }

  return (item.affordances || []).map((entry) => entry.action)
}

// Calculate idle characters (in space but not using any items)
const idleCharacters = computed(() => {
  // Get all character IDs currently using items in this space
  const charactersUsingItems = new Set()

  if (props.space.items) {
    props.space.items.forEach(item => {
      const activeUsers = getActiveUsersForItem(item.id)
      activeUsers.forEach(user => charactersUsingItems.add(user.id))
    })
  }

  // Filter characters who are:
  // 1. Not using items
  // 2. Actually in this space according to simulation store
  return props.characters.filter(char => {
    // Skip if using an item
    if (charactersUsingItems.has(char.id)) {
      return false
    }

    // Verify character is actually in this space
    const charState = simulationStore.characterStates[char.id]
    return charState?.location?.spaceId === props.space.id
  })
})
</script>
