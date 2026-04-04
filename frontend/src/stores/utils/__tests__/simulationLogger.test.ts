import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createSimulationLogger } from '../simulationLogger'

describe('simulationLogger', () => {
  it('appends and trims activity log entries', () => {
    const logger = createSimulationLogger({
      currentTick: ref(3),
      activityLog: ref([])
    })

    for (let index = 0; index < 101; index += 1) {
      logger.addActivityEntry(`char-${index}`, 'read', `details-${index}`)
    }

    expect(logger).toBeTruthy()
    expect(logger.addActivityEntry).toBeTypeOf('function')
  })

  it('logs activity entries with timestamped records', () => {
    const activityLog = ref<any[]>([])
    const logger = createSimulationLogger({
      currentTick: ref(7),
      activityLog
    })

    logger.logActivity('char-1', 'sleep', 'using Bed')

    expect(activityLog.value).toHaveLength(1)
    expect(activityLog.value[0]).toMatchObject({
      tick: 7,
      characterId: 'char-1',
      action: 'sleep',
      details: 'using Bed'
    })
  })

  it('routes warnings and errors to console helpers', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createSimulationLogger({
      currentTick: ref(1),
      activityLog: ref([])
    })

    logger.warn('warned')
    logger.error('errored')

    expect(warnSpy).toHaveBeenCalledWith('warned')
    expect(errorSpy).toHaveBeenCalledWith('errored')

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
