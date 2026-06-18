<template>
  <div>
    <div v-if="loading" class="text-center py-8">
      <p class="text-gf-text-faint">Loading template...</p>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-gf-red">Error loading template: {{ error.message }}</p>
    </div>

    <div v-else-if="template">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-4">
          <router-link
            :to="`/library/lots/${template.id}`"
            class="text-gf-text-faint hover:text-gf-text"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
          </router-link>
          <h1 class="text-xl font-semibold text-gf-text">Edit Lot Template</h1>
        </div>
      </div>

      <!-- Edit Form -->
      <form @submit.prevent="saveTemplate" class="space-y-6">
        <!-- Template Name -->
        <div>
          <label class="block text-sm font-medium text-gf-text-weak mb-2">
            Template Name *
          </label>
          <input
            v-model="editForm.name"
            type="text"
            required
            class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            placeholder="Enter template name"
          />
        </div>

        <!-- Lot Type -->
        <div>
          <label class="block text-sm font-medium text-gf-text-weak mb-2">
            Lot Type *
          </label>
          <select
            v-model="editForm.lotType"
            required
            class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
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
          <label class="block text-sm font-medium text-gf-text-weak mb-2">
            Description
          </label>
          <textarea
            v-model="editForm.description"
            rows="3"
            class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            placeholder="Describe this lot template"
          ></textarea>
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-sm font-medium text-gf-text-weak mb-2">
            Tags (comma-separated)
          </label>
          <input
            v-model="editForm.tagsInput"
            type="text"
            class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
            placeholder="e.g., starter, house, modern"
          />
        </div>

        <!-- Indoor Rooms Section -->
        <div>
          <div class="flex justify-between items-center mb-3">
            <label class="block text-sm font-medium text-gf-text-weak">
              Indoor Rooms
            </label>
            <button
              type="button"
              @click="addIndoorRoom"
              class="text-gf-green hover:opacity-80 text-sm font-medium"
            >
              + Add Room
            </button>
          </div>

          <div v-if="editForm.indoorRooms.length === 0" class="text-gf-text-faint text-sm">
            No indoor rooms yet.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(room, roomIndex) in editForm.indoorRooms"
              :key="roomIndex"
              class="border border-gf-border rounded p-4 bg-gf-surface-2"
            >
              <div class="flex justify-between items-start mb-3">
                <h4 class="font-medium text-gf-text">Room {{ roomIndex + 1 }}</h4>
                <button
                  type="button"
                  @click="removeIndoorRoom(roomIndex)"
                  class="text-gf-red hover:opacity-80"
                  title="Remove room"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gf-text-weak mb-1">
                    Room Name *
                  </label>
                  <input
                    v-model="room.spaceName"
                    type="text"
                    required
                    class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
                    placeholder="e.g., Living Room"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gf-text-weak mb-1">
                    Description
                  </label>
                  <textarea
                    v-model="room.spaceDescription"
                    rows="2"
                    class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
                    placeholder="Describe this room"
                  ></textarea>
                </div>

                <!-- Items in this room -->
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <label class="block text-xs font-medium text-gf-text-weak">
                      Items
                    </label>
                    <button
                      type="button"
                      @click="addItemToRoom(roomIndex, true)"
                      class="text-gf-blue hover:underline text-xs font-medium"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div v-if="!room.items || room.items.length === 0" class="text-xs text-gf-text-faint">
                    No items yet.
                  </div>

                  <div v-else class="space-y-2">
                    <div
                      v-for="(item, itemIndex) in room.items"
                      :key="itemIndex"
                      class="flex gap-2 items-start bg-gf-surface-3 p-2 rounded"
                    >
                      <div class="flex-1 space-y-1">
                        <input
                          v-model="item.itemName"
                          type="text"
                          required
                          class="w-full rounded border border-gf-border bg-gf-bg px-2 py-1 text-xs text-gf-text focus:outline-none focus:border-gf-blue"
                          placeholder="Item name"
                        />
                        <input
                          v-model="item.itemDescription"
                          type="text"
                          class="w-full rounded border border-gf-border bg-gf-bg px-2 py-1 text-xs text-gf-text focus:outline-none focus:border-gf-blue"
                          placeholder="Description"
                        />
                      </div>
                      <button
                        type="button"
                        @click="removeItemFromRoom(roomIndex, itemIndex, true)"
                        class="text-gf-red hover:opacity-80 mt-1"
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
            <label class="block text-sm font-medium text-gf-text-weak">
              Outdoor Areas
            </label>
            <button
              type="button"
              @click="addOutdoorSpace"
              class="text-gf-green hover:opacity-80 text-sm font-medium"
            >
              + Add Area
            </button>
          </div>

          <div v-if="editForm.outdoorSpaces.length === 0" class="text-gf-text-faint text-sm">
            No outdoor areas yet.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(space, spaceIndex) in editForm.outdoorSpaces"
              :key="spaceIndex"
              class="border border-gf-border rounded p-4 bg-gf-surface-2"
            >
              <div class="flex justify-between items-start mb-3">
                <h4 class="font-medium text-gf-text">Area {{ spaceIndex + 1 }}</h4>
                <button
                  type="button"
                  @click="removeOutdoorSpace(spaceIndex)"
                  class="text-gf-red hover:opacity-80"
                  title="Remove area"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gf-text-weak mb-1">
                    Area Name *
                  </label>
                  <input
                    v-model="space.spaceName"
                    type="text"
                    required
                    class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
                    placeholder="e.g., Backyard"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gf-text-weak mb-1">
                    Description
                  </label>
                  <textarea
                    v-model="space.spaceDescription"
                    rows="2"
                    class="w-full rounded border border-gf-border bg-gf-bg px-3 py-2 text-sm text-gf-text focus:outline-none focus:border-gf-blue"
                    placeholder="Describe this area"
                  ></textarea>
                </div>

                <!-- Items in this area -->
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <label class="block text-xs font-medium text-gf-text-weak">
                      Items
                    </label>
                    <button
                      type="button"
                      @click="addItemToRoom(spaceIndex, false)"
                      class="text-gf-blue hover:underline text-xs font-medium"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div v-if="!space.items || space.items.length === 0" class="text-xs text-gf-text-faint">
                    No items yet.
                  </div>

                  <div v-else class="space-y-2">
                    <div
                      v-for="(item, itemIndex) in space.items"
                      :key="itemIndex"
                      class="flex gap-2 items-start bg-gf-surface-3 p-2 rounded"
                    >
                      <div class="flex-1 space-y-1">
                        <input
                          v-model="item.itemName"
                          type="text"
                          required
                          class="w-full rounded border border-gf-border bg-gf-bg px-2 py-1 text-xs text-gf-text focus:outline-none focus:border-gf-blue"
                          placeholder="Item name"
                        />
                        <input
                          v-model="item.itemDescription"
                          type="text"
                          class="w-full rounded border border-gf-border bg-gf-bg px-2 py-1 text-xs text-gf-text focus:outline-none focus:border-gf-blue"
                          placeholder="Description"
                        />
                      </div>
                      <button
                        type="button"
                        @click="removeItemFromRoom(spaceIndex, itemIndex, false)"
                        class="text-gf-red hover:opacity-80 mt-1"
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
        <div class="flex justify-end space-x-3 pt-4 border-t border-gf-border">
          <router-link
            :to="`/library/lots/${template.id}`"
            class="rounded border border-gf-border bg-gf-surface px-3 py-1.5 text-sm text-gf-text-weak hover:bg-gf-surface-2"
          >
            Cancel
          </router-link>
          <button
            type="submit"
            :disabled="saving"
            class="rounded border border-gf-border bg-gf-green/15 px-3 py-1.5 text-sm font-medium text-gf-green hover:bg-gf-green/25 disabled:opacity-50"
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

interface TemplateItem {
  name: string
  description?: string | null
}

interface TemplateSpace {
  name: string
  description?: string | null
  items?: TemplateItem[]
}

interface LotTemplateDetail {
  id: string
  name: string
  lotType: string
  description?: string | null
  tags?: string[]
  indoorRooms?: TemplateSpace[]
  outdoorAreas?: TemplateSpace[]
}

interface GetLotTemplateResult {
  lotTemplate: LotTemplateDetail | null
}

interface EditItem {
  itemName: string
  itemDescription: string
}

interface EditSpace {
  spaceName: string
  spaceDescription: string
  items: EditItem[]
}

interface EditFormState {
  name: string
  lotType: string
  description: string
  tagsInput: string
  indoorRooms: EditSpace[]
  outdoorSpaces: EditSpace[]
}

const route = useRoute()
const router = useRouter()
const template = ref<LotTemplateDetail | null>(null)
const loading = ref(true)
const error = ref<Error | null>(null)
const saving = ref(false)

const createEmptySpace = (): EditSpace => ({
  spaceName: '',
  spaceDescription: '',
  items: []
})

const editForm = ref<EditFormState>({
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
  editForm.value.indoorRooms.push(createEmptySpace())
}

const removeIndoorRoom = (index: number) => {
  editForm.value.indoorRooms.splice(index, 1)
}

const addOutdoorSpace = () => {
  editForm.value.outdoorSpaces.push(createEmptySpace())
}

const removeOutdoorSpace = (index: number) => {
  editForm.value.outdoorSpaces.splice(index, 1)
}

const addItemToRoom = (spaceIndex: number, isIndoor: boolean) => {
  const spaces = isIndoor ? editForm.value.indoorRooms : editForm.value.outdoorSpaces
  const targetSpace = spaces[spaceIndex]
  if (!targetSpace) {
    return
  }
  targetSpace.items.push({
    itemName: '',
    itemDescription: ''
  })
}

const removeItemFromRoom = (spaceIndex: number, itemIndex: number, isIndoor: boolean) => {
  const spaces = isIndoor ? editForm.value.indoorRooms : editForm.value.outdoorSpaces
  spaces[spaceIndex]?.items.splice(itemIndex, 1)
}

const saveTemplate = async () => {
  try {
    saving.value = true

    const tags = editForm.value.tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    const input = {
      lotName: editForm.value.name,
      lotType: editForm.value.lotType,
      lotDescription: editForm.value.description || '',
      indoorRooms: editForm.value.indoorRooms.map((room) => ({
        spaceName: room.spaceName,
        spaceDescription: room.spaceDescription || '',
        items: room.items.map((item) => ({
          itemName: item.itemName,
          itemDescription: item.itemDescription || '',
          itemCount: 1
        }))
      })),
      outdoorSpaces: editForm.value.outdoorSpaces.map((space) => ({
        spaceName: space.spaceName,
        spaceDescription: space.spaceDescription || '',
        items: space.items.map((item) => ({
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
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error('Failed to save lot template')
    error.value = err
    alert('Error saving template: ' + err.message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const data = await client.request<GetLotTemplateResult>(QUERY_LOT_TEMPLATE, {
      id: route.params.templateId
    })
    template.value = data.lotTemplate
    if (!template.value) {
      throw new Error('Lot template not found')
    }

    // Populate edit form
    editForm.value = {
      name: template.value.name,
      lotType: template.value.lotType,
      description: template.value.description || '',
      tagsInput: (template.value.tags || []).join(', '),
      indoorRooms: (template.value.indoorRooms || []).map((room) => ({
        spaceName: room.name,
        spaceDescription: room.description || '',
        items: (room.items || []).map((item) => ({
          itemName: item.name,
          itemDescription: item.description || ''
        }))
      })),
      outdoorSpaces: (template.value.outdoorAreas || []).map((area) => ({
        spaceName: area.name,
        spaceDescription: area.description || '',
        items: (area.items || []).map((item) => ({
          itemName: item.name,
          itemDescription: item.description || ''
        }))
      }))
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e : new Error('Failed to load lot template')
  } finally {
    loading.value = false
  }
})
</script>
