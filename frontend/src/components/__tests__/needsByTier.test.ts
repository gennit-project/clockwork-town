import { describe, expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'
import NeedsByTier from '../NeedsByTier.vue'
import { createMockNeeds } from '../../stores/__tests__/mockData'
import { VALUE_DEFS, valueWindowTicks } from '../../stores/config/valueDefs'
import type { CharacterState } from '../../stores/types'

type CardState = Pick<CharacterState, 'needs' | 'traitIds' | 'traits' | 'values'>

function mountCard(state: CardState, editLink: string | null = '/edit') {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp(NeedsByTier as never, { state, editLink })
  // The card links to the editor; a plain anchor stands in for the router here.
  app.component('RouterLink', { props: ['to'], template: '<a :href="to"><slot /></a>' })
  app.mount(container)
  return {
    container,
    unmount() {
      app.unmount()
      container.remove()
    }
  }
}

const baseState = (over: Partial<CardState> = {}): CardState => ({
  needs: createMockNeeds(),
  traitIds: [],
  traits: [],
  values: [
    { id: 'value-read-books', name: 'Read books', ticksSinceFulfilled: 0 },
    { id: 'value-be-a-good-friend', name: 'Be a good friend', ticksSinceFulfilled: 0 }
  ],
  ...over
})

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

describe('NeedsByTier', () => {
  it('divides the needs into Basics, Emotions and Fulfillment, in that order', async () => {
    const { container, unmount } = mountCard(baseState())
    await nextTick()

    const headings = [...container.querySelectorAll('h4')].map((h) => text(h))
    expect(headings).toEqual(['Basics', 'Emotions', 'Fulfillment'])

    const [basics, emotions, fulfillment] = [...container.querySelectorAll('section')]
    for (const label of ['Food', 'Sleep', 'Bladder', 'Hygiene', 'Health']) expect(text(basics)).toContain(label)
    for (const label of ['Friends', 'Family', 'Romance']) expect(text(emotions)).toContain(label)
    expect(text(fulfillment)).toContain('Fulfillment')
    unmount()
  })

  it('puts the values directly under the fulfillment bar, and nowhere else', async () => {
    const { container, unmount } = mountCard(baseState())
    await nextTick()

    const [basics, emotions, fulfillment] = [...container.querySelectorAll('section')]
    expect(basics.querySelector('[data-testid="values-under-fulfillment"]')).toBeNull()
    expect(emotions.querySelector('[data-testid="values-under-fulfillment"]')).toBeNull()

    const values = fulfillment.querySelector('[data-testid="values-under-fulfillment"]') as Element
    expect(values).not.toBeNull()
    expect(text(values)).toContain('Read books')
    expect(text(values)).toContain('Be a good friend')

    // Document order: the fulfillment need bar comes before its values.
    const fulfillmentBar = [...fulfillment.querySelectorAll('button')].find((b) => text(b).includes('Fulfillment')) as Element
    expect(fulfillmentBar.compareDocumentPosition(values) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    unmount()
  })

  it('shows values in rank order with their rank numbers', async () => {
    const { container, unmount } = mountCard(baseState())
    await nextTick()
    const rows = [...container.querySelectorAll('[data-testid="values-under-fulfillment"] li')].map((li) => text(li))
    expect(rows[0]).toMatch(/^1\s*Read books/)
    expect(rows[1]).toMatch(/^2\s*Be a good friend/)
    unmount()
  })

  it('flags a neglected value', async () => {
    const neglected = valueWindowTicks(VALUE_DEFS['value-read-books'])
    const { container, unmount } = mountCard(
      baseState({ values: [{ id: 'value-read-books', name: 'Read books', ticksSinceFulfilled: neglected }] })
    )
    await nextTick()
    expect(text(container.querySelector('[data-testid="values-under-fulfillment"] li'))).toContain('neglected')
    unmount()
  })

  it('with no values, asks the player to add some, with a link to the editor', async () => {
    const { container, unmount } = mountCard(baseState({ values: [] }), '/world/w/region/r/character/c/edit')
    await nextTick()
    const block = container.querySelector('[data-testid="values-under-fulfillment"]') as Element
    expect(text(block)).toContain('No values yet')
    const link = block.querySelector('a') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/world/w/region/r/character/c/edit')
    unmount()
  })

  it('greys out a need switched off by a trait, with the reason as a tooltip', async () => {
    const { container, unmount } = mountCard(
      baseState({ traitIds: ['trait-asexual'], traits: ['Asexual'] })
    )
    await nextTick()
    const romance = [...container.querySelectorAll('button')].find((b) => text(b).includes('Romance')) as HTMLElement
    expect(text(romance)).toContain('off')
    expect(romance.getAttribute('title')).toBe('disabled because of trait: Asexual')
    const food = [...container.querySelectorAll('button')].find((b) => text(b).includes('Food')) as HTMLElement
    expect(text(food)).not.toContain('off')
    unmount()
  })

  it('shows each need as a percentage', async () => {
    const { container, unmount } = mountCard(baseState({ needs: createMockNeeds({ food: 0.42 }) }))
    await nextTick()
    const food = [...container.querySelectorAll('button')].find((b) => text(b).includes('Food')) as HTMLElement
    expect(text(food)).toContain('42%')
    unmount()
  })
})
