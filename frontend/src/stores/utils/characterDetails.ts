import type { CharacterState, LongTermMemory } from '../types'

export interface CharacterDetailsDependencies {
  fetchCharacterDetails: (characterId: string) => Promise<{
    character?: {
      longTermMemories?: LongTermMemory[]
    } | null
  }>
  persistCharacterBio: (characterId: string, bio: string) => Promise<void>
  createCharacterLongTermMemory: (characterId: string, content: string) => Promise<void>
  updateCharacterLongTermMemory: (memoryId: string, content: string) => Promise<void>
  deleteCharacterLongTermMemory: (memoryId: string) => Promise<void>
}

export async function refreshCharacterDetails(
  state: CharacterState,
  characterId: string,
  dependencies: Pick<CharacterDetailsDependencies, 'fetchCharacterDetails'>
): Promise<void> {
  const data = await dependencies.fetchCharacterDetails(characterId)
  state.longTermMemories = data.character?.longTermMemories || []
}

export async function saveCharacterBio(
  characterId: string,
  bio: string,
  dependencies: Pick<CharacterDetailsDependencies, 'persistCharacterBio'>
): Promise<void> {
  await dependencies.persistCharacterBio(characterId, bio)
}

export async function addLongTermMemory(
  state: CharacterState,
  characterId: string,
  content: string,
  dependencies: Pick<CharacterDetailsDependencies, 'createCharacterLongTermMemory' | 'fetchCharacterDetails'>
): Promise<void> {
  await dependencies.createCharacterLongTermMemory(characterId, content)
  await refreshCharacterDetails(state, characterId, dependencies)
}

export async function editLongTermMemory(
  state: CharacterState,
  characterId: string,
  memoryId: string,
  content: string,
  dependencies: Pick<CharacterDetailsDependencies, 'updateCharacterLongTermMemory' | 'fetchCharacterDetails'>
): Promise<void> {
  await dependencies.updateCharacterLongTermMemory(memoryId, content)
  await refreshCharacterDetails(state, characterId, dependencies)
}

export async function removeLongTermMemory(
  state: CharacterState,
  characterId: string,
  memoryId: string,
  dependencies: Pick<CharacterDetailsDependencies, 'deleteCharacterLongTermMemory' | 'fetchCharacterDetails'>
): Promise<void> {
  await dependencies.deleteCharacterLongTermMemory(memoryId)
  await refreshCharacterDetails(state, characterId, dependencies)
}
