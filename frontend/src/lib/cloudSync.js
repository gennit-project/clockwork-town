import { Encryption } from './encryption'

/**
 * Google Drive cloud provider implementation
 * Uses Google Identity Services (GIS) - new recommended approach
 */
export class GoogleDriveProvider {
  constructor(clientId, _apiKey) {
    this.name = 'Google Drive'
    this.accessToken = null
    this.CLIENT_ID = clientId
    this.SCOPES = 'https://www.googleapis.com/auth/drive.file'
    this.tokenClient = null
  }

  async authenticate() {
    return new Promise((resolve, reject) => {
      // Load Google Identity Services library
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => {
        try {
          // Google Identity Services global
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            callback: (response) => {
              if (response.error) {
                console.error('Auth error:', response)
                reject(new Error(response.error))
                return
              }

              this.accessToken = response.access_token
              console.log('✅ Google Drive authenticated successfully')
              resolve()
            },
          })

          // Request access token
          this.tokenClient.requestAccessToken({ prompt: 'consent' })
        } catch (error) {
          console.error('Authentication error:', error)
          reject(error)
        }
      }
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }

  async upload(fileName, data) {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    // Check if file exists
    const existingFileId = await this.findFile(fileName)

    const metadata = {
      name: fileName,
      mimeType: 'application/octet-stream'
    }

    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([data], { type: 'application/octet-stream' }))

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

    const method = existingFileId ? 'PATCH' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: form,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    console.log('File uploaded to Google Drive successfully')
  }

  async download(fileName) {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    const fileId = await this.findFile(fileName)
    if (!fileId) {
      return null
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`)
    }

    return await response.text()
  }

  async findFile(fileName) {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.files?.[0]?.id || null
  }

  isAuthenticated() {
    return this.accessToken !== null
  }
}

/**
 * Cloud sync manager - handles backup and restore
 * Adapted for Clockwork Town (uses GraphQL instead of direct database)
 */
export class CloudSync {
  constructor(provider, exportFn, importFn) {
    this.provider = provider
    this.exportFn = exportFn // Function to export world data
    this.importFn = importFn // Function to import world data
  }

  /**
   * Backup world to cloud storage (encrypted)
   * @param {string} worldId - World ID to backup
   * @param {string} password - Encryption password
   * @param {string} [customFileName] - Optional custom filename
   */
  async backup(worldId, password, customFileName) {
    if (!this.provider.isAuthenticated()) {
      await this.provider.authenticate()
    }

    console.log('Exporting world data...')
    const worldData = await this.exportFn(worldId)

    console.log('Encrypting world data...')
    const jsonData = JSON.stringify(worldData)
    const dataBytes = new TextEncoder().encode(jsonData)
    const encrypted = Encryption.encrypt(dataBytes, password)

    const fileName = customFileName || `clockwork-world-${worldId}-${Date.now()}.enc`

    console.log(`Uploading to ${this.provider.name}...`)
    await this.provider.upload(fileName, encrypted)

    console.log('✅ Backup complete!')
    return fileName
  }

  /**
   * Restore world from cloud storage (decrypt)
   * @param {string} fileName - Backup filename to restore from
   * @param {string} password - Decryption password
   * @returns {Promise<boolean>} True if successful
   */
  async restore(fileName, password) {
    if (!this.provider.isAuthenticated()) {
      await this.provider.authenticate()
    }

    console.log(`Downloading from ${this.provider.name}...`)
    const encrypted = await this.provider.download(fileName)

    if (!encrypted) {
      console.log('No backup found in cloud storage')
      return false
    }

    console.log('Decrypting world data...')
    try {
      const decrypted = Encryption.decrypt(encrypted, password)
      const jsonData = new TextDecoder().decode(decrypted)
      const worldData = JSON.parse(jsonData)

      console.log('Importing world data...')
      await this.importFn(worldData)

      console.log('✅ World restored successfully!')
      return true
    } catch (error) {
      console.error('Failed to decrypt - wrong password?', error)
      return false
    }
  }

  /**
   * List all backup files for a world
   * @param {string} worldId - World ID to search for
   * @returns {Promise<Array<{name: string, id: string}>>}
   */
  async listBackups(worldId) {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name contains 'clockwork-world-${worldId}' and trashed=false&fields=files(id,name,createdTime)&orderBy=createdTime desc`,
      {
        headers: {
          Authorization: `Bearer ${this.provider.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.files || []
  }
}
