<template>
  <div v-if="loading" class="text-center py-12">
    <slot name="loading">
      <p class="text-gf-text-faint">Loading...</p>
    </slot>
  </div>

  <div v-else-if="error" class="border border-gf-red/40 bg-gf-red/10 rounded-md p-4">
    <slot name="error" :error="error">
      <p class="text-gf-red">Error: {{ error }}</p>
    </slot>
  </div>

  <div v-else-if="isEmpty" class="text-center py-12 bg-gf-surface border border-gf-border rounded-lg">
    <slot name="empty">
      <p class="text-gf-text-faint">{{ emptyMessage }}</p>
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
