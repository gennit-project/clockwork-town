import { computed } from 'vue'
import { useRoute } from 'vue-router'

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

/**
 * Composable for accessing common route parameters
 * @returns {Object} Computed route parameters
 */
export function useRouteParams() {
  const route = useRoute()

  return {
    worldId: computed(() => normalizeParam(route.params.worldId)),
    regionId: computed(() => normalizeParam(route.params.regionId)),
    lotId: computed(() => normalizeParam(route.params.lotId)),
    spaceId: computed(() => normalizeParam(route.params.spaceId)),
    householdId: computed(() => normalizeParam(route.params.householdId)),
    templateId: computed(() => normalizeParam(route.params.templateId)),
    params: computed(() => route.params)
  }
}
