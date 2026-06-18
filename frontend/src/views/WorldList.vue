<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-xl font-semibold text-gf-text">Worlds</h1>
      <div class="flex gap-3">
        <button
          @click="openRestoreModal"
          class="rounded border border-gf-border bg-gf-green/15 px-3 py-1.5 text-sm font-medium text-gf-green hover:bg-gf-green/25"
        >
          Restore from Google Drive
        </button>
        <button
          @click="showCreateModal = true"
          class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25"
        >
          Create World
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gf-text-faint">Loading...</p>
    </div>

    <div v-else-if="error" class="border border-gf-red/40 bg-gf-red/10 rounded-md p-4">
      <p class="text-gf-red">Error: {{ error }}</p>
    </div>

    <div v-else-if="worlds.length === 0" class="text-center py-12 bg-gf-surface border border-gf-border rounded-lg">
      <p class="text-gf-text-faint mb-4">No worlds yet. Create your first world to get started!</p>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="world in worlds"
        :key="world.id"
        class="bg-gf-surface border border-gf-border p-6 rounded-lg transition-colors cursor-pointer"
        @click="viewWorld(world.id)"
      >
        <div class="flex justify-between items-start mb-2">
          <h2 class="text-xl font-semibold text-gf-text">{{ world.name }}</h2>
          <div class="flex space-x-2" @click.stop>
            <button
              @click="openBackupModal(world)"
              class="text-gf-green hover:opacity-80"
              title="Backup to Google Drive"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>
            <button
              @click="editWorld(world)"
              class="text-gf-blue hover:underline"
              title="Edit"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="confirmDelete(world)"
              class="text-gf-red hover:opacity-80"
              title="Delete"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <p class="text-sm text-gf-text-faint mb-4">
          Created {{ new Date(world.createdAt).toLocaleDateString() }}
        </p>
        <div class="text-gf-blue hover:underline font-medium">
          View Regions →
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingWorld" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-gf-surface border border-gf-border rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gf-text">
          {{ editingWorld ? 'Edit World' : 'Create World' }}
        </h2>
        <form @submit.prevent="saveWorld">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gf-text-weak mb-2">
              World Name
            </label>
            <input
              ref="worldNameInput"
              v-model="formData.name"
              type="text"
              required
              class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
              placeholder="Enter world name"
            />
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeModal"
              class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="rounded border border-gf-border bg-gf-blue/15 px-3 py-1.5 text-sm font-medium text-gf-blue hover:bg-gf-blue/25 disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deletingWorld" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-gf-surface border border-gf-border rounded-lg p-6 max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gf-text">Delete World</h2>
        <p class="mb-4 text-gf-text-weak">Are you sure you want to delete "{{ deletingWorld.name }}"? This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="deletingWorld = null"
            class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
          >
            Cancel
          </button>
          <button
            @click="deleteWorld"
            :disabled="saving"
            class="rounded border border-gf-border bg-gf-red/15 px-3 py-1.5 text-sm text-gf-red hover:bg-gf-red/25 disabled:opacity-50"
          >
            {{ saving ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Backup/Restore Modal -->
    <WorldBackupModal
      :is-open="showBackupModal"
      :mode="backupMode"
      :world-id="selectedWorld?.id"
      :world-name="selectedWorld?.name"
      @close="closeBackupModal"
      @success="handleBackupSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { client, queries, mutations } from '../graphql'
import WorldBackupModal from '../components/WorldBackupModal.vue'

interface WorldSummary {
  id: string
  name: string
  createdAt: string
}

interface GetWorldsResult {
  worlds?: WorldSummary[]
}

interface WorldMutationResult {
  createWorld?: WorldSummary
  updateWorld?: WorldSummary
}

const router = useRouter()
const worlds = ref<WorldSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const showCreateModal = ref(false)
const editingWorld = ref<WorldSummary | null>(null)
const deletingWorld = ref<WorldSummary | null>(null)
const saving = ref(false)
const formData = ref({ name: '' })
const worldNameInput = ref<HTMLInputElement | null>(null)

// Backup/Restore state
const showBackupModal = ref(false)
const backupMode = ref<'backup' | 'restore'>('backup')
const selectedWorld = ref<WorldSummary | null>(null)

const loadWorlds = async () => {
  try {
    loading.value = true
    error.value = null
    const data = await client.request<GetWorldsResult>(queries.getWorlds)
    worlds.value = data.worlds || []
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

const editWorld = (world: WorldSummary) => {
  editingWorld.value = world
  formData.value = { name: world.name }
}

const confirmDelete = (world: WorldSummary) => {
  deletingWorld.value = world
}

const closeModal = () => {
  showCreateModal.value = false
  editingWorld.value = null
  formData.value = { name: '' }
}

const saveWorld = async () => {
  try {
    saving.value = true
    if (editingWorld.value) {
      await client.request<WorldMutationResult>(mutations.updateWorld, {
        id: editingWorld.value.id,
        name: formData.value.name
      })
    } else {
      await client.request<WorldMutationResult>(mutations.createWorld, {
        input: {
          id: crypto.randomUUID(),
          name: formData.value.name
        }
      })
    }
    closeModal()
    await loadWorlds()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

const deleteWorld = async () => {
  try {
    saving.value = true
    if (!deletingWorld.value) {
      return
    }

    await client.request(mutations.deleteWorld, { id: deletingWorld.value.id })
    deletingWorld.value = null
    await loadWorlds()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

const viewWorld = (worldId: string) => {
  router.push(`/world/${worldId}`)
}

// Backup/Restore functions
const openBackupModal = (world: WorldSummary) => {
  selectedWorld.value = world
  backupMode.value = 'backup'
  showBackupModal.value = true
}

const openRestoreModal = () => {
  selectedWorld.value = null
  backupMode.value = 'restore'
  showBackupModal.value = true
}

const closeBackupModal = () => {
  showBackupModal.value = false
  selectedWorld.value = null
}

const handleBackupSuccess = async ({ mode }: { mode: 'backup' | 'restore' }) => {
  console.log(`${mode} completed successfully`)
  // Reload worlds after restore to show the new world
  if (mode === 'restore') {
    await loadWorlds()
  }
}

watch(
  () => showCreateModal.value || !!editingWorld.value,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      worldNameInput.value?.focus()
    }
  }
)

onMounted(loadWorlds)
</script>
