<template>
  <button
    @click="$emit('select')"
    class="w-full text-left p-3 rounded transition-colors border border-gray-200 dark:border-gray-600 mb-2"
    :class="[
      hoverClass,
      isActive ? activeClass : ''
    ]"
  >
    <p class="font-medium text-gray-900 dark:text-gray-100">
      {{ icon }} {{ entity.name }}
    </p>
    <p class="text-xs text-gray-600 dark:text-gray-300">Age: {{ entity.age }}</p>
    <p v-if="showTraits && entity.traits && entity.traits.length > 0" class="text-xs text-gray-500 dark:text-gray-300">
      {{ entity.traits.join(', ') }}
    </p>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entity: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    required: true,
    validator: (value) => ['character', 'animal'].includes(value)
  },
  isActive: {
    type: Boolean,
    default: false
  },
  showTraits: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select'])

const icon = computed(() => {
  return props.type === 'animal' ? '🐾' : '👤'
})

const hoverClass = computed(() => {
  return props.type === 'animal' ? 'hover:bg-amber-50 dark:hover:bg-amber-900' : 'hover:bg-blue-50 dark:hover:bg-blue-900'
})

const activeClass = computed(() => {
  return props.type === 'animal' ? 'bg-amber-100 dark:bg-amber-800 border-amber-400' : 'bg-blue-100 dark:bg-blue-800 border-blue-400'
})
</script>
