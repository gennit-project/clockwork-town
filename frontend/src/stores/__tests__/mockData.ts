/**
 * Mock data for testing simulation logic
 */

import type {
  WorldData,
  CharacterState,
  Needs,
  Cooldowns,
  ItemOccupancy
} from '../types'

export const createMockNeeds = (overrides: Partial<Needs> = {}): Needs => ({
  food: 0.5,
  sleep: 0.5,
  bladder: 0.6,
  hygiene: 0.7,
  health: 0.9,
  friends: 0.7,
  family: 0.7,
  romance: 0.6,
  fulfillment: 0.6,
  ...overrides
})

export const createMockCooldowns = (overrides: Partial<Cooldowns> = {}): Cooldowns => ({
  eat: 0,
  sleep: 0,
  use_toilet: 0,
  shower: 0,
  medicate: 0,
  chat_friend: 0,
  call_mom: 0,
  date: 0,
  text_romance: 0,
  call_romance: 0,
  invite_over: 0,
  read: 0,
  write: 0,
  view_art: 0,
  volunteer: 0,
  work: 0,
  ...overrides
})

export const createMockCharacterState = (overrides: Partial<CharacterState> = {}): CharacterState => ({
  name: 'Test Character',
  needs: createMockNeeds(),
  cooldowns: createMockCooldowns(),
  currentAction: 'idle',
  location: {
    regionId: 'region-1',
    lotId: 'lot-1',
    lotName: 'Test House',
    spaceId: 'space-1',
    spaceName: 'Living Room'
  },
  traits: [],
  queuedActions: [],
  incomingSocialInvitations: [],
  outgoingSocialInvitations: [],
  currentTask: null,
  longTermMemories: [],
  accessibleLotIds: ['lot-1', 'lot-2'],
  workSchedule: [],
  ...overrides
})

export const createMockWorldData = (): WorldData => ({
  lots: {
    'lot-1': {
      id: 'lot-1',
      name: 'Test House',
      regionId: 'region-1',
      lotType: 'RESIDENTIAL',
      isPublic: false,
      spaceIds: ['space-1', 'space-2']
    },
    'lot-2': {
      id: 'lot-2',
      name: 'Community Center',
      regionId: 'region-1',
      lotType: 'COMMUNITY',
      isPublic: true,
      spaceIds: ['space-3']
    }
  },
  spaces: {
    'space-1': {
      id: 'space-1',
      name: 'Living Room',
      lotId: 'lot-1',
      itemIds: ['item-1', 'item-2']
    },
    'space-2': {
      id: 'space-2',
      name: 'Kitchen',
      lotId: 'lot-1',
      itemIds: ['item-3']
    },
    'space-3': {
      id: 'space-3',
      name: 'Library',
      lotId: 'lot-2',
      itemIds: ['item-4']
    }
  },
  items: {
    'item-1': {
      id: 'item-1',
      name: 'Couch',
      spaceId: 'space-1',
      lotId: 'lot-1',
      regionId: 'region-1',
      comfort: 0.1,
      allowedActivities: ['read', 'chat_friend'],
      affordances: [{ action: 'read', weight: 1 }, { action: 'chat_friend', weight: 1 }],
      maxSimultaneousUsers: 3,
      classification: {
        isFoodStorage: false,
        isTakeoutSource: false,
        isGrocerySource: false,
        isKitchenStation: false,
        isTableSeat: false,
        isChairSeat: false,
        isLoungeSeat: true,
        isBedSeat: false,
        isBookSource: false
      }
    },
    'item-2': {
      id: 'item-2',
      name: 'Bed',
      spaceId: 'space-1',
      lotId: 'lot-1',
      regionId: 'region-1',
      comfort: 0.25,
      allowedActivities: ['sleep'],
      affordances: [{ action: 'sleep', weight: 1 }],
      maxSimultaneousUsers: 1,
      classification: {
        isFoodStorage: false,
        isTakeoutSource: false,
        isGrocerySource: false,
        isKitchenStation: false,
        isTableSeat: false,
        isChairSeat: false,
        isLoungeSeat: false,
        isBedSeat: true,
        isBookSource: false
      }
    },
    'item-3': {
      id: 'item-3',
      name: 'Fridge',
      spaceId: 'space-2',
      lotId: 'lot-1',
      regionId: 'region-1',
      comfort: 0,
      allowedActivities: ['eat'],
      affordances: [{ action: 'eat', weight: 1 }],
      maxSimultaneousUsers: null,
      classification: {
        isFoodStorage: true,
        isTakeoutSource: false,
        isGrocerySource: false,
        isKitchenStation: false,
        isTableSeat: false,
        isChairSeat: false,
        isLoungeSeat: false,
        isBedSeat: false,
        isBookSource: false
      }
    },
    'item-4': {
      id: 'item-4',
      name: 'Bookshelf',
      spaceId: 'space-3',
      lotId: 'lot-2',
      regionId: 'region-1',
      comfort: 0,
      allowedActivities: ['read'],
      affordances: [{ action: 'read', weight: 1 }],
      maxSimultaneousUsers: null,
      classification: {
        isFoodStorage: false,
        isTakeoutSource: false,
        isGrocerySource: false,
        isKitchenStation: false,
        isTableSeat: false,
        isChairSeat: false,
        isLoungeSeat: false,
        isBedSeat: false,
        isBookSource: true
      }
    }
  },
  itemsByAffordance: {
    read: ['item-1', 'item-4'],
    chat_friend: ['item-1'],
    sleep: ['item-2'],
    eat: ['item-3']
  }
})

export const createMockItemOccupancy = (overrides: ItemOccupancy = {}): ItemOccupancy => ({
  ...overrides
})

// Suppress console logs during tests
export const mockConsole = () => {
  const originalConsole = { ...console }

  beforeEach(() => {
    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
  })
}
