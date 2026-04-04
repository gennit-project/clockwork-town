import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, nextTick, reactive } from 'vue'
import CharacterBioTab from '../CharacterBioTab.vue'
import CharacterMemoriesTab from '../CharacterMemoriesTab.vue'
import CharacterNeedPicker from '../CharacterNeedPicker.vue'
import { useSimulationStore } from '../../stores/simulation'
import type { LongTermMemory } from '../../stores/types'

const persistenceMocks = vi.hoisted(() => ({
  moveCharacterToLot: vi.fn(async () => {}),
  startCharacterActivity: vi.fn(async () => {}),
  fetchCharacterDetails: vi.fn<(characterId: string) => Promise<{ character: { longTermMemories: LongTermMemory[] } }>>(async () => ({ character: { longTermMemories: [] } })),
  persistCharacterBio: vi.fn(async () => {}),
  createCharacterLongTermMemory: vi.fn(async () => {}),
  updateCharacterLongTermMemory: vi.fn(async () => {}),
  deleteCharacterLongTermMemory: vi.fn(async () => {})
}))

vi.mock('../../stores/simulationPersistence', () => persistenceMocks)

function mountComponent(component: unknown, props: Record<string, unknown>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp(component as never, props)
  const pinia = createPinia()
  setActivePinia(pinia)
  app.use(pinia)
  app.mount(container)

  return {
    container,
    unmount() {
      app.unmount()
      container.remove()
    }
  }
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find(
    (entry) => entry.textContent?.trim() === text
  )

  if (!button) {
    throw new Error(`Button not found: ${text}`)
  }

  return button as HTMLButtonElement
}

async function flushAsyncWork() {
  await Promise.resolve()
  await nextTick()
}

describe('character panel components', () => {
  beforeEach(() => {
    persistenceMocks.fetchCharacterDetails.mockReset()
    persistenceMocks.persistCharacterBio.mockClear()
    persistenceMocks.createCharacterLongTermMemory.mockClear()
    persistenceMocks.updateCharacterLongTermMemory.mockClear()
    persistenceMocks.deleteCharacterLongTermMemory.mockClear()
    persistenceMocks.fetchCharacterDetails.mockResolvedValue({ character: { longTermMemories: [] } })
    document.body.innerHTML = ''
  })

  it('CharacterNeedPicker emits close and select events', async () => {
    const onClose = vi.fn()
    const onSelect = vi.fn()
    const { container, unmount } = mountComponent(CharacterNeedPicker, {
      visible: true,
      selectedNeed: 'sleep',
      options: [{ label: 'Use Bed', intent: { action: 'sleep' } }],
      onClose,
      onSelect
    })

    findButtonByText(container, 'Use Bed').click()
    findButtonByText(container, 'Close').click()
    await nextTick()

    expect(onSelect).toHaveBeenCalledWith({ action: 'sleep' })
    expect(onClose).toHaveBeenCalled()
    unmount()
  })

  it('CharacterBioTab saves edited bio through the character panel store', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const simulationStore = useSimulationStore()
    simulationStore.initializeCharacter({ id: 'char-1', name: 'Alice', traits: ['curious'] })
    simulationStore.updateCharacterLocation('char-1', 'region-1', 'lot-1', 'Home', 'space-1', 'Bedroom')

    const character = reactive({
      id: 'char-1',
      age: 30,
      bio: 'Old bio',
      traits: ['curious']
    })

    const container = document.createElement('div')
    document.body.appendChild(container)
    const app = createApp(CharacterBioTab, {
      character,
      characterState: simulationStore.characterStates['char-1'],
      formatAction: (value: string) => value
    })
    app.use(pinia)
    app.mount(container)

    findButtonByText(container, 'Edit Bio').click()
    await nextTick()

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    textarea.value = 'Updated bio'
    textarea.dispatchEvent(new Event('input'))
    await nextTick()

    findButtonByText(container, 'Save Bio').click()
    await flushAsyncWork()

    expect(persistenceMocks.persistCharacterBio).toHaveBeenCalledWith('char-1', 'Updated bio')

    app.unmount()
    container.remove()
  })

  it('CharacterMemoriesTab adds, edits, and deletes memories through the panel store', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const simulationStore = useSimulationStore()
    simulationStore.initializeCharacter({ id: 'char-1', name: 'Alice' })
    simulationStore.characterStates['char-1'].longTermMemories = [
      { id: 'mem-1', content: 'Original', createdAt: '2026-01-01' }
    ]

    persistenceMocks.fetchCharacterDetails
      .mockResolvedValueOnce({
        character: {
          longTermMemories: [{ id: 'mem-2', content: 'Created', createdAt: '2026-01-02' }]
        }
      })
      .mockResolvedValueOnce({
        character: {
          longTermMemories: [{ id: 'mem-2', content: 'Updated', createdAt: '2026-01-02' }]
        }
      })
      .mockResolvedValueOnce({
        character: {
          longTermMemories: []
        }
      })

    const container = document.createElement('div')
    document.body.appendChild(container)
    const app = createApp(CharacterMemoriesTab, {
      characterId: 'char-1',
      characterState: simulationStore.characterStates['char-1']
    })
    app.use(pinia)
    app.mount(container)

    let textarea = container.querySelector('textarea') as HTMLTextAreaElement
    textarea.value = 'Created'
    textarea.dispatchEvent(new Event('input'))
    await nextTick()

    findButtonByText(container, 'Add Memory').click()
    await flushAsyncWork()
    expect(persistenceMocks.createCharacterLongTermMemory).toHaveBeenCalledWith('char-1', 'Created')
    expect(simulationStore.characterStates['char-1'].longTermMemories?.[0]?.content).toBe('Created')

    findButtonByText(container, 'Edit').click()
    await nextTick()

    const textareas = container.querySelectorAll('textarea')
    const editTextarea = textareas[textareas.length - 1] as HTMLTextAreaElement
    editTextarea.value = 'Updated'
    editTextarea.dispatchEvent(new Event('input'))
    await nextTick()

    findButtonByText(container, 'Save').click()
    await flushAsyncWork()
    expect(persistenceMocks.updateCharacterLongTermMemory).toHaveBeenCalledWith('mem-2', 'Updated')
    expect(simulationStore.characterStates['char-1'].longTermMemories?.[0]?.content).toBe('Updated')

    findButtonByText(container, 'Delete').click()
    await flushAsyncWork()
    expect(persistenceMocks.deleteCharacterLongTermMemory).toHaveBeenCalledWith('mem-2')
    expect(simulationStore.characterStates['char-1'].longTermMemories).toEqual([])

    app.unmount()
    container.remove()
  })
})
