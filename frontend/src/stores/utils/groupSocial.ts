/**
 * Helpers for group social situations: who is in a group, and how to describe it.
 * A group chat is one primary partner (`socialTargetId`) plus up to two extras.
 */

import type { ActionName, Intent } from '../types'

const SOCIAL_ACTIONS = new Set<ActionName>([
  'chat_friend',
  'date',
  'text_romance',
  'call_romance',
  'invite_over',
  'propose_relationship'
])

export function isSocialAction(action: ActionName): boolean {
  return SOCIAL_ACTIONS.has(action)
}

/** Everyone the intent's owner is with, other than themselves: primary partner first, then extras. */
export function socialParticipantIds(intent: Pick<Intent, 'socialTargetId' | 'groupTargetIds'>): string[] {
  return [...(intent.socialTargetId ? [intent.socialTargetId] : []), ...(intent.groupTargetIds ?? [])]
}

export function socialParticipantNames(intent: Pick<Intent, 'socialTargetName' | 'groupTargetNames'>): string[] {
  return [...(intent.socialTargetName ? [intent.socialTargetName] : []), ...(intent.groupTargetNames ?? [])]
}

/** "A", "A and B", "A, B and C" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * What the current action is aimed at, for status text. Social actions are aimed at people
 * (the whole group), everything else at an item or a pet.
 */
export function describeActionTarget(
  intent: Pick<Intent, 'action' | 'itemName' | 'socialTargetName' | 'groupTargetNames' | 'animalTargetName'>
): string | null {
  if (isSocialAction(intent.action)) {
    const names = socialParticipantNames(intent)
    if (names.length > 0) return joinNames(names)
  }
  return intent.itemName || intent.socialTargetName || intent.animalTargetName || null
}
