const BED_ITEM_PATTERN = /bed/i
const LOUNGE_ITEM_PATTERN = /couch|sofa|loveseat/i
const CHAIR_ITEM_PATTERN = /chair|stool|bench/i
const TABLE_ITEM_PATTERN = /table|desk|counter/i

export function getDefaultItemComfort({
  name,
  itemRoles = []
}: {
  name: string
  itemRoles?: string[]
}): number {
  if (itemRoles.includes('bed_seat') || BED_ITEM_PATTERN.test(name)) {
    return 0.25
  }

  if (itemRoles.includes('lounge_seat') || LOUNGE_ITEM_PATTERN.test(name)) {
    return 0.1
  }

  if (itemRoles.includes('chair_seat') || CHAIR_ITEM_PATTERN.test(name)) {
    return 0.04
  }

  if (itemRoles.includes('table_seat') || TABLE_ITEM_PATTERN.test(name)) {
    return 0.01
  }

  return 0
}
