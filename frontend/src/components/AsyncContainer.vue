<template>
  <div v-if="loading" class="text-center py-12">
    <slot name="loading">
      <p class="text-gray-500 dark:text-gray-300">Loading...</p>
    </slot>
  </div>

  <div v-else-if="error" class="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
    <slot name="error" :error="error">
      <p class="text-red-800 dark:text-red-200">Error: {{ error }}</p>
    </slot>
  </div>

  <div v-else-if="isEmpty" class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
    <slot name="empty">
      <p class="text-gray-500 dark:text-gray-300">{{ emptyMessage }}</p>
    </slot>
  </div>

  <div v-else>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  isEmpty: {
    type: Boolean,
    default: false
  },
  emptyMessage: {
    type: String,
    default: 'No data available'
  }
})
</script>
