<template>
  <div class="bg-white shadow rounded-lg p-5">
    <h3 class="text-lg font-medium text-gray-900">{{ space.name }}</h3>
    <p class="mt-1 text-sm text-gray-600">{{ space.description }}</p>

    <div v-if="space.items && space.items.length > 0" class="mt-4">
      <h4 class="text-sm font-medium text-gray-700 mb-2">Items ({{ space.items.length }})</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="(item, itemIndex) in space.items"
          :key="itemIndex"
          class="bg-gray-50 rounded p-3"
        >
          <p class="text-sm font-medium text-gray-900">{{ item.name }}</p>
          <p class="mt-1 text-xs text-gray-500">{{ item.description }}</p>
        </div>
      </div>
    </div>

    <div v-else-if="showEmptyState" class="mt-4 text-center py-4 bg-gray-50 rounded">
      <p class="text-sm text-gray-400">No items in this space</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  space: {
    type: Object,
    required: true
  },
  showEmptyState: {
    type: Boolean,
    default: false
  }
})
</script>
