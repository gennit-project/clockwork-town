<template>
  <div>
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500">Loading template...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">Error loading template: {{ error.message }}</p>
    </div>

    <div v-else-if="template">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-4">
          <router-link
            :to="`/library/lots/${template.id}`"
            class="text-gray-400 hover:text-gray-600 dark:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
          </router-link>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Lot Template</h1>
        </div>
      </div>

      <!-- Edit Form -->
      <form @submit.prevent="saveTemplate" class="space-y-6">
        <!-- Template Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Template Name *
          </label>
          <input
            v-model="editForm.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter template name"
          />
        </div>

        <!-- Lot Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lot Type *
          </label>
          <select
            v-model="editForm.lotType"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select lot type</option>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="COMMUNITY">Community</option>
            <option value="PARK">Park</option>
          </select>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            v-model="editForm.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Describe this lot template"
          ></textarea>
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags (comma-separated)
          </label>
          <input
            v-model="editForm.tagsInput"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="e.g., starter, house, modern"
          />
        </div>

        <!-- Indoor Rooms Section -->
        <div>
          <div class="flex justify-between items-center mb-3">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Indoor Rooms
            </label>
            <button
              type="button"
              @click="addIndoorRoom"
              class="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              + Add Room
            </button>
          </div>

          <div v-if="editForm.indoorRooms.length === 0" class="text-gray-500 dark:text-gray-300 text-sm">
            No indoor rooms yet.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(room, roomIndex) in editForm.indoorRooms"
              :key="roomIndex"
              class="border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-white dark:bg-gray-700"
            >
              <div class="flex justify-between items-start mb-3">
                <h4 class="font-medium text-gray-900 dark:text-gray-100">Room {{ roomIndex + 1 }}</h4>
                <button
                  type="button"
                  @click="removeIndoorRoom(roomIndex)"
                  class="text-red-600 hover:text-red-800"
                  title="Remove room"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Room Name *
                  </label>
                  <input
                    v-model="room.spaceName"
                    type="text"
                    required
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md text-sm"
                    placeholder="e.g., Living Room"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    v-model="room.spaceDescription"
                    rows="2"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md text-sm"
                    placeholder="Describe this room"
                  ></textarea>
                </div>

                <!-- Items in this room -->
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Items
                    </label>
                    <button
                      type="button"
                      @click="addItemToRoom(roomIndex, true)"
                      class="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div v-if="!room.items || room.items.length === 0" class="text-xs text-gray-500 dark:text-gray-400">
                    No items yet.
                  </div>

                  <div v-else class="space-y-2">
                    <div
                      v-for="(item, itemIndex) in room.items"
                      :key="itemIndex"
                      class="flex gap-2 items-start bg-gray-50 dark:bg-gray-800 p-2 rounded"
                    >
                      <div class="flex-1 space-y-1">
                        <input
                          v-model="item.itemName"
                          type="text"
                          required
                          class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-xs"
                          placeholder="Item name"
                        />
                        <input
                          v-model="item.itemDescription"
                          type="text"
                          class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-xs"
                          placeholder="Description"
                        />
                      </div>
                      <button
                        type="button"
                        @click="removeItemFromRoom(roomIndex, itemIndex, true)"
                        class="text-red-600 hover:text-red-800 mt-1"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Outdoor Spaces Section -->
        <div>
          <div class="flex justify-between items-center mb-3">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Outdoor Areas
            </label>
            <button
              type="button"
              @click="addOutdoorSpace"
              class="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              + Add Area
            </button>
          </div>

          <div v-if="editForm.outdoorSpaces.length === 0" class="text-gray-500 dark:text-gray-300 text-sm">
            No outdoor areas yet.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(space, spaceIndex) in editForm.outdoorSpaces"
              :key="spaceIndex"
              class="border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-white dark:bg-gray-700"
            >
              <div class="flex justify-between items-start mb-3">
                <h4 class="font-medium text-gray-900 dark:text-gray-100">Area {{ spaceIndex + 1 }}</h4>
                <button
                  type="button"
                  @click="removeOutdoorSpace(spaceIndex)"
                  class="text-red-600 hover:text-red-800"
                  title="Remove area"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Area Name *
                  </label>
                  <input
                    v-model="space.spaceName"
                    type="text"
                    required
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md text-sm"
                    placeholder="e.g., Backyard"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    v-model="space.spaceDescription"
                    rows="2"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md text-sm"
                    placeholder="Describe this area"
                  ></textarea>
                </div>

                <!-- Items in this area -->
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Items
                    </label>
                    <button
                      type="button"
                      @click="addItemToRoom(spaceIndex, false)"
                      class="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div v-if="!space.items || space.items.length === 0" class="text-xs text-gray-500 dark:text-gray-400">
                    No items yet.
                  </div>

                  <div v-else class="space-y-2">
                    <div
                      v-for="(item, itemIndex) in space.items"
                      :key="itemIndex"
                      class="flex gap-2 items-start bg-gray-50 dark:bg-gray-800 p-2 rounded"
                    >
                      <div class="flex-1 space-y-1">
                        <input
                          v-model="item.itemName"
                          type="text"
                          required
                          class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-xs"
                          placeholder="Item name"
                        />
                        <input
                          v-model="item.itemDescription"
                          type="text"
                          class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-xs"
                          placeholder="Description"
                        />
                      </div>
                      <button
                        type="button"
                        @click="removeItemFromRoom(spaceIndex, itemIndex, false)"
                        class="text-red-600 hover:text-red-800 mt-1"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <router-link
            :to="`/library/lots/${template.id}`"
            class="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-100"
          >
            Cancel
          </router-link>
          <button
            type="submit"
            :disabled="saving"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : 'Save Template' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gql } from 'graphql-request'
import { client, mutations } from '../graphql'

const route = useRoute()
const router = useRouter()
const template = ref(null)
const loading = ref(true)
const error = ref(null)
const saving = ref(false)

const editForm = ref({
  name: '',
  lotType: '',
  description: '',
  tagsInput: '',
  indoorRooms: [],
  outdoorSpaces: []
})

const QUERY_LOT_TEMPLATE = gql`
  query GetLotTemplate($id: ID!) {
    lotTemplate(id: $id) {
      id
      name
      lotType
      description
      tags
      indoorRooms {
        name
        description
        items {
          name
          description
        }
      }
      outdoorAreas {
        name
        description
        items {
          name
          description
        }
      }
    }
  }
`

const addIndoorRoom = () => {
  editForm.value.indoorRooms.push({
    spaceName: '',
    spaceDescription: '',
    items: []
  })
}

const removeIndoorRoom = (index) => {
  editForm.value.indoorRooms.splice(index, 1)
}

const addOutdoorSpace = () => {
  editForm.value.outdoorSpaces.push({
    spaceName: '',
    spaceDescription: '',
    items: []
  })
}

const removeOutdoorSpace = (index) => {
  editForm.value.outdoorSpaces.splice(index, 1)
}

const addItemToRoom = (spaceIndex, isIndoor) => {
  const spaces = isIndoor ? editForm.value.indoorRooms : editForm.value.outdoorSpaces
  if (!spaces[spaceIndex].items) {
    spaces[spaceIndex].items = []
  }
  spaces[spaceIndex].items.push({
    itemName: '',
    itemDescription: ''
  })
}

const removeItemFromRoom = (spaceIndex, itemIndex, isIndoor) => {
  const spaces = isIndoor ? editForm.value.indoorRooms : editForm.value.outdoorSpaces
  spaces[spaceIndex].items.splice(itemIndex, 1)
}

const saveTemplate = async () => {
  try {
    saving.value = true

    const tags = editForm.value.tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    const input = {
      lotName: editForm.value.name,
      lotType: editForm.value.lotType,
      lotDescription: editForm.value.description || '',
      indoorRooms: editForm.value.indoorRooms.map(room => ({
        spaceName: room.spaceName,
        spaceDescription: room.spaceDescription || '',
        items: (room.items || []).map(item => ({
          itemName: item.itemName,
          itemDescription: item.itemDescription || '',
          itemCount: 1
        }))
      })),
      outdoorSpaces: editForm.value.outdoorSpaces.map(space => ({
        spaceName: space.spaceName,
        spaceDescription: space.spaceDescription || '',
        items: (space.items || []).map(item => ({
          itemName: item.itemName,
          itemDescription: item.itemDescription || '',
          itemCount: 1
        }))
      }))
    }

    await client.request(mutations.updateLotTemplate, {
      id: route.params.templateId,
      input,
      tags
    })

    // Navigate back to detail page
    router.push(`/library/lots/${route.params.templateId}`)
  } catch (e) {
    error.value = e
    alert('Error saving template: ' + e.message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const data = await client.request(QUERY_LOT_TEMPLATE, {
      id: route.params.templateId
    })
    template.value = data.lotTemplate

    // Populate edit form
    editForm.value = {
      name: template.value.name,
      lotType: template.value.lotType,
      description: template.value.description || '',
      tagsInput: (template.value.tags || []).join(', '),
      indoorRooms: (template.value.indoorRooms || []).map(room => ({
        spaceName: room.name,
        spaceDescription: room.description || '',
        items: (room.items || []).map(item => ({
          itemName: item.name,
          itemDescription: item.description || ''
        }))
      })),
      outdoorSpaces: (template.value.outdoorAreas || []).map(area => ({
        spaceName: area.name,
        spaceDescription: area.description || '',
        items: (area.items || []).map(item => ({
          itemName: item.name,
          itemDescription: item.description || ''
        }))
      }))
    }
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
})
</script>
