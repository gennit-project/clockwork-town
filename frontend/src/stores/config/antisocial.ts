/**
 * The first rungs of the escalation ladder (Epic 6.3). Each rung needs the actor's irritation to
 * be this far over their personal limit; a more serious rung needs more. Numbers are first guesses.
 * The scope limits live in utils/antisocial.ts: adults act on adults and children on children, and
 * children only ever snap.
 */

import type { ActionName } from '../types'

export interface Rung {
  id: 'snap' | 'belittle' | 'argue'
  action: ActionName
  /** How far over their irritation limit the actor must be (meter value minus limit). */
  minMargin: number
  /** Irritation the actor sheds by doing it. */
  relief: number
  /** Irritation the target gains ("insulted"). */
  targetImpulse: number
  /** Both people are drawn in and both come away upset with the other. */
  twoWay: boolean
  /** Children never do serious rungs. */
  serious: boolean
  topicId: string
  /** Finishing "<actor> ... <target>": "snapped at". */
  verb: string
}

export const RUNGS: Rung[] = [
  { id: 'snap', action: 'snap', minMargin: 0, relief: 0.25, targetImpulse: 0.06, twoWay: false, serious: false, topicId: 'rudeness', verb: 'snapped at' },
  { id: 'belittle', action: 'belittle', minMargin: 0.15, relief: 0.2, targetImpulse: 0.1, twoWay: false, serious: true, topicId: 'belittling', verb: 'belittled' },
  { id: 'argue', action: 'argue', minMargin: 0.3, relief: 0.35, targetImpulse: 0.12, twoWay: true, serious: true, topicId: 'arguing', verb: 'got into a public argument with' }
]

export const ANTISOCIAL = {
  /** At least this old to count as an adult. */
  adultAge: 18,
  /** Ticks before the same resident can act out again. */
  cooldownTicks: 6,
  /** Most acts one resident performs in a sim day. */
  dailyCap: 3
} as const
