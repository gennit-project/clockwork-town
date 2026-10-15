/**
 * Daily memory summary. Residents keep a lightweight tally of what they did today; at
 * midnight it becomes one long-term `daily_summary` memory and the day's short-term
 * memories are cleared. (The short-term list only holds the last ~20 actions, far too
 * little to summarize a 288-tick day, hence the tally.)
 */

import type { ActionName, CharacterState, DayTally, Intent } from '../types'

export const DAILY_SUMMARY_EVENT_TYPE = 'daily_summary'

export function createDayTally(): DayTally {
  return { actions: {}, places: {}, people: {} }
}

/** Count a completed action toward today. Idle time isn't worth remembering. */
export function recordActionInTally(
  state: Pick<CharacterState, 'dayTally'>,
  intent: Pick<Intent, 'action' | 'socialTargetName'>,
  placeName?: string | null
): void {
  if (intent.action === 'idle') return
  const tally = (state.dayTally ??= createDayTally())
  tally.actions[intent.action] = (tally.actions[intent.action] ?? 0) + 1
  if (placeName) tally.places[placeName] = (tally.places[placeName] ?? 0) + 1
  if (intent.socialTargetName) tally.people[intent.socialTargetName] = (tally.people[intent.socialTargetName] ?? 0) + 1
}

/** True when the local calendar date differs between two ISO timestamps. */
export function isNewDay(previousIso: string, currentIso: string): boolean {
  const a = new Date(previousIso)
  const b = new Date(currentIso)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false
  return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth() || a.getDate() !== b.getDate()
}

/** How each action reads in a summary; actions not listed are left out as unremarkable. */
const PHRASES: Partial<Record<ActionName, { verb: string; repeatable: boolean }>> = {
  work: { verb: 'worked', repeatable: false },
  sleep: { verb: 'slept', repeatable: false },
  eat: { verb: 'ate', repeatable: true },
  shower: { verb: 'showered', repeatable: true },
  medicate: { verb: 'took medicine', repeatable: true },
  chat_friend: { verb: 'chatted', repeatable: true },
  call_mom: { verb: 'called family', repeatable: true },
  date: { verb: 'went on a date', repeatable: true },
  text_romance: { verb: 'texted a sweetheart', repeatable: true },
  call_romance: { verb: 'called a sweetheart', repeatable: true },
  invite_over: { verb: 'had someone over', repeatable: true },
  propose_relationship: { verb: 'asked someone to be theirs', repeatable: true },
  read: { verb: 'read', repeatable: true },
  write: { verb: 'wrote', repeatable: true },
  view_art: { verb: 'looked at art', repeatable: true },
  view_movie: { verb: 'watched a movie', repeatable: true },
  volunteer: { verb: 'volunteered', repeatable: true },
  pet_animal: { verb: 'spent time with an animal', repeatable: true }
}

function times(count: number): string {
  if (count <= 1) return ''
  return count === 2 ? ' twice' : ` ${count} times`
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

const topKey = (counts: Record<string, number>): string | null =>
  Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null

/** A short templated recap of the day, or null if there's nothing worth remembering. */
export function summarizeDay(tally: DayTally | undefined, dayIso: string): string | null {
  if (!tally) return null

  const parts = Object.entries(tally.actions)
    .filter(([action]) => action in PHRASES)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([action, count]) => {
      const phrase = PHRASES[action as ActionName] as { verb: string; repeatable: boolean }
      return `${phrase.verb}${phrase.repeatable ? times(count) : ''}`
    })
  if (parts.length === 0) return null

  const heading = new Date(dayIso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const sentences = [`${heading}: ${joinList(parts)}.`]

  const place = topKey(tally.places)
  if (place) sentences.push(`Spent most of the day at ${place}.`)

  const people = Object.entries(tally.people)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([name]) => name)
  if (people.length > 0) sentences.push(`Spent time with ${joinList(people)}.`)

  return sentences.join(' ')
}

export interface DailySummaryDependencies {
  createStructuredCharacterLongTermMemory: (input: {
    characterId: string
    content: string
    eventType?: string
    createdAt?: string
  }) => Promise<void>
}

/**
 * Turn each resident's tally into a long-term memory dated to the day that just ended,
 * then reset their tally and short-term memories. Returns how many summaries were written.
 */
export async function recordDailySummaries({
  states,
  previousIso,
  dependencies
}: {
  states: Record<string, CharacterState>
  previousIso: string
  dependencies: DailySummaryDependencies
}): Promise<number> {
  let written = 0
  for (const [characterId, state] of Object.entries(states)) {
    const content = summarizeDay(state.dayTally, previousIso)
    if (content) {
      await dependencies.createStructuredCharacterLongTermMemory({
        characterId,
        content,
        eventType: DAILY_SUMMARY_EVENT_TYPE,
        createdAt: previousIso
      })
      written += 1
    }
    state.dayTally = createDayTally()
    state.memories = []
  }
  return written
}
