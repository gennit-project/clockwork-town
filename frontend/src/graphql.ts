import { GraphQLClient } from 'graphql-request'

function getGraphQLEndpoint(): string {
  if (typeof window !== 'undefined') {
    return new URL('/graphql', window.location.origin).toString()
  }

  return 'http://localhost:4000/graphql'
}

const endpoint = getGraphQLEndpoint()

export const client = new GraphQLClient(endpoint)

export const queries = {
  getWorlds: `
    query GetWorlds {
      worlds {
        id
        name
        createdAt
      }
    }
  `,

  getWorld: `
    query GetWorld($id: ID!) {
      world(id: $id) {
        id
        name
        createdAt
      }
    }
  `,

  getRegions: `
    query GetRegions($worldId: ID!) {
      regions(worldId: $worldId) {
        id
        name
        worldId
        kind
      }
    }
  `,

  getRegion: `
    query GetRegion($id: ID!) {
      region(id: $id) {
        id
        name
        worldId
        kind
        characters {
          id
          name
          age
          bio
          location {
            id
            name
            lotType
          }
        }
        animals {
          id
          name
          age
          traits
          bio
        }
      }
    }
  `,

  getLots: `
    query GetLots($regionId: ID!) {
      lots(regionId: $regionId) {
        id
        name
        lotType
      }
    }
  `,

  getLot: `
    query GetLot($id: ID!) {
      lot(id: $id) {
        id
        name
        lotType
      }
    }
  `,

  getSpaces: `
    query GetSpaces($lotId: ID!) {
      lot(id: $lotId) {
        indoorRooms {
          id
          name
          description
        }
        outdoorAreas {
          id
          name
          description
        }
      }
    }
  `,

  getSpacesWithItems: `
    query GetSpacesWithItems($lotId: ID!) {
      lot(id: $lotId) {
        id
        name
        lotType
        indoorRooms {
          id
          name
          description
          items {
            id
            name
            description
            allowedActivities
            affordances {
              action
              weight
            }
            maxSimultaneousUsers
            activeUsers {
              id
              name
            }
          }
        }
        outdoorAreas {
          id
          name
          description
          items {
            id
            name
            description
            allowedActivities
            affordances {
              action
              weight
            }
            maxSimultaneousUsers
            activeUsers {
              id
              name
            }
          }
        }
      }
    }
  `,

  getSpace: `
    query GetSpace($id: ID!) {
      space(id: $id) {
        id
        name
        description
        isIndoor
        items {
          id
          name
          description
          allowedActivities
          affordances {
            action
            weight
          }
          maxSimultaneousUsers
          activeUsers {
            id
            name
          }
        }
      }
    }
  `,

  getHouseholds: `
    query GetHouseholds($regionId: ID!) {
      households(regionId: $regionId) {
        id
        name
        lotId
        lotName
        characters {
          id
          name
          age
        }
      }
    }
  `,

  getHousehold: `
    query GetHousehold($id: ID!) {
      household(id: $id) {
        id
        name
        lotId
        lotName
        characters {
          id
          name
          age
          bio
        }
        animals {
          id
          name
          age
          traits
          bio
          ownerId
        }
      }
    }
  `,

  getHouseholdTemplates: `
    query GetHouseholdTemplates($tags: [String!]) {
      householdTemplates(tags: $tags) {
        id
        name
        description
        tags
        characters {
          name
          age
          bio
        }
        animals {
          name
          age
          traits
        }
      }
    }
  `,

  getHouseholdTemplate: `
    query GetHouseholdTemplate($id: ID!) {
      householdTemplate(id: $id) {
        id
        name
        description
        tags
        characters {
          name
          age
          bio
        }
        animals {
          name
          age
          traits
        }
      }
    }
  `,

  getCharacter: `
    query GetCharacter($id: ID!) {
      character(id: $id) {
        id
        name
        age
        bio
        longTermMemories {
          id
          content
          createdAt
        }
      }
    }
  `
}

export const mutations = {
  createWorld: `
    mutation CreateWorld($input: NewWorld!) {
      createWorld(input: $input) {
        id
        name
        createdAt
      }
    }
  `,

  updateWorld: `
    mutation UpdateWorld($id: ID!, $name: String!) {
      updateWorld(id: $id, name: $name) {
        id
        name
        createdAt
      }
    }
  `,

  deleteWorld: `
    mutation DeleteWorld($id: ID!) {
      deleteWorld(id: $id)
    }
  `,

  createRegion: `
    mutation CreateRegion($input: NewRegion!) {
      createRegion(input: $input) {
        id
        name
        worldId
        kind
      }
    }
  `,

  updateRegion: `
    mutation UpdateRegion($id: ID!, $name: String!, $kind: String!) {
      updateRegion(id: $id, name: $name, kind: $kind) {
        id
        name
        kind
      }
    }
  `,

  deleteRegion: `
    mutation DeleteRegion($id: ID!) {
      deleteRegion(id: $id)
    }
  `,

  createLot: `
    mutation CreateLot($input: NewLot!) {
      createLot(input: $input) {
        id
        name
        lotType
      }
    }
  `,

  updateLot: `
    mutation UpdateLot($id: ID!, $name: String!, $lotType: LotType!) {
      updateLot(id: $id, name: $name, lotType: $lotType) {
        id
        name
        lotType
      }
    }
  `,

  deleteLot: `
    mutation DeleteLot($id: ID!) {
      deleteLot(id: $id)
    }
  `,

  createSpace: `
    mutation CreateSpace($input: NewSpace!) {
      createSpace(input: $input) {
        id
        name
        description
      }
    }
  `,

  updateSpace: `
    mutation UpdateSpace($id: ID!, $name: String!, $description: String!) {
      updateSpace(id: $id, name: $name, description: $description) {
        id
        name
        description
      }
    }
  `,

  deleteSpace: `
    mutation DeleteSpace($id: ID!) {
      deleteSpace(id: $id)
    }
  `,

  createItem: `
    mutation CreateItem($input: NewItem!) {
      createItem(input: $input) {
        id
        name
        description
        allowedActivities
        maxSimultaneousUsers
        affordances {
          action
          weight
        }
      }
    }
  `,

  updateItem: `
    mutation UpdateItem($input: UpdateItemInput!) {
      updateItem(input: $input) {
        id
        name
        description
        allowedActivities
        maxSimultaneousUsers
        affordances {
          action
          weight
        }
      }
    }
  `,

  deleteItem: `
    mutation DeleteItem($id: ID!) {
      deleteItem(id: $id)
    }
  `,

  createHousehold: `
    mutation CreateHousehold($input: NewHousehold!, $characters: [NewCharacterSimple!]!, $animals: [NewAnimalSimple!]) {
      createHousehold(input: $input, characters: $characters, animals: $animals) {
        id
        name
        lotId
        lotName
        characters {
          id
          name
          age
        }
      }
    }
  `,

  updateHousehold: `
    mutation UpdateHousehold($id: ID!, $name: String!, $lotId: ID!, $characters: [NewCharacterSimple!], $animals: [NewAnimalSimple!]) {
      updateHousehold(id: $id, name: $name, lotId: $lotId, characters: $characters, animals: $animals) {
        id
        name
        lotId
        lotName
      }
    }
  `,

  deleteHousehold: `
    mutation DeleteHousehold($id: ID!) {
      deleteHousehold(id: $id)
    }
  `,

  createLotTemplate: `
    mutation CreateLotTemplate($input: CreateLotWithSpacesInput!, $tags: [String!]!) {
      createLotTemplate(input: $input, tags: $tags) {
        id
        name
        lotType
        description
        tags
      }
    }
  `,

  updateLotTemplate: `
    mutation UpdateLotTemplate($id: ID!, $input: CreateLotWithSpacesInput!, $tags: [String!]!) {
      updateLotTemplate(id: $id, input: $input, tags: $tags) {
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
  `,

  createHouseholdTemplate: `
    mutation CreateHouseholdTemplate($input: CreateHouseholdTemplateInput!, $tags: [String!]!) {
      createHouseholdTemplate(input: $input, tags: $tags) {
        id
        name
        description
        tags
      }
    }
  `,

  updateHouseholdTemplate: `
    mutation UpdateHouseholdTemplate($id: ID!, $input: CreateHouseholdTemplateInput!, $tags: [String!]!) {
      updateHouseholdTemplate(id: $id, input: $input, tags: $tags) {
        id
        name
        description
        tags
        characters {
          name
          age
          bio
        }
        animals {
          name
          age
          traits
        }
      }
    }
  `,

  deleteHouseholdTemplate: `
    mutation DeleteHouseholdTemplate($id: ID!) {
      deleteHouseholdTemplate(id: $id)
    }
  `,

  moveCharacter: `
    mutation MoveCharacter($input: MoveInput!) {
      moveCharacter(input: $input)
    }
  `,

  updateCharacterBio: `
    mutation UpdateCharacterBio($characterId: ID!, $bio: String!) {
      updateCharacterBio(characterId: $characterId, bio: $bio) {
        id
        bio
      }
    }
  `,

  createCharacterLongTermMemory: `
    mutation CreateCharacterLongTermMemory($characterId: ID!, $content: String!) {
      createCharacterLongTermMemory(characterId: $characterId, content: $content) {
        id
        content
        createdAt
      }
    }
  `,

  updateCharacterLongTermMemory: `
    mutation UpdateCharacterLongTermMemory($memoryId: ID!, $content: String!) {
      updateCharacterLongTermMemory(memoryId: $memoryId, content: $content) {
        id
        content
        createdAt
      }
    }
  `,

  deleteCharacterLongTermMemory: `
    mutation DeleteCharacterLongTermMemory($memoryId: ID!) {
      deleteCharacterLongTermMemory(memoryId: $memoryId)
    }
  `,

  startActivity: `
    mutation StartActivity($input: PerformInput!) {
      startActivity(input: $input)
    }
  `,

  exportWorld: `
    mutation ExportWorld($worldId: ID!) {
      exportWorld(worldId: $worldId)
    }
  `,

  importWorld: `
    mutation ImportWorld($data: JSON!) {
      importWorld(data: $data) {
        worldId
        success
        message
      }
    }
  `
}
