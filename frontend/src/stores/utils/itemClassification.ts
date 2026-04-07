import type { ItemClassification } from '../types'

const STORAGE_ITEM_PATTERN = /fridge|refrigerator|cabinet|pantry/i
const TAKEOUT_ITEM_PATTERN = /pizza|takeout|delivery|counter|register/i
const GROCERY_ITEM_PATTERN = /grocery|market|produce|checkout/i
const KITCHEN_ITEM_PATTERN = /stove|oven|range|cooktop|kitchen/i
const TABLE_ITEM_PATTERN = /table|desk|counter/i
const CHAIR_ITEM_PATTERN = /chair|stool|bench/i
const LOUNGE_ITEM_PATTERN = /couch|sofa|loveseat/i
const BED_ITEM_PATTERN = /bed/i
const BOOK_SOURCE_PATTERN = /bookshelf|bookcase|shelf/i

const ROLE_TO_KEY: Record<string, keyof ItemClassification> = {
  food_storage: 'isFoodStorage',
  takeout_source: 'isTakeoutSource',
  grocery_source: 'isGrocerySource',
  kitchen_station: 'isKitchenStation',
  table_seat: 'isTableSeat',
  chair_seat: 'isChairSeat',
  lounge_seat: 'isLoungeSeat',
  bed_seat: 'isBedSeat',
  book_source: 'isBookSource'
}

export function classifyItem(name: string, itemRoles: string[] = []): ItemClassification {
  const inferred: ItemClassification = {
    isFoodStorage: STORAGE_ITEM_PATTERN.test(name),
    isTakeoutSource: TAKEOUT_ITEM_PATTERN.test(name),
    isGrocerySource: GROCERY_ITEM_PATTERN.test(name),
    isKitchenStation: KITCHEN_ITEM_PATTERN.test(name),
    isTableSeat: TABLE_ITEM_PATTERN.test(name),
    isChairSeat: CHAIR_ITEM_PATTERN.test(name),
    isLoungeSeat: LOUNGE_ITEM_PATTERN.test(name),
    isBedSeat: BED_ITEM_PATTERN.test(name),
    isBookSource: BOOK_SOURCE_PATTERN.test(name)
  }

  for (const role of itemRoles) {
    const key = ROLE_TO_KEY[role]
    if (key) {
      inferred[key] = true
    }
  }

  return inferred
}

export const ITEM_ROLE_OPTIONS = [
  { key: 'food_storage', label: 'Food Storage' },
  { key: 'takeout_source', label: 'Takeout Source' },
  { key: 'grocery_source', label: 'Grocery Source' },
  { key: 'kitchen_station', label: 'Kitchen Station' },
  { key: 'table_seat', label: 'Table Seat' },
  { key: 'chair_seat', label: 'Chair Seat' },
  { key: 'lounge_seat', label: 'Lounge Seat' },
  { key: 'bed_seat', label: 'Bed Seat' },
  { key: 'book_source', label: 'Book Source' }
] as const
