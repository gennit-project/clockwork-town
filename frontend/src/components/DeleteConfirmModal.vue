<template>
  <Modal :is-open="isOpen" :title="title" @close="$emit('close')">
    <p class="mb-4 text-gray-700 dark:text-gray-300">{{ message }}</p>
    <p v-if="warningMessage" class="mb-4 text-sm text-red-600 dark:text-red-400">
      {{ warningMessage }}
    </p>
    <div class="flex justify-end space-x-3">
      <button
        type="button"
        @click="$emit('close')"
        :disabled="isDeleting"
        class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        @click="$emit('confirm')"
        :disabled="isDeleting"
        class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
      >
        {{ isDeleting ? 'Deleting...' : 'Delete' }}
      </button>
    </div>
  </Modal>
</template>

<script setup>
import Modal from './Modal.vue'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Confirm Delete'
  },
  message: {
    type: String,
    required: true
  },
  warningMessage: {
    type: String,
    default: null
  },
  isDeleting: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close', 'confirm'])
</script>
