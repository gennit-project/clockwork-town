import { GraphQLClient } from 'graphql-request'

const endpoint = import.meta.env.MODE === 'development'
  ? 'http://localhost:4000/graphql'
  : '/graphql'

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

  getLots: `
    query GetLots($regionId: ID!) {
      lots(regionId: $regionId) {
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
  `
}
