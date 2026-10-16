/**
 * Taking sides (Epic 6.4). After an antisocial act, each awake adult bystander is weighed by rule:
 * how much they regard the actor and the target (relationship scores, family and housemate ties,
 * and the values they rank highest), and whether their disposition lets them get involved. The most
 * regarded defender of the target steps in; those who side with the actor say so; children and
 * sensitive residents are upset. Deterministic and pure; every outcome carries a Cause.
 *
 * Scope limits: only adults step in or take a side, an unknown age counts as possibly a child, and
 * nothing happens at drama Off.
 */

import { SIDES, VALUE_PULLS } from '../config/sides'
import type { DramaIntensity } from '../config/pressure'
import { TRAIT_EFFECTS } from '../config/traitEffects'
import type { Cause, CharacterState } from '../types'
import type { AntisocialAct } from './antisocial'
import { lifeStage } from './antisocial'
import { buildSideCause, buildUpsetCause } from './causes'
import { isFamilyOf } from './familyTime'
import { addPressure, readPressure, relievePressure } from './pressure'

const awake = (state: CharacterState) => state.currentAction !== 'sleep'

export interface SideDispositions {
  staysOut: boolean
  quickToStepIn: boolean
  upsetByConflict: boolean
}

export function sideDispositions(traitIds: readonly string[] = []): SideDispositions {
  const result: SideDispositions = { staysOut: false, quickToStepIn: false, upsetByConflict: false }
  for (const id of traitIds) {
    const sides = TRAIT_EFFECTS[id]?.sides
    if (!sides) continue
    result.staysOut ||= !!sides.staysOut
    result.quickToStepIn ||= !!sides.quickToStepIn
    result.upsetByConflict ||= !!sides.upsetByConflict
  }
  return result
}

const regardNames = (state: CharacterState, otherId: string) => {
  const rel = state.relationships?.find((r) => r.toCharacterId === otherId)
  return rel ? rel.longTermScore + SIDES.shortTermWeight * rel.shortTermScore : 0
}

export interface Assessment {
  bystanderId: string
  side: 'target' | 'actor' | 'neutral'
  targetRegard: number
  actorRegard: number
  /** The gap in favour of the side taken (0 when neutral). */
  gap: number
  /** Regard the side taken had to reach. */
  needed: number
  notes: string[]
  dispositions: string[]
}

/** Weigh one bystander. They must be an awake adult on the lot and not a party to the act. */
export function assessBystander(
  bystanderId: string,
  states: Record<string, CharacterState>,
  actorId: string,
  targetId: string
): Assessment | null {
  const bystander = states[bystanderId]
  const actor = states[actorId]
  const target = states[targetId]
  if (!bystander || !actor || !target) return null
  if (bystanderId === actorId || bystanderId === targetId) return null
  if (!awake(bystander) || bystander.location.lotId !== actor.location.lotId) return null
  if (lifeStage(bystander.age) !== 'adult') return null

  const disposition = sideDispositions(bystander.traitIds)
  const notes: string[] = []
  const dispositions = (bystander.traitIds ?? [])
    .map((id, i) => (TRAIT_EFFECTS[id]?.sides ? bystander.traits[i] ?? id : null))
    .filter((name): name is string => !!name)
  const needed = disposition.quickToStepIn ? SIDES.protectiveMinRegard : SIDES.minRegard

  let targetRegard = regardNames(bystander, targetId)
  let actorRegard = regardNames(bystander, actorId)
  if (isFamilyOf(bystander, targetId, target)) {
    targetRegard += SIDES.bondBonus
    notes.push(`${target.name} is family or a housemate`)
  }
  if (isFamilyOf(bystander, actorId, actor)) {
    actorRegard += SIDES.bondBonus
    notes.push(`${actor.name} is family or a housemate`)
  }

  const baseTarget = targetRegard
  const baseActor = actorRegard
  bystander.values.slice(0, SIDES.valueTopRanks).forEach((value, rank) => {
    const pull = VALUE_PULLS[value.id]
    if (pull === 'family') {
      if (isFamilyOf(bystander, targetId, target)) {
        targetRegard += SIDES.valueBonus
        notes.push(`value "${value.name}" ranked ${rank + 1} favours ${target.name}`)
      }
      if (isFamilyOf(bystander, actorId, actor)) {
        actorRegard += SIDES.valueBonus
        notes.push(`value "${value.name}" ranked ${rank + 1} favours ${actor.name}`)
      }
    } else if (pull === 'friend') {
      const closer = baseTarget >= baseActor ? 'target' : 'actor'
      if (closer === 'target' && baseTarget >= SIDES.minRegard / 2) {
        targetRegard += SIDES.valueBonus
        notes.push(`value "${value.name}" ranked ${rank + 1} favours the closer friend, ${target.name}`)
      } else if (closer === 'actor' && baseActor >= SIDES.minRegard / 2) {
        actorRegard += SIDES.valueBonus
        notes.push(`value "${value.name}" ranked ${rank + 1} favours the closer friend, ${actor.name}`)
      }
    }
  })

  const base = { bystanderId, targetRegard, actorRegard, needed, notes, dispositions }
  if (disposition.staysOut) return { ...base, side: 'neutral', gap: 0, notes: [...notes, 'conflict-averse: stays out of it'] }

  const gap = targetRegard - actorRegard
  if (gap >= SIDES.margin && targetRegard >= needed) return { ...base, side: 'target', gap }
  if (-gap >= SIDES.margin && actorRegard >= needed) return { ...base, side: 'actor', gap: -gap }
  return { ...base, side: 'neutral', gap: 0 }
}

export interface SideOutcome {
  act: AntisocialAct
  intervener?: Assessment
  backers: Assessment[]
  /** Children and sensitive residents who watched: id and the reason it affected them. */
  upset: Array<{ id: string; reason: string }>
}

const cooldownKey = (actorId: string) => `side:${actorId}`
const onCooldown = (state: CharacterState, actorId: string) => (state.witnessCooldowns?.[cooldownKey(actorId)] ?? 0) > 0

/** Who does what about each act. Deterministic: ties go to the lower id. At drama Off, nothing. */
export function decideSides({
  acts,
  states,
  intensity
}: {
  acts: AntisocialAct[]
  states: Record<string, CharacterState>
  intensity: DramaIntensity
}): SideOutcome[] {
  if (intensity === 'off') return []
  const outcomes: SideOutcome[] = []
  for (const act of acts) {
    const actor = states[act.actorId]
    const assessments = Object.keys(states)
      .sort()
      .map((id) => assessBystander(id, states, act.actorId, act.targetId))
      .filter((a): a is Assessment => !!a)
      .filter((a) => !onCooldown(states[a.bystanderId], act.actorId))

    const defenders = assessments.filter((a) => a.side === 'target').sort((a, b) => b.targetRegard - a.targetRegard || a.bystanderId.localeCompare(b.bystanderId))
    const backers = assessments
      .filter((a) => a.side === 'actor')
      .sort((a, b) => b.actorRegard - a.actorRegard || a.bystanderId.localeCompare(b.bystanderId))
      .slice(0, 2)

    const upset: SideOutcome['upset'] = []
    for (const [id, witness] of Object.entries(states).sort(([a], [b]) => a.localeCompare(b))) {
      if (id === act.actorId || id === act.targetId || !awake(witness) || witness.location.lotId !== actor.location.lotId) continue
      const child = lifeStage(witness.age) !== 'adult'
      if (child) upset.push({ id, reason: lifeStage(witness.age) === 'child' ? 'a child who saw it' : 'age unknown, treated as a child' })
      else if (sideDispositions(witness.traitIds).upsetByConflict) upset.push({ id, reason: 'sensitive to conflict' })
    }

    outcomes.push({ act, intervener: defenders[0], backers, upset })
  }
  return outcomes
}

export interface AppliedSides {
  interveneCause?: Cause
  backfired: boolean
  backerCauses: Array<{ id: string; cause: Cause }>
  upsetCauses: Array<{ id: string; cause: Cause }>
}

/** The pressure and cooldown consequences, and the causes. The runtime records relationships, memories and logs. */
export function applySideEffects(
  states: Record<string, CharacterState>,
  outcome: SideOutcome,
  intensity: DramaIntensity
): AppliedSides {
  const { act } = outcome
  const actor = states[act.actorId]
  const target = states[act.targetId]
  const applied: AppliedSides = { backfired: false, backerCauses: [], upsetCauses: [] }
  const setCooldown = (id: string) => {
    const state = states[id]
    state.witnessCooldowns = { ...state.witnessCooldowns, [cooldownKey(act.actorId)]: SIDES.cooldownTicks }
  }

  if (outcome.intervener) {
    const defender = states[outcome.intervener.bystanderId]
    relievePressure(actor, 'irritation', SIDES.intervene.actorRelief)
    relievePressure(target, 'irritation', SIDES.intervene.targetComfort)
    const reading = readPressure(actor, 'irritation', intensity)
    if (Number.isFinite(reading.threshold) && reading.value - reading.threshold >= SIDES.intervene.backfireMargin) {
      applied.backfired = true
      addPressure(actor, 'irritation', 'confronted', SIDES.intervene.confrontedImpulse)
    }
    setCooldown(outcome.intervener.bystanderId)
    applied.interveneCause = buildSideCause({
      bystanderName: defender.name,
      actorName: actor.name,
      targetName: target.name,
      side: 'target',
      targetRegard: outcome.intervener.targetRegard,
      actorRegard: outcome.intervener.actorRegard,
      margin: outcome.intervener.gap,
      gapRequired: SIDES.margin,
      needed: outcome.intervener.needed,
      notes: outcome.intervener.notes,
      dispositions: outcome.intervener.dispositions,
      backfired: applied.backfired
    })
  }

  for (const backer of outcome.backers) {
    relievePressure(actor, 'irritation', SIDES.backActor.actorRelief)
    setCooldown(backer.bystanderId)
    applied.backerCauses.push({
      id: backer.bystanderId,
      cause: buildSideCause({
        bystanderName: states[backer.bystanderId].name,
        actorName: actor.name,
        targetName: target.name,
        side: 'actor',
        targetRegard: backer.targetRegard,
        actorRegard: backer.actorRegard,
        margin: backer.gap,
        gapRequired: SIDES.margin,
        needed: backer.needed,
        notes: backer.notes,
        dispositions: backer.dispositions
      })
    })
  }

  for (const { id, reason } of outcome.upset) {
    addPressure(states[id], 'irritation', 'distress', SIDES.upset.impulse)
    applied.upsetCauses.push({
      id,
      cause: buildUpsetCause({
        witnessName: states[id].name,
        actorName: actor.name,
        targetName: target.name,
        actSummary: `${actor.name} ${act.rung.verb} ${target.name}`,
        reason
      })
    })
  }
  return applied
}
