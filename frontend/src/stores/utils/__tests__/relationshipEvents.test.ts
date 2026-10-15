import { describe, expect, it } from 'vitest'
import { createMockCharacterState } from '../../__tests__/mockData'
import {
  evaluateReunion,
  evaluateRelationshipEvents,
  formatElapsedHours,
  REUNION_ABSENCE_THRESHOLD_MINUTES,
  REUNION_HUG_MIN_SCORE,
  type RelationshipEventContext,
  type RelationshipEventEvaluator
} from '../relationshipEvents'
import type { CharacterRelationship } from '../../types'

const relationship = (longTermScore: number): CharacterRelationship => ({
  id: 'r',
  fromCharacterId: 'a',
  toCharacterId: 'b',
  shortTermScore: 0,
  longTermScore,
  labels: [],
  isDeceasedTarget: false
})

const context = (
  minutes: { forward: number | null; reverse: number | null },
  score = 0
): RelationshipEventContext => ({
  characterState: createMockCharacterState({ name: 'Alice' }),
  targetState: createMockCharacterState({ name: 'Bob' }),
  forward: relationship(score),
  reverse: relationship(score),
  minutesApart: minutes
})

describe('evaluateReunion', () => {
  it('needs an absence of at least the threshold on either side', () => {
    const below = REUNION_ABSENCE_THRESHOLD_MINUTES - 1
    expect(evaluateReunion(context({ forward: below, reverse: below }))).toBeNull()
    expect(evaluateReunion(context({ forward: REUNION_ABSENCE_THRESHOLD_MINUTES, reverse: null }))).not.toBeNull()
    expect(evaluateReunion(context({ forward: null, reverse: REUNION_ABSENCE_THRESHOLD_MINUTES }))).not.toBeNull()
  })

  it('never fires for people who have never been seen together', () => {
    expect(evaluateReunion(context({ forward: null, reverse: null }))).toBeNull()
  })

  it('is a notable hug at or above the warmth threshold', () => {
    const event = evaluateReunion(context({ forward: 600, reverse: 600 }, REUNION_HUG_MIN_SCORE))
    expect(event).toEqual({
      type: 'reunited_after_long_absence',
      forwardMemory: 'Hugged Bob after 10 hours apart.',
      reverseMemory: 'Hugged Alice after 10 hours apart.',
      notable: true,
      logMessage: 'Alice and Bob hugged after 10 hours apart.'
    })
  })

  it('is a quiet "saw them again" just below the threshold', () => {
    const event = evaluateReunion(context({ forward: 600, reverse: 600 }, REUNION_HUG_MIN_SCORE - 0.01))
    expect(event).toMatchObject({
      forwardMemory: 'Saw Bob again after 10 hours apart.',
      reverseMemory: 'Saw Alice again after 10 hours apart.',
      notable: false
    })
    expect(event?.logMessage).toBeUndefined()
  })

  it('uses the longest absence of the two directions', () => {
    const event = evaluateReunion(context({ forward: 400, reverse: 900 }))
    expect(event?.forwardMemory).toContain('15 hours')
  })

  it('averages the two directions of the relationship', () => {
    const ctx = context({ forward: 600, reverse: 600 })
    ctx.forward = relationship(1)
    ctx.reverse = relationship(0)
    expect(evaluateReunion(ctx)?.notable).toBe(true)
  })
})

describe('evaluateRelationshipEvents', () => {
  it('runs every evaluator and drops the ones that return nothing', () => {
    const always: RelationshipEventEvaluator = () => ({
      type: 'test_event',
      forwardMemory: 'f',
      reverseMemory: 'r',
      notable: false
    })
    const never: RelationshipEventEvaluator = () => null
    const events = evaluateRelationshipEvents(context({ forward: 0, reverse: 0 }), [never, always, never])
    expect(events.map((e) => e.type)).toEqual(['test_event'])
  })

  it('defaults to the reunion evaluator', () => {
    expect(evaluateRelationshipEvents(context({ forward: 600, reverse: 600 }))).toHaveLength(1)
    expect(evaluateRelationshipEvents(context({ forward: 5, reverse: 5 }))).toHaveLength(0)
  })
})

describe('formatElapsedHours', () => {
  it('singularizes one hour and rounds the rest', () => {
    expect(formatElapsedHours(60)).toBe('1 hour')
    expect(formatElapsedHours(630)).toBe('11 hours')
  })
})
