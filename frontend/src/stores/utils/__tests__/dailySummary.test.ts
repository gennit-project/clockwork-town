import { describe, expect, it, vi } from 'vitest'
import { createMockCharacterState } from '../../__tests__/mockData'
import {
  createDayTally,
  DAILY_SUMMARY_EVENT_TYPE,
  isNewDay,
  recordActionInTally,
  recordDailySummaries,
  summarizeDay
} from '../dailySummary'
import type { CharacterState, DayTally } from '../../types'

// Mon Apr 6 2026
const DAY = '2026-04-06T15:00:00.000Z'

const tally = (over: Partial<DayTally> = {}): DayTally => ({ ...createDayTally(), ...over })

describe('recordActionInTally', () => {
  it('counts actions, places and people, and ignores idle', () => {
    const state: Pick<CharacterState, 'dayTally'> = {}
    recordActionInTally(state, { action: 'eat' }, 'Home')
    recordActionInTally(state, { action: 'eat' }, 'Home')
    recordActionInTally(state, { action: 'chat_friend', socialTargetName: 'Bob' }, 'Library')
    recordActionInTally(state, { action: 'idle' }, 'Home')
    expect(state.dayTally).toEqual({
      actions: { eat: 2, chat_friend: 1 },
      places: { Home: 2, Library: 1 },
      people: { Bob: 1 }
    })
  })

  it('does not create a tally for idle alone', () => {
    const state: Pick<CharacterState, 'dayTally'> = {}
    recordActionInTally(state, { action: 'idle' })
    expect(state.dayTally).toBeUndefined()
  })
})

describe('isNewDay', () => {
  it('is false within a day and true across midnight, month and year boundaries', () => {
    expect(isNewDay('2026-04-06T08:00:00.000Z', '2026-04-06T23:59:00.000Z')).toBe(false)
    expect(isNewDay('2026-04-06T23:57:00.000Z', '2026-04-07T00:02:00.000Z')).toBe(true)
    expect(isNewDay('2026-04-30T23:57:00.000Z', '2026-05-01T00:02:00.000Z')).toBe(true)
    expect(isNewDay('2026-12-31T23:57:00.000Z', '2027-01-01T00:02:00.000Z')).toBe(true)
  })

  it('is false for unparseable timestamps', () => {
    expect(isNewDay('nope', '2026-04-06T00:00:00.000Z')).toBe(false)
  })
})

describe('summarizeDay', () => {
  it('returns null with no tally or nothing remarkable', () => {
    expect(summarizeDay(undefined, DAY)).toBeNull()
    expect(summarizeDay(tally(), DAY)).toBeNull()
    expect(summarizeDay(tally({ actions: { use_toilet: 5 } }), DAY)).toBeNull()
  })

  it('writes a dated recap, most frequent first, with counts only for repeatable actions', () => {
    const text = summarizeDay(
      tally({
        actions: { work: 96, eat: 3, chat_friend: 2, read: 1, use_toilet: 4 },
        places: { Clinic: 100, Home: 6 },
        people: { Elena: 2, Tom: 1 }
      }),
      DAY
    )
    expect(text).toBe(
      'Monday, Apr 6: worked, ate 3 times, chatted twice and read. Spent most of the day at Clinic. Spent time with Elena and Tom.'
    )
  })

  it('handles a single remarkable action and caps people at three', () => {
    expect(summarizeDay(tally({ actions: { sleep: 1 } }), DAY)).toBe('Monday, Apr 6: slept.')
    const text = summarizeDay(
      tally({ actions: { chat_friend: 1 }, people: { A: 4, B: 3, C: 2, D: 1 } }),
      DAY
    ) as string
    expect(text).toContain('Spent time with A, B and C.')
    expect(text).not.toContain('D')
  })

  it('breaks ties alphabetically so output is deterministic', () => {
    const text = summarizeDay(tally({ actions: { read: 1, write: 1 } }), DAY)
    expect(text).toBe('Monday, Apr 6: read and wrote.')
  })
})

describe('recordDailySummaries', () => {
  it('writes a memory only for residents with something to say, then resets everyone', async () => {
    const busy = createMockCharacterState({
      name: 'Busy',
      dayTally: tally({ actions: { eat: 1 } }),
      memories: [{ tick: 1, action: 'eat', item: 'Fridge', location: 'Kitchen', utility: 1 }]
    })
    const quiet = createMockCharacterState({ name: 'Quiet', dayTally: tally({ actions: { use_toilet: 2 } }) })
    const createMemory = vi.fn(async () => {})

    const written = await recordDailySummaries({
      states: { busy, quiet },
      previousIso: DAY,
      dependencies: { createStructuredCharacterLongTermMemory: createMemory }
    })

    expect(written).toBe(1)
    expect(createMemory).toHaveBeenCalledTimes(1)
    expect(createMemory).toHaveBeenCalledWith({
      characterId: 'busy',
      content: 'Monday, Apr 6: ate.',
      eventType: DAILY_SUMMARY_EVENT_TYPE,
      createdAt: DAY
    })
    for (const state of [busy, quiet]) {
      expect(state.dayTally).toEqual({ actions: {}, places: {}, people: {} })
      expect(state.memories).toEqual([])
    }
  })
})
