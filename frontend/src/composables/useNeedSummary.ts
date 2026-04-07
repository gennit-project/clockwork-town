import type { Needs } from '../stores/types'

interface NeedGroupSummary {
  key: 'basic' | 'emotional' | 'fulfillment'
  label: string
  icon: string
  value: number
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((total, value) => total + value, 0) / values.length
}

export function createNeedSummaries(needs: Needs): NeedGroupSummary[] {
  return [
    {
      key: 'basic',
      label: 'Basics',
      icon: '◼',
      value: average([needs.food, needs.sleep, needs.bladder, needs.hygiene, needs.health])
    },
    {
      key: 'emotional',
      label: 'Emotions',
      icon: '●',
      value: average([needs.friends, needs.family, needs.romance])
    },
    {
      key: 'fulfillment',
      label: 'Fulfillment',
      icon: '▲',
      value: needs.fulfillment
    }
  ]
}

export type { NeedGroupSummary }
