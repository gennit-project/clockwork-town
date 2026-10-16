/**
 * Taking sides (Epic 6.4). After an antisocial act, each awake adult bystander on the lot is
 * weighed deterministically: how much they regard the actor and the target (plus family ties and
 * the values they rank highest), and whether their disposition lets them get involved. All numbers
 * are first guesses; the tuning harness (docs/roadmap/completed/epic-6-8) is how to revisit them.
 */

export const SIDES = {
  /** Long-term score weight 1, short-term weight this. */
  shortTermWeight: 0.5,
  /** Regard bonus for family, a partner or a housemate. */
  bondBonus: 0.2,
  /** Regard bonus when a top-ranked value points at one party (see `VALUE_PULLS`). */
  valueBonus: 0.3,
  /** A value counts when it is within this many top ranks. */
  valueTopRanks: 2,
  /** One side's regard must beat the other's by this much to be taken. */
  margin: 0.25,
  /** The side taken must be regarded at least this much (a stranger is not defended). */
  minRegard: 0.4,
  /** Same, for someone with a trait that makes them quick to step in. */
  protectiveMinRegard: 0.25,
  /** Ticks before the same resident steps in or takes a side against the same person again. */
  cooldownTicks: 12,

  /** Stepping in. */
  intervene: {
    /** Irritation the actor sheds because someone stepped between them and the target. */
    actorRelief: 0.1,
    /** Irritation the target sheds because someone stood up for them. */
    targetComfort: 0.08,
    /** If the actor is still this far over their line, being confronted backfires. */
    backfireMargin: 0.1,
    /** Irritation the actor gains when it does ("confronted"). */
    confrontedImpulse: 0.05
  },
  /** Backing the actor: the actor sheds a little, the target holds it against the backer. */
  backActor: { actorRelief: 0.05 },
  /** Children and sensitive residents who watch are upset. */
  upset: { impulse: 0.04 }
} as const

/** Values that pull a bystander toward one party. 'family' pulls to a relative, 'friend' to the closer friend. */
export const VALUE_PULLS: Record<string, 'family' | 'friend'> = {
  'value-happy-family': 'family',
  'value-be-a-good-friend': 'friend'
}
