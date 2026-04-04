import { describe, expect, it } from 'vitest'
import { getCharacterStatusMeta, getCharacterStatusText } from '../useCharacterStatus'
import type { CharacterState } from '../../stores/types'

function createState(overrides: Partial<CharacterState> = {}): CharacterState {
  return {
    name: 'Manny',
    needs: {
      food: 1,
      sleep: 1,
      bladder: 1,
      hygiene: 1,
      health: 1,
      friends: 1,
      family: 1,
      romance: 1,
      fulfillment: 1
    },
    cooldowns: {
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
      work: 0
    },
    currentAction: 'idle',
    location: {
      regionId: 'region-1',
      lotId: 'lot-1',
      lotName: 'Home',
      spaceId: 'space-1',
      spaceName: 'Living Room'
    },
    traits: [],
    currentTask: null,
    ...overrides
  }
}

describe('useCharacterStatus', () => {
  it('formats item interactions into readable status text', () => {
    const state = createState({
      currentAction: 'sleep',
      currentTask: {
        action: 'sleep',
        itemId: 'item-1',
        itemName: 'the couch',
        remainingTicks: 1,
        totalTicks: 3
      }
    })

    expect(getCharacterStatusText(state)).toBe('sleeping on the couch')
  })

  it('formats social interactions with the target name', () => {
    const state = createState({
      currentAction: 'chat_friend',
      currentTask: {
        action: 'chat_friend',
        socialTargetId: 'char-2',
        socialTargetName: 'Alex',
        remainingTicks: 1,
        totalTicks: 2
      }
    })

    expect(getCharacterStatusText(state)).toBe('chatting with Alex')
  })

  it('includes room and lot in the status meta location', () => {
    const meta = getCharacterStatusMeta(createState())
    expect(meta).toEqual({
      summary: 'Idle',
      location: 'Home -> Living Room'
    })
  })
})
