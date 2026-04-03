import { describe, expect, it } from 'vitest'
import { assignItemOccupancy, clearCharacterOccupancy } from '../itemOccupancy'
import type { ItemOccupancy } from '../../types'

describe('itemOccupancy utilities', () => {
  it('assigns a character to an item and avoids duplicates', () => {
    const occupancy: ItemOccupancy = {}

    assignItemOccupancy(occupancy, 'char-1', 'item-1')
    assignItemOccupancy(occupancy, 'char-1', 'item-1')

    expect(occupancy).toEqual({
      'item-1': ['char-1']
    })
  })

  it('moves a character from one occupied item to another', () => {
    const occupancy: ItemOccupancy = {
      'item-1': ['char-1', 'char-2']
    }

    assignItemOccupancy(occupancy, 'char-1', 'item-2')

    expect(occupancy).toEqual({
      'item-1': ['char-2'],
      'item-2': ['char-1']
    })
  })

  it('clears a character from all occupied items and removes empty buckets', () => {
    const occupancy: ItemOccupancy = {
      'item-1': ['char-1'],
      'item-2': ['char-1', 'char-2']
    }

    clearCharacterOccupancy(occupancy, 'char-1')

    expect(occupancy).toEqual({
      'item-2': ['char-2']
    })
  })
})
