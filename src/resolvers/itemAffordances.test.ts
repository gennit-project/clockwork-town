import { describe, expect, it } from 'vitest'
import { decodeAffordances, encodeAffordances } from './itemAffordances'

describe('itemAffordances', () => {
  it('encodes affordances into legacy storage fields', () => {
    expect(encodeAffordances([
      { action: 'sleep', weight: 2 },
      { action: 'read', weight: 1.5 }
    ])).toEqual({
      allowedActivities: ['sleep', 'read'],
      satisfiesNeeds: ['sleep:2', 'read:1.5']
    })
  })

  it('decodes weighted affordances from satisfiesNeeds', () => {
    expect(decodeAffordances({
      allowedActivities: ['sleep'],
      satisfiesNeeds: ['sleep:2', 'read:1.5']
    })).toEqual([
      { action: 'sleep', weight: 2 },
      { action: 'read', weight: 1.5 }
    ])
  })

  it('falls back to allowedActivities when weighted data is missing', () => {
    expect(decodeAffordances({
      allowedActivities: ['eat', 'sleep']
    })).toEqual([
      { action: 'eat', weight: 1 },
      { action: 'sleep', weight: 1 }
    ])
  })

  it('ignores malformed weighted entries', () => {
    expect(decodeAffordances({
      satisfiesNeeds: ['sleep:2', 'broken', 'read:nope']
    })).toEqual([
      { action: 'sleep', weight: 2 }
    ])
  })
})
