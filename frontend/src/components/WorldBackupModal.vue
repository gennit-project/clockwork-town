<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-gf-surface border border-gf-border rounded-lg p-6 max-w-md w-full">
      <h2 class="text-2xl font-bold mb-4 text-gf-text">{{ mode === 'backup' ? 'Backup World' : 'Restore World' }}</h2>

      <!-- Backup Mode -->
      <div v-if="mode === 'backup'">
        <p class="text-sm text-gf-text-weak mb-4">
          Create an encrypted backup of "{{ worldName }}" to Google Drive. You'll need your password to restore it later.
        </p>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gf-text-weak mb-2">
            Encryption Password
          </label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            placeholder="Enter a strong password"
            @keyup.enter="handleBackup"
          />
        </div>

        <div v-if="error" class="mb-4 p-3 border border-gf-red/40 bg-gf-red/10 rounded-md">
          <p class="text-sm text-gf-red">{{ error }}</p>
        </div>

        <div v-if="success" class="mb-4 p-3 border border-gf-green/40 bg-gf-green/10 rounded-md">
          <p class="text-sm text-gf-green">✅ Backup successful!</p>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="close"
            :disabled="isBackingUp"
            class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="handleBackup"
            :disabled="isBackingUp || !password"
            class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25 disabled:opacity-50 flex items-center gap-2"
          >
            <span v-if="isBackingUp">Backing up...</span>
            <span v-else>Backup to Google Drive</span>
          </button>
        </div>
      </div>

      <!-- Restore Mode -->
      <div v-else-if="mode === 'restore'">
        <p class="text-sm text-gf-text-weak mb-4">
          Restore a world from a Google Drive backup. This will create a new world with all the data from the backup.
        </p>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gf-text-weak mb-2">
            Backup Filename
          </label>
          <input
            v-model="fileName"
            type="text"
            required
            class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            placeholder="clockwork-world-[id]-[timestamp].enc"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gf-text-weak mb-2">
            Decryption Password
          </label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            placeholder="Enter the password used for encryption"
            @keyup.enter="handleRestore"
          />
        </div>

        <div v-if="error" class="mb-4 p-3 border border-gf-red/40 bg-gf-red/10 rounded-md">
          <p class="text-sm text-gf-red">{{ error }}</p>
        </div>

        <div v-if="success" class="mb-4 p-3 border border-gf-green/40 bg-gf-green/10 rounded-md">
          <p class="text-sm text-gf-green">✅ Restore successful!</p>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="close"
            :disabled="isRestoring"
            class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="handleRestore"
            :disabled="isRestoring || !password || !fileName"
            class="rounded border border-gf-border bg-gf-green/15 px-3 py-1.5 text-sm font-medium text-gf-green hover:bg-gf-green/25 disabled:opacity-50 flex items-center gap-2"
          >
            <span v-if="isRestoring">Restoring...</span>
            <span v-else>Restore from Google Drive</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCloudBackup } from '../composables/useCloudBackup'

const props = defineProps<{
  isOpen: boolean
  mode: 'backup' | 'restore'
  worldId?: string | null
  worldName?: string
}>()

const emit = defineEmits<{
  close: []
  success: [payload: { mode: 'backup' | 'restore'; fileName?: string }]
}>()

const password = ref('')
const fileName = ref('')
const error = ref<string | null>(null)
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
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Backup failed. Please try again.'
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
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Restore failed. Please check your password and filename.'
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
