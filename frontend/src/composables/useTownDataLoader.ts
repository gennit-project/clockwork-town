import { ref } from 'vue'
import { client, queries } from '../graphql'
import { useSimulationStore } from '../stores/simulation'
import { fetchCharacterDetails } from '../stores/simulationPersistence'
import { refreshCharacterDetails } from '../stores/utils/characterDetails'
import type { InputLot, WorkShift } from '../stores/types'

interface RegionCharacter {
  id: string
  name: string
  age?: number
  location?: { id: string; name: string } | null
  workSchedule?: Array<{
    day: string
    start: string
    end: string
    location: { id: string; name: string }
  }>
}

interface HouseholdSummary {
  id: string
  lotId?: string | null
  lotName?: string | null
  characters: Array<{ id: string }>
}

/**
 * Loads everything the Town Health dashboard needs into the simulation store:
 * world data (for pathfinding / locations), every region character, and each
 * character's relationships (for the node graph). Mirrors the loading that
 * RegionOverview performs so the dashboard works as a standalone entry point.
 */
export function useTownDataLoader() {
  const simulationStore = useSimulationStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(worldId: string, regionId: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const [lotsData, householdsData, regionData] = await Promise.all([
        client.request<{ lots: InputLot[] }>(queries.getLots, { regionId }),
        client.request<{ households: HouseholdSummary[] }>(queries.getHouseholds, { regionId }),
        client.request<{ region?: { characters?: RegionCharacter[] } | null }>(queries.getRegion, { id: regionId })
      ])

      const lots = lotsData.lots || []
      const lotsWithSpaces = await Promise.all(
        lots.map(async (lot): Promise<InputLot> => {
          try {
            const spacesData = await client.request<{ lot: InputLot | null }>(
              queries.getSpacesWithItems,
              { lotId: lot.id }
            )
            return {
              ...lot,
              indoorRooms: spacesData.lot?.indoorRooms || [],
              outdoorAreas: spacesData.lot?.outdoorAreas || []
            }
          } catch {
            return { ...lot, indoorRooms: [], outdoorAreas: [] }
          }
        })
      )

      simulationStore.loadWorldData(lotsWithSpaces, regionId)

      const households = householdsData.households || []
      const characters = regionData.region?.characters || []

      for (const character of characters) {
        const household = households.find((entry) =>
          entry.characters.some((member) => member.id === character.id)
        )
        const workSchedule: WorkShift[] = (character.workSchedule || []).map((shift) => ({
          day: shift.day,
          start: shift.start,
          end: shift.end,
          locationLotId: shift.location.id,
          locationLotName: shift.location.name
        }))

        simulationStore.initializeCharacter({
          id: character.id,
          name: character.name,
          householdId: household?.id ?? null,
          homeLotId: household?.lotId ?? character.location?.id ?? null,
          homeLotName: household?.lotName ?? character.location?.name ?? null,
          workSchedule
        })

        // Place characters at their home/initial lot so the simulation has somewhere to start.
        const lotId = character.location?.id
        if (lotId) {
          const lot = simulationStore.worldData.lots[lotId]
          const firstSpaceId = lot?.spaceIds[0]
          const firstSpace = firstSpaceId ? simulationStore.worldData.spaces[firstSpaceId] : undefined
          if (firstSpace) {
            simulationStore.updateCharacterLocation(
              character.id,
              regionId,
              lotId,
              character.location?.name ?? lot?.name ?? '',
              firstSpace.id,
              firstSpace.name
            )
          }
        }
      }

      // Batch-load relationships for the node graph.
      await Promise.all(
        characters.map(async (character) => {
          const state = simulationStore.characterStates[character.id]
          if (state) {
            await refreshCharacterDetails(state, character.id, { fetchCharacterDetails })
          }
        })
      )
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load town data'
    } finally {
      loading.value = false
    }
  }

  return { loading, error, load }
}
