import { describe, expect, it } from 'vitest'
import { createMockCharacterState, createMockNeeds, createMockWorldData, mockConsole } from '../../__tests__/mockData'
import { SCHEDULE_BREAK } from '../../config/needs'
import { createSimulationDateTime } from '../simulationCalendar'
import { buildScheduleIntent } from '../workSchedule'
import type { CharacterState } from '../../types'

mockConsole()

// 2026-04-06 is a Monday; the tests run in UTC.
const monday = createSimulationDateTime(new Date('2026-04-06T10:00:00.000Z'))
const atWork = (needs: Partial<CharacterState['needs']>): CharacterState =>
  createMockCharacterState({
    needs: createMockNeeds(needs),
    workSchedule: [{ day: 'Monday', start: '09:00', end: '17:00', activity: 'work', locationLotId: 'lot-2', locationLotName: 'Community Center' }]
  })

const intent = (state: CharacterState) => buildScheduleIntent({ characterState: state, simulationDateTime: monday, worldData: createMockWorldData() })

describe('a critical basic need pre-empts the schedule', () => {
  it('control: with needs met the shift sends them to work', () => {
    expect(intent(atWork({}))?.action).toBe('work')
  })

  it('each listed need, when critical, hands the decision back to the planner', () => {
    for (const need of SCHEDULE_BREAK.needs) {
      expect(intent(atWork({ [need]: SCHEDULE_BREAK.criticalBelow - 0.01 })), need).toBeNull()
      expect(intent(atWork({ [need]: SCHEDULE_BREAK.criticalBelow }))?.action, `${need} at the line`).toBe('work')
    }
  })

  it('a low higher-tier need does not (nor does sleep: a sleep shift is how that need is met)', () => {
    expect(intent(atWork({ friends: 0, fulfillment: 0, sleep: 0 }))?.action).toBe('work')
  })
})
