import type { StanceValue } from '../types'

/** A stance as returned by the GraphQL API. */
export interface StanceSummary {
  topicId: string
  stance: string
}

/** Turn API stances into the topic -> stance record the simulation uses (ignoring bad values). */
export function toStanceSeed(stances: StanceSummary[] | null | undefined): { stances: Record<string, StanceValue> } {
  const record: Record<string, StanceValue> = {}
  for (const { topicId, stance } of stances ?? []) {
    if (stance === 'approves' || stance === 'disapproves' || stance === 'neutral') record[topicId] = stance
  }
  return { stances: record }
}

/** The inverse: a record back into the list the API takes. */
export function fromStanceRecord(record: Record<string, StanceValue> | undefined): StanceSummary[] {
  return Object.entries(record ?? {}).map(([topicId, stance]) => ({ topicId, stance }))
}
