/**
 * Witness reactions: residents react to what they see other residents doing, according to what
 * they approve or disapprove of (see config/approvalTopics.ts). This file is the pure part:
 * who reacted to what, and the grievance and cooldown state. Applying a reaction (relationship
 * change, memory, notification) happens in the simulation runtime.
 */

import { APPROVAL_TOPICS, WITNESS_TUNING, getApprovalTopic, type ApprovalTopic } from '../config/approvalTopics'
import type { Cause, CharacterState, Grievance, SimulationDateTime, StanceValue } from '../types'

export interface WitnessReaction {
  witnessId: string
  actorId: string
  topic: ApprovalTopic
  stance: Exclude<StanceValue, 'neutral'>
}

export const cooldownKey = (actorId: string, topicId: string) => `${actorId}:${topicId}`

/**
 * Every (witness, actor, topic) reaction happening this tick: the actor is doing something that
 * matches a topic, and another awake resident on the same lot holds a stance on it and hasn't
 * just reacted to the same thing. A resident never reacts to themselves.
 */
export function detectWitnessReactions({
  states,
  simulationDateTime
}: {
  states: Record<string, CharacterState>
  simulationDateTime: SimulationDateTime
}): WitnessReaction[] {
  const reactions: WitnessReaction[] = []

  for (const [actorId, actor] of Object.entries(states)) {
    const lotId = actor.location.lotId
    if (!lotId || actor.currentAction === 'idle') continue

    const topics = APPROVAL_TOPICS.filter((topic) =>
      topic.matches({ action: actor.currentAction, actor, simulationDateTime })
    )
    if (topics.length === 0) continue

    for (const [witnessId, witness] of Object.entries(states)) {
      if (witnessId === actorId || witness.location.lotId !== lotId) continue
      // Someone asleep isn't watching.
      if (witness.currentAction === 'sleep') continue

      for (const topic of topics) {
        const stance = witness.stances?.[topic.id] ?? topic.defaultStance
        if (!stance || stance === 'neutral') continue
        if ((witness.witnessCooldowns?.[cooldownKey(actorId, topic.id)] ?? 0) > 0) continue
        reactions.push({ witnessId, actorId, topic, stance })
      }
    }
  }

  return reactions
}

/** Don't react to the same person doing the same thing again right away. */
export function startReactionCooldown(witness: Pick<CharacterState, 'witnessCooldowns'>, actorId: string, topicId: string): void {
  witness.witnessCooldowns = {
    ...witness.witnessCooldowns,
    [cooldownKey(actorId, topicId)]: WITNESS_TUNING.reactionCooldownTicks
  }
}

/**
 * Hold something against someone. If the witness already holds this against them it is
 * refreshed and counted again; otherwise it is added, and the oldest fades if they hold too many.
 */
export function addGrievance(
  witness: Pick<CharacterState, 'grievances'>,
  about: { id: string; name: string },
  topic: ApprovalTopic,
  cause?: Cause
): Grievance {
  const grievances = [...(witness.grievances ?? [])]
  const existing = grievances.find((g) => g.aboutCharacterId === about.id && g.topicId === topic.id)
  if (existing) {
    existing.ticksRemaining = WITNESS_TUNING.grievanceDurationTicks
    existing.times += 1
    // Doing it again reopens the wound, even if they'd talked it over.
    existing.vented = false
    if (cause) existing.cause = cause
    witness.grievances = grievances
    return existing
  }

  const grievance: Grievance = {
    id: `${about.id}:${topic.id}`,
    aboutCharacterId: about.id,
    aboutName: about.name,
    topicId: topic.id,
    summary: topic.phrase,
    ticksRemaining: WITNESS_TUNING.grievanceDurationTicks,
    times: 1,
    ...(cause ? { cause } : {})
  }
  grievances.push(grievance)
  grievances.sort((a, b) => b.ticksRemaining - a.ticksRemaining)
  witness.grievances = grievances.slice(0, WITNESS_TUNING.maxGrievances)
  return grievance
}

/** One tick passes: cooldowns count down and grievances fade (and are dropped when they do). */
export function tickWitnessState(state: Pick<CharacterState, 'witnessCooldowns' | 'grievances'>): void {
  if (state.witnessCooldowns) {
    const next: Record<string, number> = {}
    for (const [key, remaining] of Object.entries(state.witnessCooldowns)) {
      if (remaining > 1) next[key] = remaining - 1
    }
    state.witnessCooldowns = next
  }

  if (state.grievances && state.grievances.length > 0) {
    state.grievances = state.grievances
      .map((g) => ({ ...g, ticksRemaining: g.ticksRemaining - 1 }))
      .filter((g) => g.ticksRemaining > 0)
  }
}

/** The topic for a grievance, if its topic still exists. */
export const grievanceTopic = (grievance: Grievance) => getApprovalTopic(grievance.topicId)
