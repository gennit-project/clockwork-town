import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  createMockCharacterState,
  createMockItemOccupancy,
  createMockNeeds,
  createMockWorldData,
  mockConsole
} from '../../__tests__/mockData'
import type { ActivityLogEntry, CharacterState, Intent } from '../../types'

mockConsole()

// A's only idea is to chat with B; B always has something much better to do. Decision-making is
// stubbed so the fall-through to idle is deterministic.
const decide = vi.hoisted(() => ({ aKeepsAsking: true }))

vi.mock('../decisionMaking', () => ({
  selectBestIntent: ({ characterId }: { characterId: string }) => {
    if (characterId === 'a' && decide.aKeepsAsking) {
      return { action: 'chat_friend', utility: 1, socialTargetId: 'b', socialTargetName: 'B', itemId: 'item-1', itemName: 'Couch', travelCost: 0 }
    }
    if (characterId === 'b') return { action: 'sleep', utility: 99 }
    return { action: 'idle', utility: 0 }
  }
}))

import { executeTick, type ExecuteTickParams } from '../tickExecution'

describe('idle after declines', () => {
  it('names who turned the resident down and why', async () => {
    const states: Record<string, CharacterState> = {
      a: createMockCharacterState({ name: 'A' }),
      b: createMockCharacterState({ name: 'B', needs: createMockNeeds({ sleep: 0.04 }) })
    }
    const executeAction = vi.fn(async (_id: string, _intent: Intent) => {})
    const params: ExecuteTickParams = {
      currentTick: ref(0),
      characterStates: ref(states),
      worldData: ref(createMockWorldData()),
      itemOccupancy: ref(createMockItemOccupancy()),
      activityLog: ref<ActivityLogEntry[]>([]),
      executeAction,
      progressTask: vi.fn(async () => false)
    }
    await executeTick(params)
    const intent = executeAction.mock.calls.find(([id]) => id === 'a')?.[1] as Intent
    expect(intent.action).toBe('idle')
    expect(intent.cause?.kind).toBe('idle')
    expect(intent.cause?.summary).toBe('A had plans but B turned them down')
    expect(intent.cause?.factors.some((f) => f.label === 'B declined chat_friend' && f.value === 'B had no way to reach the meeting place')).toBe(true)
  })
})
