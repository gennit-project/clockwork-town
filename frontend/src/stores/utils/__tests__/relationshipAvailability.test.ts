import { describe, expect, it } from 'vitest'
import { createMockCharacterState } from '../../__tests__/mockData'
import { evaluateRelationshipAvailability } from '../relationshipAvailability'

describe('relationshipAvailability', () => {
  it('allows text while a target is sleeping but blocks calls and invites', () => {
    const availability = evaluateRelationshipAvailability({
      relationship: {
        id: 'rel-1',
        fromCharacterId: 'char-1',
        toCharacterId: 'char-2',
        shortTermScore: 0.4,
        longTermScore: 0.6,
        labels: [],
        lastSeenAt: null,
        lastSpokeAt: null,
        isDeceasedTarget: false
      },
      targetState: createMockCharacterState({
        currentAction: 'sleep'
      })
    })

    expect(availability.canText).toBe(true)
  })

  it('marks deceased relationships unavailable for all contact actions', () => {
    const availability = evaluateRelationshipAvailability({
      relationship: {
        id: 'rel-1',
        fromCharacterId: 'char-1',
        toCharacterId: 'char-2',
        shortTermScore: 0.4,
        longTermScore: 0.6,
        labels: [],
        lastSeenAt: null,
        lastSpokeAt: null,
        isDeceasedTarget: true
      },
      targetState: createMockCharacterState()
    })

    expect(availability.canInviteOver).toBe(false)
  })
})
