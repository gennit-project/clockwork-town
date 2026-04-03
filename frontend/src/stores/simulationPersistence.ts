import { client, mutations, queries } from '../graphql'

export async function moveCharacterToLot(characterId: string, lotId: string): Promise<void> {
  await client.request(mutations.moveCharacter, {
    input: {
      characterId,
      lotId
    }
  })
}

export async function startCharacterActivity(characterId: string, actionName: string): Promise<void> {
  await client.request(mutations.startActivity, {
    input: {
      characterId,
      actionName
    }
  })
}

export async function fetchCharacterDetails(characterId: string) {
  return client.request(queries.getCharacter, { id: characterId })
}

export async function persistCharacterBio(characterId: string, bio: string): Promise<void> {
  await client.request(mutations.updateCharacterBio, { characterId, bio })
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
