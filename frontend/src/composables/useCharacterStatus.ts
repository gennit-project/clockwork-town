import type { CharacterState } from '../stores/types'

const ACTION_VERBS: Record<string, string> = {
  eat: 'eating',
  sleep: 'sleeping',
  use_toilet: 'using the toilet',
  shower: 'showering',
  medicate: 'taking medicine',
  chat_friend: 'chatting',
  call_mom: 'calling Mom',
  date: 'going on a date',
  text_romance: 'texting',
  call_romance: 'calling',
  invite_over: 'inviting someone over',
  read: 'reading',
  write: 'writing',
  view_art: 'looking at',
  volunteer: 'volunteering',
  work: 'working',
  idle: 'idle'
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getCharacterStatusText(state: CharacterState | null | undefined): string {
  if (!state) {
    return 'Idle'
  }

  const activeAction = state.currentTask?.action || state.currentAction || 'idle'

  if (activeAction === 'idle') {
    return 'Idle'
  }

  const targetName = state.currentTask?.itemName || state.currentTask?.socialTargetName || state.currentActivity?.itemId || null
  const verb = ACTION_VERBS[activeAction] || formatAction(activeAction)

  if (targetName) {
    if (activeAction === 'sleep') {
      return `${verb} on ${targetName}`
    }

    if (activeAction === 'date' || activeAction === 'chat_friend' || activeAction === 'text_romance' || activeAction === 'call_romance' || activeAction === 'invite_over') {
      return `${verb} with ${targetName}`
    }

    if (activeAction === 'view_art') {
      return `${verb} ${targetName}`
    }

    return `${verb} at ${targetName}`
  }

  return verb.charAt(0).toUpperCase() + verb.slice(1)
}

export function getCharacterStatusMeta(state: CharacterState | null | undefined): { summary: string; location: string } {
  const summary = getCharacterStatusText(state)
  const location = state?.location?.spaceName && state?.location?.lotName
    ? `${state.location.lotName} -> ${state.location.spaceName}`
    : state?.location?.lotName || 'Unknown location'

  return { summary, location }
}
