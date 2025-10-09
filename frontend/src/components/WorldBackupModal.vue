<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
      <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">{{ mode === 'backup' ? 'Backup World' : 'Restore World' }}</h2>

      <!-- Backup Mode -->
      <div v-if="mode === 'backup'">
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Create an encrypted backup of "{{ worldName }}" to Google Drive. You'll need your password to restore it later.
        </p>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Encryption Password
          </label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter a strong password"
            @keyup.enter="handleBackup"
          />
        </div>

        <div v-if="error" class="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md">
          <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
        </div>

        <div v-if="success" class="mb-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md">
          <p class="text-sm text-green-800 dark:text-green-200">✅ Backup successful!</p>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="close"
            :disabled="isBackingUp"
            class="px-4 py-2 text-gray-700 dark:text-gray-100 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="handleBackup"
            :disabled="isBackingUp || !password"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center gap-2"
          >
            <span v-if="isBackingUp">Backing up...</span>
            <span v-else>Backup to Google Drive</span>
          </button>
        </div>
      </div>

      <!-- Restore Mode -->
      <div v-else-if="mode === 'restore'">
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Restore a world from a Google Drive backup. This will create a new world with all the data from the backup.
        </p>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Backup Filename
          </label>
          <input
            v-model="fileName"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="clockwork-world-[id]-[timestamp].enc"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Decryption Password
          </label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter the password used for encryption"
            @keyup.enter="handleRestore"
          />
        </div>

        <div v-if="error" class="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md">
          <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
        </div>

        <div v-if="success" class="mb-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md">
          <p class="text-sm text-green-800 dark:text-green-200">✅ Restore successful!</p>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="close"
            :disabled="isRestoring"
            class="px-4 py-2 text-gray-700 dark:text-gray-100 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="handleRestore"
            :disabled="isRestoring || !password || !fileName"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center gap-2"
          >
            <span v-if="isRestoring">Restoring...</span>
            <span v-else>Restore from Google Drive</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCloudBackup } from '../composables/useCloudBackup'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  mode: {
    type: String,
    required: true,
    validator: (value) => ['backup', 'restore'].includes(value)
  },
  worldId: {
    type: String,
    default: null
  },
  worldName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'success'])

const password = ref('')
const fileName = ref('')
const error = ref(null)
const success = ref(false)

const { backupWorld, restoreWorld, isBackingUp, isRestoring } = useCloudBackup()

async function handleBackup() {
  if (!props.worldId || !password.value) return

  try {
    error.value = null
    success.value = false

    const backupFileName = await backupWorld(props.worldId, password.value)
    success.value = true
    console.log(`✅ Backup created: ${backupFileName}`)

    setTimeout(() => {
      emit('success', { mode: 'backup', fileName: backupFileName })
      close()
    }, 1500)
  } catch (err) {
    error.value = err.message || 'Backup failed. Please try again.'
    console.error('Backup error:', err)
  }
}

async function handleRestore() {
  if (!password.value || !fileName.value) return

  try {
    error.value = null
    success.value = false

    await restoreWorld(fileName.value, password.value)
    success.value = true
    console.log('✅ World restored successfully')

    setTimeout(() => {
      emit('success', { mode: 'restore' })
      close()
    }, 1500)
  } catch (err) {
    error.value = err.message || 'Restore failed. Please check your password and filename.'
    console.error('Restore error:', err)
  }
}

function close() {
  password.value = ''
  fileName.value = ''
  error.value = null
  success.value = false
  emit('close')
}
</script>
