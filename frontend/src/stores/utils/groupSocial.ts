/**
 * Helpers for group social situations: who is in a group, and how to describe it.
 * A group chat is one primary partner (`socialTargetId`) plus up to two extras.
 */

import { GROUP_CAPABLE_ACTIONS, GROUP_FUN_ACTIONS } from '../config/social'
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

export function isGroupFunAction(action: ActionName): boolean {
  return (GROUP_FUN_ACTIONS as readonly ActionName[]).includes(action)
}

/** Only these actions may include extra people. A date is never one of them. */
export function isGroupCapableAction(action: ActionName): boolean {
  return (GROUP_CAPABLE_ACTIONS as readonly ActionName[]).includes(action)
}

/** Actions that always need another person to say yes. */
const ALWAYS_INVITATION_ACTIONS = new Set<ActionName>(['chat_friend', 'date', 'invite_over', 'propose_relationship'])

/**
 * Whether carrying out this intent means inviting someone. Chats, dates and invitations always
 * do. A fun activity only does when it was planned *with* people (strategy `view_movie:group` or
 * `view_movie:with-participant`): the same action as a solo hobby, or as the follow-up to being
 * invited over, involves no new invitation.
 */
export function requiresInvitation(intent: Pick<Intent, 'action' | 'strategy'>): boolean {
  if (ALWAYS_INVITATION_ACTIONS.has(intent.action)) return true
  return (
    isGroupFunAction(intent.action) &&
    (intent.strategy === `${intent.action}:with-participant` || intent.strategy === `${intent.action}:group`)
  )
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
  // Fun done together reads "the TV with Bo and Cy" ("watching the TV with Bo and Cy").
  if (isGroupFunAction(intent.action)) {
    const names = socialParticipantNames(intent)
    if (names.length > 0) {
      const what = intent.itemName ?? (intent.action === 'view_movie' ? 'a movie' : 'art')
      return `${what} with ${joinNames(names)}`
    }
  }
  return intent.itemName || intent.socialTargetName || intent.animalTargetName || null
}
