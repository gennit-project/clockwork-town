import { describe, expect, it } from 'vitest'
import { createMockCharacterState, mockConsole } from '../../__tests__/mockData'
import { RELATIONSHIP_DECAY } from '../../config/social'
import { decayCharacterRelationships } from '../relationshipRuntime'
import type { CharacterRelationship, CharacterState } from '../../types'

mockConsole()

const persisted: CharacterRelationship[] = []
const dependencies = {
  persistCharacterRelationship: async (input: Record<string, unknown>) => {
    const relationship = {
      ...(input as unknown as CharacterRelationship),
      id: String(input.id ?? `${input.fromCharacterId}-${input.toCharacterId}`)
    }
    persisted.push(relationship)
    return relationship
  },
  createStructuredCharacterLongTermMemory: async () => {}
}

const rel = (toCharacterId: string, labels: string[]): CharacterRelationship => ({
  id: `r-${toCharacterId}`,
  fromCharacterId: 'me',
  toCharacterId,
  shortTermScore: 0.9,
  longTermScore: 0.8,
  labels,
  isDeceasedTarget: false
})

describe('relationship decay', () => {
  it('a friendship thins slowly (weeks, not hours), a family bond slower still, short-term mood fast', async () => {
    const me: CharacterState = createMockCharacterState({ relationships: [rel('pal', ['friend']), rel('mum', ['mother'])] })
    const others = { pal: createMockCharacterState(), mum: createMockCharacterState() }
    const day = (24 * 60) / 5
    for (let i = 0; i < day; i++) await decayCharacterRelationships({ characterState: me, otherStates: others, dependencies })
    const pal = me.relationships!.find((r) => r.toCharacterId === 'pal')!
    const mum = me.relationships!.find((r) => r.toCharacterId === 'mum')!

    // A whole day with no contact costs a friend under a tenth of a point of long-term bond.
    expect(0.8 - pal.longTermScore).toBeGreaterThan(0)
    expect(0.8 - pal.longTermScore).toBeLessThan(0.1)
    // Family fade at the bonded fraction of that rate.
    expect(0.8 - mum.longTermScore).toBeCloseTo((0.8 - pal.longTermScore) * RELATIONSHIP_DECAY.bondedMultiplier, 1)
    expect(mum.longTermScore).toBeGreaterThan(pal.longTermScore)
    // The short-term feeling is a mood: gone within a day.
    expect(pal.shortTermScore).toBe(0)
  })

  it('housemates count as bonded even with no family label', async () => {
    const me = createMockCharacterState({ householdId: 'h', relationships: [rel('flat', ['friend'])] })
    const stranger = createMockCharacterState({ relationships: [rel('pal', ['friend'])] })
    for (let i = 0; i < 100; i++) {
      await decayCharacterRelationships({ characterState: me, otherStates: { flat: createMockCharacterState({ householdId: 'h' }) }, dependencies })
      await decayCharacterRelationships({ characterState: stranger, otherStates: { pal: createMockCharacterState() }, dependencies })
    }
    expect(me.relationships![0].longTermScore).toBeGreaterThan(stranger.relationships![0].longTermScore)
  })
})
