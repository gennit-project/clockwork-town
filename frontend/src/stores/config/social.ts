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

/** Actions that may involve more than one other person. `date` is always exactly one. */
export const GROUP_CAPABLE_ACTIONS = ['chat_friend'] as const
