/**
 * Antisocial acts: when a resident's irritation is over their personal limit and someone is there
 * to take it out on, they act, deterministically. No dice: the rung comes from how far over the
 * line they are, the target from who they hold the most against. Every act carries a Cause built
 * from those same numbers. Pure; the runtime applies the consequences. See config/antisocial.ts.
 *
 * Scope limits (non-negotiable, see docs/roadmap/epic-6): adults act on adults and children on
 * children, children only ever snap, an unknown age is treated as possibly a child, sleepers are
 * neither actors nor targets, and at drama intensity Off nothing ever happens.
 */

import { ANTISOCIAL, RUNGS, type Rung } from '../config/antisocial'
import type { DramaIntensity } from '../config/pressure'
import { TRAIT_EFFECTS } from '../config/traitEffects'
import type { Cause, CharacterState } from '../types'
import { buildAntisocialCause } from './causes'
import { addPressure, readPressure, relievePressure } from './pressure'

export type LifeStage = 'adult' | 'child' | 'unknown'

export function lifeStage(age: number | undefined): LifeStage {
  if (age === undefined || !Number.isFinite(age)) return 'unknown'
  return age >= ANTISOCIAL.adultAge ? 'adult' : 'child'
}

export interface AntisocialAct {
  actorId: string
  targetId: string
  rung: Rung
  cause: Cause
}

const awake = (state: CharacterState) => state.currentAction !== 'sleep'

/** The most serious rung their margin reaches, limited to what their life stage allows. */
export function chooseRung(margin: number, stage: LifeStage): Rung | null {
  if (stage === 'unknown' || margin < 0) return null
  const allowed = RUNGS.filter((rung) => stage === 'adult' || !rung.serious)
  return [...allowed].reverse().find((rung) => margin >= rung.minMargin) ?? null
}

/** Who they hold the most against (strongest unvented grievance), else whoever they regard least. */
export function chooseTarget(
  actorId: string,
  actor: CharacterState,
  states: Record<string, CharacterState>
): { targetId: string; reason: string } | null {
  const stage = lifeStage(actor.age)
  const candidates = Object.entries(states)
    .filter(
      ([id, other]) =>
        id !== actorId &&
        other.location.lotId &&
        other.location.lotId === actor.location.lotId &&
        awake(other) &&
        lifeStage(other.age) === stage
    )
    .map(([id, other]) => {
      const grievances = (actor.grievances ?? []).filter((g) => g.aboutCharacterId === id && !g.vented)
      const held = grievances.reduce((sum, g) => sum + g.times, 0)
      const relationship = actor.relationships?.find((r) => r.toCharacterId === id)
      const regard = relationship ? relationship.shortTermScore + relationship.longTermScore : 0
      return { id, name: other.name, held, topic: grievances[0]?.summary, regard }
    })
    .sort((a, b) => b.held - a.held || a.regard - b.regard || a.id.localeCompare(b.id))

  const best = candidates[0]
  if (!best) return null
  return {
    targetId: best.id,
    reason:
      best.held > 0
        ? `holds a grievance against ${best.name} (${best.topic}, ${best.held} time${best.held === 1 ? '' : 's'})`
        : `${best.name} is the person they regard least of those present (${best.regard.toFixed(2)})`
  }
}

/** Decide who acts out this tick. Deterministic: residents are considered in id order. */
export function decideAntisocialActs({
  states,
  intensity,
  dayKey
}: {
  states: Record<string, CharacterState>
  intensity: DramaIntensity
  dayKey: string
}): AntisocialAct[] {
  const acts: AntisocialAct[] = []
  const claimed = new Set<string>()

  for (const actorId of Object.keys(states).sort()) {
    const actor = states[actorId]
    if (claimed.has(actorId) || !awake(actor) || !actor.location.lotId) continue
    const record = actor.antisocial
    if ((record?.cooldown ?? 0) > 0) continue
    if (record && record.day === dayKey && record.count >= ANTISOCIAL.dailyCap) continue

    const reading = readPressure(actor, 'irritation', intensity)
    if (!reading.over) continue
    const margin = reading.value - reading.threshold
    const rung = chooseRung(margin, lifeStage(actor.age))
    if (!rung) continue
    const target = chooseTarget(actorId, actor, states)
    if (!target || claimed.has(target.targetId)) continue

    const witnessNames = Object.entries(states)
      .filter(
        ([id, other]) =>
          id !== actorId &&
          id !== target.targetId &&
          other.location.lotId === actor.location.lotId &&
          awake(other)
      )
      .map(([, other]) => other.name)
    const dispositions = (actor.traitIds ?? [])
      .map((id, i) => (TRAIT_EFFECTS[id]?.pressure ? actor.traits[i] ?? id : null))
      .filter((name): name is string => !!name)

    acts.push({
      actorId,
      targetId: target.targetId,
      rung,
      cause: buildAntisocialCause({
        actorName: actor.name,
        targetName: states[target.targetId].name,
        verb: rung.verb,
        rungId: rung.id,
        rungMinMargin: rung.minMargin,
        margin,
        value: reading.value,
        threshold: reading.threshold,
        contributions: reading.contributions,
        targetReason: target.reason,
        witnessNames,
        intensity,
        dispositions
      })
    })
    claimed.add(actorId)
    claimed.add(target.targetId)
  }
  return acts
}

/** The pressure and bookkeeping consequences of an act (the social ones are applied by the runtime). */
export function applyAntisocialActEffects(
  states: Record<string, CharacterState>,
  act: AntisocialAct,
  dayKey: string
): void {
  const actor = states[act.actorId]
  const target = states[act.targetId]
  relievePressure(actor, 'irritation', act.rung.relief)
  addPressure(target, 'irritation', 'insulted', act.rung.targetImpulse)
  if (act.rung.twoWay) relievePressure(target, 'irritation', act.rung.relief / 2)

  const sameDay = actor.antisocial?.day === dayKey
  actor.antisocial = {
    cooldown: ANTISOCIAL.cooldownTicks,
    day: dayKey,
    count: (sameDay ? actor.antisocial?.count ?? 0 : 0) + 1
  }
}

/** One tick passes: cooldowns count down. */
export function tickAntisocial(states: Record<string, CharacterState>): void {
  for (const state of Object.values(states)) {
    if (state.antisocial && state.antisocial.cooldown > 0) state.antisocial.cooldown -= 1
  }
}
