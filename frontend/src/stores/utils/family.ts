// Consanguineous (blood) relationship labels. People carrying one of these
// toward each other must never be romanced or flagged as "attracted to".
// Spouse/partner are romantic by design and deliberately excluded.
export const BLOOD_FAMILY_LABELS = new Set([
  'mother', 'father', 'parent',
  'son', 'daughter', 'child',
  'sister', 'brother', 'sibling',
  'older sister', 'younger sister', 'older brother', 'younger brother',
  'older sibling', 'younger sibling',
  'grandmother', 'grandfather', 'grandson', 'granddaughter',
  'aunt', 'uncle', 'niece', 'nephew', 'cousin'
])

export function hasBloodFamilyLabel(labels: readonly string[] | undefined | null): boolean {
  return (labels ?? []).some((label) => BLOOD_FAMILY_LABELS.has(label))
}
