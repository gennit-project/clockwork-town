import { computed } from 'vue'
import { useRoute } from 'vue-router'

/**
 * Composable for accessing common route parameters
 * @returns {Object} Computed route parameters
 */
export function useRouteParams() {
  const route = useRoute()

  return {
    worldId: computed(() => route.params.worldId),
    regionId: computed(() => route.params.regionId),
    lotId: computed(() => route.params.lotId),
    spaceId: computed(() => route.params.spaceId),
    householdId: computed(() => route.params.householdId),
    templateId: computed(() => route.params.templateId),
    params: computed(() => route.params)
  }
}
