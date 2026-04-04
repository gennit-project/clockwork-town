<template>
  <div class="bg-yellow-50 dark:bg-yellow-900 border-2 border-yellow-400 rounded-lg p-4 mb-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-sm font-bold text-yellow-900 dark:text-yellow-100 flex items-center">
        <span class="mr-2">🔧</span>
        Debug: Test Action Effects
      </h3>
      <button
        @click="$emit('close')"
        class="text-yellow-700 hover:text-yellow-900 dark:text-yellow-300"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Character Selector -->
    <div class="mb-3">
      <label class="block text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-1">
        Select Character:
      </label>
      <select
        v-model="selectedCharacterId"
        class="w-full px-2 py-1 text-sm border border-yellow-300 rounded bg-white dark:bg-gray-800 dark:text-white"
      >
        <option value="">-- Choose a character --</option>
        <option v-for="char in characters" :key="char.id" :value="char.id">
          {{ char.name }}
        </option>
      </select>
    </div>

    <!-- Action Buttons -->
    <div v-if="selectedCharacterId" class="space-y-2">
      <p class="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
        Click a button to apply that action's effects:
      </p>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <!-- Physical Needs -->
        <button
          @click="testAction('eat')"
          class="px-3 py-2 text-xs font-medium rounded bg-green-500 hover:bg-green-600 text-white"
          title="Food +0.35, Cooldown 6 ticks"
        >
          🍎 Eat
        </button>
        <button
          @click="testAction('sleep')"
          class="px-3 py-2 text-xs font-medium rounded bg-blue-500 hover:bg-blue-600 text-white"
          title="Sleep +0.50, Cooldown 12 ticks"
        >
          😴 Sleep
        </button>
        <button
          @click="testAction('medicate')"
          class="px-3 py-2 text-xs font-medium rounded bg-red-500 hover:bg-red-600 text-white"
          title="Health +0.40, Cooldown 12 ticks"
        >
          💊 Medicate
        </button>

        <!-- Emotional Needs -->
        <button
          @click="testAction('chat_friend')"
          class="px-3 py-2 text-xs font-medium rounded bg-pink-500 hover:bg-pink-600 text-white"
          title="Friends +0.25, Cooldown 9 ticks"
        >
          💬 Chat Friend
        </button>
        <button
          @click="testAction('call_mom')"
          class="px-3 py-2 text-xs font-medium rounded bg-purple-500 hover:bg-purple-600 text-white"
          title="Family +0.30, Cooldown 12 ticks"
        >
          📞 Call Mom
        </button>
        <button
          @click="testAction('date')"
          class="px-3 py-2 text-xs font-medium rounded bg-rose-500 hover:bg-rose-600 text-white"
          title="Romance +0.35, Friends +0.10, Cooldown 18 ticks"
        >
          💕 Date
        </button>

        <!-- Fulfillment -->
        <button
          @click="testAction('read')"
          class="px-3 py-2 text-xs font-medium rounded bg-indigo-500 hover:bg-indigo-600 text-white"
          title="Fulfillment +0.20, Friends -0.05, Cooldown 9 ticks"
        >
          📚 Read
        </button>
        <button
          @click="testAction('write')"
          class="px-3 py-2 text-xs font-medium rounded bg-violet-500 hover:bg-violet-600 text-white"
          title="Fulfillment +0.25, Friends -0.05, Cooldown 12 ticks"
        >
          ✍️ Write
        </button>
        <button
          @click="testAction('view_art')"
          class="px-3 py-2 text-xs font-medium rounded bg-cyan-500 hover:bg-cyan-600 text-white"
          title="Fulfillment +0.20, Friends +0.05, Cooldown 6 ticks"
        >
          🎨 View Art
        </button>
        <button
          @click="testAction('volunteer')"
          class="px-3 py-2 text-xs font-medium rounded bg-teal-500 hover:bg-teal-600 text-white"
          title="Fulfillment +0.30, Family +0.10, Cooldown 18 ticks"
        >
          🤝 Volunteer
        </button>
      </div>

      <div class="mt-3 pt-3 border-t border-yellow-300">
        <p class="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-2">
          🔍 Test Item Finding (Same Space + Lot + Region):
        </p>
        <div class="grid grid-cols-2 gap-2">
          <button
            @click="testFindItems('eat')"
            class="px-2 py-1 text-xs font-medium rounded bg-gray-600 hover:bg-gray-700 text-white"
          >
            Find 'eat' items
          </button>
          <button
            @click="testFindItems('sleep')"
            class="px-2 py-1 text-xs font-medium rounded bg-gray-600 hover:bg-gray-700 text-white"
          >
            Find 'sleep' items
          </button>
          <button
            @click="testFindItems('read')"
            class="px-2 py-1 text-xs font-medium rounded bg-gray-600 hover:bg-gray-700 text-white"
          >
            Find 'read' items
          </button>
          <button
            @click="testFindItems('medicate')"
            class="px-2 py-1 text-xs font-medium rounded bg-gray-600 hover:bg-gray-700 text-white"
          >
            Find 'medicate' items
          </button>
        </div>
      </div>

      <div class="mt-3 pt-3 border-t border-yellow-300">
        <p class="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-2">
          ⚖️ Test Utility Calculation:
        </p>
        <button
          @click="testUtilityCalculation"
          class="w-full px-3 py-2 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Calculate Utilities for All Actions
        </button>
      </div>

      <div class="mt-3 pt-3 border-t border-yellow-300">
        <p class="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-2">
          🎯 Test Decision Making:
        </p>
        <button
          @click="testSelectBestIntent"
          class="w-full px-3 py-2 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Select Best Intent (Full Decision)
        </button>
      </div>

      <div class="mt-3 pt-3 border-t border-yellow-300">
        <p class="text-xs text-yellow-800 dark:text-yellow-200">
          💡 <strong>Tip:</strong> Watch the character card needs update and check the activity log panel.
          Effects are logged in the browser console.
        </p>
      </div>
    </div>

    <div v-else class="text-xs text-yellow-700 dark:text-yellow-300 text-center py-4">
      Please select a character above to test actions
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSimulationStore } from '../stores/simulation'
import { findItemsWithAffordance } from '../stores/utils/pathfinding'
import { calculateUtility, selectBestIntent } from '../stores/utils/decisionMaking'
import type { ActionName } from '../stores/types'

interface CharacterSummary {
  id: string
  name: string
}

const props = defineProps<{
  characters: CharacterSummary[]
}>()

defineEmits<{
  close: []
}>()

const simulationStore = useSimulationStore()
const selectedCharacterId = ref('')

const testAction = (action: ActionName) => {
  if (!selectedCharacterId.value) {
    alert('Please select a character first')
    return
  }

  simulationStore.applyActionEffects(selectedCharacterId.value, action, `Debug test: ${action}`)
}

const testFindItems = (action: ActionName) => {
  if (!selectedCharacterId.value) {
    alert('Please select a character first')
    return
  }

  const charState = simulationStore.characterStates[selectedCharacterId.value]
  if (!charState) {
    return
  }

  const items = findItemsWithAffordance(selectedCharacterId.value, action, charState.location, simulationStore.worldData, {})
  const cost0 = items.filter(i => i.travelCost === 0)
  const cost1 = items.filter(i => i.travelCost === 1)
  const cost2 = items.filter(i => i.travelCost === 2)

  console.log(`\n🔍 Test findItemsWithAffordance('${selectedCharacterId.value}', '${action}'):`)
  console.log(`Found ${items.length} total items:`)

  if (cost0.length > 0) {
    console.log(`  Same space (cost 0):`)
    cost0.forEach((item) => {
      console.log(`    - ${item.itemName} in ${item.spaceName}`)
    })
  }

  if (cost1.length > 0) {
    console.log(`  Same lot (cost 1):`)
    cost1.forEach((item) => {
      console.log(`    - ${item.itemName} in ${item.spaceName} (${item.lotName})`)
    })
  }

  if (cost2.length > 0) {
    console.log(`  Same region (cost 2):`)
    cost2.forEach((item) => {
      console.log(`    - ${item.itemName} in ${item.spaceName} (${item.lotName})`)
    })
  }

  console.log('Full results:', items)

  if (items.length === 0) {
    alert(`No items with '${action}' affordance found.\n\nCheck console for details.`)
  } else {
    alert(`Found ${items.length} item(s) with '${action}' affordance:\n• Same space (cost 0): ${cost0.length}\n• Same lot (cost 1): ${cost1.length}\n• Same region (cost 2): ${cost2.length}\n\nCheck console for details.`)
  }
}

const testUtilityCalculation = () => {
  if (!selectedCharacterId.value) {
    alert('Please select a character first')
    return
  }

  console.log(`\n⚖️  Test Utility Calculation for ${selectedCharacterId.value}`)
  console.log('=' .repeat(60))

  const charState = simulationStore.characterStates[selectedCharacterId.value]
  console.log('Current Needs:')
  Object.entries(charState.needs).forEach(([need, value]) => {
    console.log(`  ${need}: ${value.toFixed(2)} (deficit: ${(1 - value).toFixed(2)})`)
  })
  console.log('')

  const actions: ActionName[] = ['eat', 'sleep', 'medicate', 'chat_friend', 'call_mom', 'date', 'read', 'write', 'view_art', 'volunteer']
  const utilities: Array<{ action: ActionName; utility: string; item: string; space: string; travelCost: number }> = []

  for (const action of actions) {
    const items = findItemsWithAffordance(selectedCharacterId.value, action, charState.location, simulationStore.worldData, {})

    if (items.length > 0) {
      // Calculate utility for the best (closest) item
      const bestItem = items[0] // Already sorted by travel cost
      const utility = calculateUtility(selectedCharacterId.value, action, charState.needs, bestItem)

      utilities.push({
        action,
        utility: utility.toFixed(2),
        item: bestItem.itemName,
        space: bestItem.spaceName,
        travelCost: bestItem.travelCost
      })

      console.log(`${action}:`)
      console.log(`  Best item: ${bestItem.itemName} in ${bestItem.spaceName} (cost ${bestItem.travelCost})`)
      console.log(`  Utility: ${utility.toFixed(2)}`)
    }
  }

  // Sort by utility (highest first)
  utilities.sort((a, b) => parseFloat(b.utility) - parseFloat(a.utility))

  console.log('\n📊 Utilities Ranked (highest to lowest):')
  utilities.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.action}: ${u.utility} (${u.item} in ${u.space}, cost ${u.travelCost})`)
  })

  if (utilities.length > 0) {
    const best = utilities[0]
    alert(`Best action: ${best.action}\nUtility: ${best.utility}\nItem: ${best.item}\nLocation: ${best.space}\nTravel cost: ${best.travelCost}\n\nCheck console for full details.`)
  } else {
    alert('No available actions found.\n\nCheck console for details.')
  }
}

const testSelectBestIntent = () => {
  if (!selectedCharacterId.value) {
    alert('Please select a character first')
    return
  }

  console.log(`\n🎯 Test selectBestIntent for ${selectedCharacterId.value}`)
  console.log('=' .repeat(60))

  const charState = simulationStore.characterStates[selectedCharacterId.value]
  console.log('Current Needs:')
  Object.entries(charState.needs).forEach(([need, value]) => {
    console.log(`  ${need}: ${value.toFixed(2)} (deficit: ${(1 - value).toFixed(2)})`)
  })
  console.log('\nCurrent Cooldowns:')
  Object.entries(charState.cooldowns).forEach(([action, ticks]) => {
    if (ticks > 0) {
      console.log(`  ${action}: ${ticks} ticks remaining`)
    }
  })
  console.log('')

  // Call selectBestIntent
  const intent = selectBestIntent(selectedCharacterId.value, charState, simulationStore.worldData, {})

  console.log('\n🏆 Selected Intent:')
  console.log(intent)

  // Show alert with result
  if (intent.action === 'idle') {
    alert(`Character will: IDLE\n\nNo satisfying actions available.\n\nCheck console for full decision log.`)
  } else {
    alert(`Character will: ${intent.action.toUpperCase()}\n\nItem: ${intent.itemName}\nLocation: ${intent.targetSpaceName} (${intent.targetLotName})\nTravel cost: ${intent.travelCost}\nUtility: ${intent.utility.toFixed(2)}\n\nCheck console for full decision log.`)
  }
}
</script>
