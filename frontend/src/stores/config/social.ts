/** Tuning for group social situations (see utils/groupSocial.ts and the planner). */

export const GROUP_SOCIAL = {
  /** Most extra people (beyond the primary partner) that can join a chat: a group is up to 4. */
  maxGroupExtras: 2,
  /** Planner utility added for each extra person, so a group beats an equal pair. */
  groupChatBonusPerExtra: 0.15,
  /**
   * How much of an extra person's relationship bonus counts toward a group (the primary partner's
   * counts in full). Keeps a group at least as attractive as the same pair for people who love
   * each other, instead of losing to the relationship-ranked pair chat.
   */
  extraRelationshipWeight: 0.5,
  /** Planner utility added when the chat partner lives in the same household. */
  householdChatBonus: 0.2
} as const

/** Fun activities that can be done together (and are also available solo). */
export const GROUP_FUN_ACTIONS = ['view_art', 'view_movie'] as const

/** Actions that may involve more than one other person. `date` is always exactly one. */
export const GROUP_CAPABLE_ACTIONS = ['chat_friend', ...GROUP_FUN_ACTIONS] as const

/**
 * Group fun: when bored, a resident prefers doing something fun with other people, and only
 * falls back to a solo hobby when no one is available.
 */
export const GROUP_FUN = {
  /** Planner utility added for each other person in a group fun activity. */
  bonusPerOtherParticipant: 0.3,
  /** Fulfillment below this counts as bored. */
  boredThreshold: 0.6,
  /** Utility taken off solo fun when bored and a group option exists. */
  soloPenalty: 0.5,
  /** The solo hobbies that lose out to group fun (volunteering and pet care are left alone). */
  soloFunActions: ['read', 'write', 'view_art', 'view_movie']
} as const

/**
 * Being upset: a resident holding grievances wants to talk to a friend about it (and may comfort-eat).
 * Venting to a friend who isn't the offender shortens the grievance; it never removes it outright.
 */
export const VENTING = {
  /** Long-term relationship score at which someone counts as a good enough friend to complain to. */
  friendMinLongTerm: 0.4,
  /** Planner utility added to a chat with such a friend while upset. */
  chatBonus: 0.9,
  /** Planner utility added to eating while upset (comfort food), even when not hungry. */
  comfortEatBonus: 0.4,
  /** Venting leaves this fraction of a grievance's remaining time (0.5 = halves it). */
  ventedRemainingFraction: 0.5,
  /** A comfort meal leaves this fraction of every grievance's remaining time. */
  comfortRemainingFraction: 0.85
} as const

/** Good-hearted and bitter residents are moved by the mood of the people around them. */
export const WITNESS_MOOD = {
  /** A neighbor at or above this happiness (mean of needs) counts as happy. */
  happyAtOrAbove: 0.7,
  /** A neighbor at or below this counts as unhappy. */
  unhappyAtOrBelow: 0.4,
  /** Fulfillment gained per tick for each neighbor who moves them. */
  perNeighbor: 0.004,
  /** Most fulfillment gained in one tick this way. */
  maxPerTick: 0.012
} as const
