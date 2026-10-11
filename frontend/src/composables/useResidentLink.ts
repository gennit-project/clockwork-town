import { useSimulationStore } from '../stores/simulation'

/** Link to a resident's dashboard, or null if their world/region isn't known yet. */
export function useResidentLink() {
  const sim = useSimulationStore()
  return (characterId: string): string | null => {
    const regionId = sim.characterStates[characterId]?.location.regionId
    if (!sim.activeWorldId || !regionId) return null
    return `/world/${sim.activeWorldId}/region/${regionId}/character/${characterId}`
  }
}
