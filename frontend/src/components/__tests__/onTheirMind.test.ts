import { describe, expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'
import OnTheirMind from '../OnTheirMind.vue'
import type { Grievance } from '../../stores/types'

function mountList(props: Record<string, unknown>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp(OnTheirMind as never, props)
  app.component('RouterLink', { props: ['to'], template: '<a :href="to"><slot /></a>' })
  app.mount(container)
  return { container, unmount: () => { app.unmount(); container.remove() } }
}

const grievance = (over: Partial<Grievance> = {}): Grievance => ({
  id: 'p1:daytime-napping',
  aboutCharacterId: 'p1',
  aboutName: 'Ravi Lin',
  topicId: 'daytime-napping',
  summary: 'napping in the daytime',
  ticksRemaining: 288 + 12 * 4,
  times: 1,
  ...over
})

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

describe('OnTheirMind', () => {
  it('lists who and what, and how long until it fades', async () => {
    const { container, unmount } = mountList({ grievances: [grievance()] })
    await nextTick()
    expect(text(container)).toContain('Ravi Lin')
    expect(text(container)).toContain('napping in the daytime')
    expect(text(container)).toContain('fades in 1d 4h')
    unmount()
  })

  it('says how many times when it has happened more than once, and not otherwise', async () => {
    const { container, unmount } = mountList({ grievances: [grievance({ times: 3 }), grievance({ id: 'x', aboutName: 'Sam', times: 1 })] })
    await nextTick()
    const rows = [...container.querySelectorAll('li')].map((li) => text(li))
    expect(rows[0]).toContain('seen 3 times')
    expect(rows[1]).not.toContain('seen')
    unmount()
  })

  it('links to the person when their page is known, and shows plain text when not', async () => {
    const linked = mountList({ grievances: [grievance()], residentLink: (id: string) => `/character/${id}` })
    await nextTick()
    expect(linked.container.querySelector('a')?.getAttribute('href')).toBe('/character/p1')
    linked.unmount()

    const plain = mountList({ grievances: [grievance()] })
    await nextTick()
    expect(plain.container.querySelector('a')).toBeNull()
    expect(text(plain.container)).toContain('Ravi Lin')
    plain.unmount()
  })
})
