import type { ActionName, CharacterState } from '../stores/types'

const ACTION_VERBS: Record<ActionName, string> = {
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
  propose_relationship: 'having a commitment talk',
  read: 'reading',
  write: 'writing',
  view_art: 'looking at',
  view_movie: 'watching',
  volunteer: 'volunteering',
  pet_animal: 'spending time with a pet',
  work: 'working',
  snap: 'snapping at someone',
  belittle: 'belittling someone',
  argue: 'arguing',
  idle: 'idle'
}

/** What to say when an action has a verb that needs an object but we don't know the target. */
const BARE_ACTION_TEXT: Partial<Record<ActionName, string>> = {
  view_art: 'looking at art',
  view_movie: 'watching a movie'
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

  const targetName =
    state.currentTask?.itemName ||
    state.currentTask?.socialTargetName ||
    state.currentTask?.steps?.[state.currentTask.currentStepIndex]?.animalTargetName ||
    state.currentTargetName ||
    null
  const verb = ACTION_VERBS[activeAction] || formatAction(activeAction)

  if (targetName) {
    if (activeAction === 'sleep') {
      return `${verb} on ${targetName}`
    }

    if (activeAction === 'date' || activeAction === 'chat_friend' || activeAction === 'text_romance' || activeAction === 'call_romance' || activeAction === 'invite_over' || activeAction === 'propose_relationship') {
      return `${verb} with ${targetName}`
    }

    if (activeAction === 'view_art' || activeAction === 'view_movie') {
      return `${verb} ${targetName}`
    }

    if (activeAction === 'pet_animal') {
      return `${verb.replace(' a pet', '')} ${targetName}`
    }

    return `${verb} at ${targetName}`
  }

  const bare = BARE_ACTION_TEXT[activeAction] ?? verb
  return bare.charAt(0).toUpperCase() + bare.slice(1)
}

export function getCharacterStatusMeta(state: CharacterState | null | undefined): { summary: string; location: string } {
  const summary = getCharacterStatusText(state)
  const location = state?.location?.spaceName && state?.location?.lotName
    ? `${state.location.lotName} -> ${state.location.spaceName}`
    : state?.location?.lotName || 'Unknown location'

  return { summary, location }
}
