import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSimulationStore } from './simulation'
import {
  createCharacterLongTermMemory,
  deleteCharacterLongTermMemory,
  fetchCharacterDetails,
  persistCharacterBio,
  updateCharacterLongTermMemory
} from './simulationPersistence'
import {
  addLongTermMemory,
  editLongTermMemory,
  refreshCharacterDetails,
  removeLongTermMemory,
  saveCharacterBio
} from './utils/characterDetails'

export const useCharacterPanelStore = defineStore('characterPanel', () => {
  const simulationStore = useSimulationStore()
  const activeCharacterId = ref<string | null>(null)

  const activeCharacterState = computed(() => {
    if (!activeCharacterId.value) {
      return null
    }

    return simulationStore.characterStates[activeCharacterId.value] || null
  })

  async function loadCharacterDetails(characterId: string): Promise<void> {
    const state = simulationStore.characterStates[characterId]
    if (!state) {
      return
    }

    await refreshCharacterDetails(state, characterId, { fetchCharacterDetails })
  }

  async function updateCharacterBio(characterId: string, bio: string): Promise<void> {
    await saveCharacterBio(characterId, bio, { persistCharacterBio })
  }

  async function createLongTermMemory(characterId: string, content: string): Promise<void> {
    const state = simulationStore.characterStates[characterId]
    if (!state) {
      return
    }

    await addLongTermMemory(state, characterId, content, {
      createCharacterLongTermMemory,
      fetchCharacterDetails
    })
  }

  async function updateLongTermMemory(characterId: string, memoryId: string, content: string): Promise<void> {
    const state = simulationStore.characterStates[characterId]
    if (!state) {
      return
    }

    await editLongTermMemory(state, characterId, memoryId, content, {
      updateCharacterLongTermMemory,
      fetchCharacterDetails
    })
  }

  async function deleteLongTermMemory(characterId: string, memoryId: string): Promise<void> {
    const state = simulationStore.characterStates[characterId]
    if (!state) {
      return
    }

    await removeLongTermMemory(state, characterId, memoryId, {
      deleteCharacterLongTermMemory,
      fetchCharacterDetails
    })
  }

  function setActiveCharacter(characterId: string | null): void {
    activeCharacterId.value = characterId
    if (characterId) {
      void loadCharacterDetails(characterId)
    }
  }

  function resetPanel(): void {
    activeCharacterId.value = null
  }

  return {
    activeCharacterId,
    activeCharacterState,
    loadCharacterDetails,
    updateCharacterBio,
    createLongTermMemory,
    updateLongTermMemory,
    deleteLongTermMemory,
    setActiveCharacter,
    resetPanel
  }
})
