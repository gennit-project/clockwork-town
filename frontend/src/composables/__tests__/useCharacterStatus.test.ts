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
      propose_relationship: 0,
      read: 0,
      write: 0,
      view_art: 0,
      view_movie: 0,
      volunteer: 0,
      pet_animal: 0,
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
    traitIds: [],
    values: [],
    accessibleLotIds: [],
    workSchedule: [],
    currentTask: null,
    incomingSocialInvitations: [],
    outgoingSocialInvitations: [],
    ...overrides
  }
}

function createTask(overrides: Partial<NonNullable<CharacterState['currentTask']>> = {}): NonNullable<CharacterState['currentTask']> {
  return {
    planId: 'task-1',
    goal: 'sleep',
    action: 'sleep',
    remainingTicks: 1,
    totalTicks: 3,
    currentStepIndex: 0,
    steps: [{
      action: 'sleep',
      remainingTicks: 1,
      totalTicks: 3
    }],
    ...overrides
  }
}

describe('useCharacterStatus', () => {
  it('formats item interactions into readable status text', () => {
    const state = createState({
      currentAction: 'sleep',
      currentTask: createTask({
        itemId: 'item-1',
        itemName: 'the couch',
        steps: [{
          action: 'sleep',
          itemId: 'item-1',
          itemName: 'the couch',
          remainingTicks: 1,
          totalTicks: 3
        }]
      })
    })

    expect(getCharacterStatusText(state)).toBe('sleeping on the couch')
  })

  it('formats social interactions with the target name', () => {
    const state = createState({
      currentAction: 'chat_friend',
      currentTask: createTask({
        goal: 'chat_friend',
        action: 'chat_friend',
        socialTargetId: 'char-2',
        socialTargetName: 'Alex',
        totalTicks: 2,
        steps: [{
          action: 'chat_friend',
          socialTargetId: 'char-2',
          socialTargetName: 'Alex',
          remainingTicks: 1,
          totalTicks: 2
        }]
      })
    })

    expect(getCharacterStatusText(state)).toBe('chatting with Alex')
  })

  describe('single-tick actions name their target', () => {
    it('says what they are looking at', () => {
      const state = createState({ currentAction: 'view_art', currentTargetName: 'Sunflower painting' })
      expect(getCharacterStatusText(state)).toBe('looking at Sunflower painting')
    })

    it('says what they are watching', () => {
      const state = createState({ currentAction: 'view_movie', currentTargetName: 'the TV' })
      expect(getCharacterStatusText(state)).toBe('watching the TV')
    })

    it('never leaves a dangling "Looking at" or "Watching" when the target is unknown', () => {
      expect(getCharacterStatusText(createState({ currentAction: 'view_art' }))).toBe('Looking at art')
      expect(getCharacterStatusText(createState({ currentAction: 'view_movie' }))).toBe('Watching a movie')
    })

    it('names the pet being spent time with', () => {
      expect(getCharacterStatusText(createState({ currentAction: 'pet_animal', currentTargetName: 'Diego' }))).toBe(
        'spending time with Diego'
      )
      expect(getCharacterStatusText(createState({ currentAction: 'pet_animal' }))).toBe('Spending time with a pet')
    })

    it('names the pet for a multi-tick pet task from its current step', () => {
      const state = createState({
        currentAction: 'pet_animal',
        currentTask: createTask({
          goal: 'pet_animal',
          action: 'pet_animal',
          steps: [{ action: 'pet_animal', animalTargetName: 'Marmalade', remainingTicks: 1, totalTicks: 2 }]
        })
      })
      expect(getCharacterStatusText(state)).toBe('spending time with Marmalade')
    })

    it('prefers the active task\'s target over a leftover one', () => {
      const state = createState({
        currentAction: 'read',
        currentTargetName: 'old bookshelf',
        currentTask: createTask({ goal: 'read', action: 'read', itemName: 'the library shelf' })
      })
      expect(getCharacterStatusText(state)).toBe('reading at the library shelf')
    })

    it('ignores a stale target once the character is idle', () => {
      expect(getCharacterStatusText(createState({ currentAction: 'idle', currentTargetName: 'Painting' }))).toBe('Idle')
    })
  })

  it('includes room and lot in the status meta location', () => {
    const meta = getCharacterStatusMeta(createState())
    expect(meta).toEqual({
      summary: 'Idle',
      location: 'Home -> Living Room'
    })
  })
})
