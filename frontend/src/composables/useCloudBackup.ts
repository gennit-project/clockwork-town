import { ref } from 'vue'
import { CloudSync, GoogleDriveProvider } from '../lib/cloudSync'
import { client, mutations } from '../graphql'

interface ExportWorldResult {
  exportWorld: unknown
}

interface ImportWorldResult {
  importWorld: {
    worldId: string
  }
}

interface BackupFile {
  id: string
  name: string
  createdTime?: string
}

/**
 * Composable for managing cloud backups of worlds
 * Provides backup and restore functionality with Google Drive integration
 */
export function useCloudBackup() {
  const isAuthenticating = ref(false)
  const isBackingUp = ref(false)
  const isRestoring = ref(false)
  const isLoadingBackups = ref(false)
  const error = ref<string | null>(null)
  const availableBackups = ref<BackupFile[]>([])

  // Initialize Google Drive provider
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const provider = new GoogleDriveProvider(clientId)

  /**
   * Export world data (structure + simulation state)
   * @param {string} worldId - World ID to export
   * @returns {Promise<object>} World data with structure and simulation state
   */
  async function exportWorldData(worldId: string): Promise<unknown> {
    try {
      // Call backend GraphQL mutation to export world
      const result = await client.request<ExportWorldResult>(mutations.exportWorld, { worldId })
      return result.exportWorld
    } catch (err: unknown) {
      console.error('Failed to export world:', err)
      const message = err instanceof Error ? err.message : 'Unknown export error'
      throw new Error(`Export failed: ${message}`)
    }
  }

  /**
   * Import world data (structure + simulation state)
   * @param {object} worldData - World data to import
   * @returns {Promise<string>} New world ID
   */
  async function importWorldData(worldData: unknown): Promise<string> {
    try {
      // Call backend GraphQL mutation to import world
      const result = await client.request<ImportWorldResult>(mutations.importWorld, { data: worldData })
      return result.importWorld.worldId
    } catch (err: unknown) {
      console.error('Failed to import world:', err)
      const message = err instanceof Error ? err.message : 'Unknown import error'
      throw new Error(`Import failed: ${message}`)
    }
  }

  // Create CloudSync instance with export/import functions
  const cloudSync = new CloudSync(provider, exportWorldData, importWorldData)

  /**
   * Backup a world to Google Drive
   * @param {string} worldId - World ID to backup
   * @param {string} password - Encryption password
   * @returns {Promise<string>} Filename of the backup
   */
  async function backupWorld(worldId: string, password: string): Promise<string> {
    if (!worldId || !password) {
      throw new Error('World ID and password are required')
    }

    try {
      error.value = null
      isBackingUp.value = true

      // Authenticate if needed
      if (!provider.isAuthenticated()) {
        isAuthenticating.value = true
        await provider.authenticate()
        isAuthenticating.value = false
      }

      // Perform backup
      const fileName = await cloudSync.backup(worldId, password)
      console.log(`✅ Backup created: ${fileName}`)
      return fileName
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Backup failed'
      console.error('Backup failed:', err)
      throw err
    } finally {
      isBackingUp.value = false
      isAuthenticating.value = false
    }
  }

  /**
   * Restore a world from Google Drive
   * @param {string} fileName - Backup filename to restore
   * @param {string} password - Decryption password
   * @returns {Promise<string>} New world ID
   */
  async function restoreWorld(fileName: string, password: string): Promise<boolean> {
    if (!fileName || !password) {
      throw new Error('Filename and password are required')
    }

    try {
      error.value = null
      isRestoring.value = true

      // Authenticate if needed
      if (!provider.isAuthenticated()) {
        isAuthenticating.value = true
        await provider.authenticate()
        isAuthenticating.value = false
      }

      // Perform restore
      const success = await cloudSync.restore(fileName, password)
      if (!success) {
        throw new Error('Restore failed - backup not found or wrong password')
      }

      console.log('✅ World restored successfully')
      return success
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Restore failed'
      console.error('Restore failed:', err)
      throw err
    } finally {
      isRestoring.value = false
      isAuthenticating.value = false
    }
  }

  /**
   * List all available backups for a world
   * @param {string} worldId - World ID to search for
   * @returns {Promise<Array>} List of backup files
   */
  async function listBackupsForWorld(worldId: string): Promise<BackupFile[]> {
    try {
      error.value = null
      isLoadingBackups.value = true

      // Authenticate if needed
      if (!provider.isAuthenticated()) {
        isAuthenticating.value = true
        await provider.authenticate()
        isAuthenticating.value = false
      }

      // Get list of backups
      const backups = await cloudSync.listBackups(worldId)
      availableBackups.value = backups
      return backups
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to list backups'
      console.error('Failed to list backups:', err)
      throw err
    } finally {
      isLoadingBackups.value = false
      isAuthenticating.value = false
    }
  }

  return {
    // State
    isAuthenticating,
    isBackingUp,
    isRestoring,
    isLoadingBackups,
    error,
    availableBackups,

    // Methods
    backupWorld,
    restoreWorld,
    listBackupsForWorld
  }
}
