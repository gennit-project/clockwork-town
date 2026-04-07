import { describe, expect, it } from 'vitest'
import { classifyItem } from '../itemClassification'

describe('itemClassification', () => {
  it('infers food storage from item names', () => {
    expect(classifyItem('Kitchen Fridge').isFoodStorage).toBe(true)
  })

  it('applies explicit takeout roles even when the name does not imply them', () => {
    expect(classifyItem('Front Desk', ['takeout_source']).isTakeoutSource).toBe(true)
  })

  it('preserves inferred seat roles alongside explicit roles', () => {
    expect(classifyItem('Dining Chair', ['food_storage']).isChairSeat).toBe(true)
  })

  it('preserves inferred seat roles when explicit roles add another capability', () => {
    expect(classifyItem('Dining Chair', ['food_storage']).isFoodStorage).toBe(true)
  })
})
