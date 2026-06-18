<template>
  <Modal :is-open="isOpen" :title="title" @close="$emit('close')">
    <p class="mb-4 text-gf-text-weak">{{ message }}</p>
    <p v-if="warningMessage" class="mb-4 text-sm text-gf-red">
      {{ warningMessage }}
    </p>
    <div class="flex justify-end space-x-3">
      <button
        type="button"
        @click="$emit('close')"
        :disabled="isDeleting"
        class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        @click="$emit('confirm')"
        :disabled="isDeleting"
        class="rounded border border-gf-border bg-gf-red/15 px-3 py-1.5 text-sm text-gf-red hover:bg-gf-red/25 disabled:opacity-50"
      >
        {{ isDeleting ? 'Deleting...' : 'Delete' }}
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
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
