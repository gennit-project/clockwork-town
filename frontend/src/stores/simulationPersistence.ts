import { client, mutations, queries } from '../graphql'
import type { LongTermMemory } from './types'

interface FetchCharacterDetailsResult {
  character?: {
    id: string
    name: string
    age: number
    bio?: string | null
    workSchedule?: Array<{
      day: string
      start: string
      end: string
      location: {
        id: string
        name: string
      }
    }>
    longTermMemories?: LongTermMemory[]
  } | null
}

export async function moveCharacterToLot(characterId: string, lotId: string): Promise<void> {
  await client.request(mutations.moveCharacter, {
    input: {
      characterId,
      lotId
    }
  })
}

export async function startCharacterActivity(input: {
  characterId: string
  actionName: string
  itemId?: string
  note?: string
}): Promise<void> {
  await client.request(mutations.startActivity, {
    input
  })
}

export async function fetchCharacterDetails(characterId: string): Promise<FetchCharacterDetailsResult> {
  return client.request<FetchCharacterDetailsResult>(queries.getCharacter, { id: characterId })
}

export async function persistCharacterBio(characterId: string, bio: string): Promise<void> {
  await client.request(mutations.updateCharacterBio, { characterId, bio })
}

export async function persistCharacterDetails(input: {
  id: string
  name?: string
  age?: number
  bio?: string | null
  workSchedule?: Array<{
    day: string
    start: string
    end: string
    locationLotId: string
  }>
}): Promise<void> {
  await client.request(mutations.updateCharacter, { input })
}

export async function createCharacterDetails(input: {
  id: string
  name: string
  age: number
  bio?: string | null
  homeLotId: string
  householdId: string
  workSchedule?: Array<{
    day: string
    start: string
    end: string
    locationLotId: string
  }>
}): Promise<void> {
  await client.request(mutations.createCharacter, {
    input: {
      ...input,
      traitIds: [],
      valueIds: []
    }
  })
}

export async function createCharacterLongTermMemory(characterId: string, content: string): Promise<void> {
  await client.request(mutations.createCharacterLongTermMemory, { characterId, content })
}

export async function updateCharacterLongTermMemory(memoryId: string, content: string): Promise<void> {
  await client.request(mutations.updateCharacterLongTermMemory, { memoryId, content })
}

export async function deleteCharacterLongTermMemory(memoryId: string): Promise<void> {
  await client.request(mutations.deleteCharacterLongTermMemory, { memoryId })
}
