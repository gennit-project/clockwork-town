/** Shape of a trait as returned by the GraphQL API. */
export interface TraitSummary {
  id: string
  name: string
}

/** Split API traits into the display names and ids the simulation state carries. */
export function toTraitSeed(traits: TraitSummary[] | null | undefined): { traits: string[]; traitIds: string[] } {
  const list = traits ?? []
  return { traits: list.map((t) => t.name), traitIds: list.map((t) => t.id) }
}
