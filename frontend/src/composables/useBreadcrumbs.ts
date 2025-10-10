type BuildBreadcrumbsConfig = {
  worldId?: string
  regionId?: string
  lotId?: string
  spaceId?: string
  world?: { id: string; name: string }
  region?: { id: string; name: string }
  lot?: { id: string; name: string }
  space?: { id: string; name: string }
  current?: string
}

/**
 * Composable for building breadcrumb trails
 * @returns {Object} Breadcrumb building utilities
 */
export function useBreadcrumbs() {
  /**
   * Build a breadcrumb trail based on the current navigation context
   * @param {Object} config - Configuration object
   * @param {string} config.worldId - World ID
   * @param {string} config.regionId - Region ID
   * @param {string} config.lotId - Lot ID
   * @param {string} config.spaceId - Space ID
   * @param {Object} config.world - World data object
   * @param {Object} config.region - Region data object
   * @param {Object} config.lot - Lot data object
   * @param {Object} config.space - Space data object
   * @param {string} config.current - Current page label (no link)
   * @returns {Array} Array of breadcrumb objects
   */
  const buildBreadcrumbs = (config: BuildBreadcrumbsConfig) => {
    const crumbs = []
    const { worldId, regionId, lotId, spaceId, world, region, lot, space, current } = config

    // Always start with Worlds
    crumbs.push({ label: 'Worlds', to: '/' })

    // Add World if available
    if (worldId) {
      crumbs.push({
        label: world?.name || 'Loading...',
        to: `/world/${worldId}`
      })
    }

    // Add Region if available
    if (regionId) {
      crumbs.push({
        label: region?.name || 'Loading...',
        to: `/world/${worldId}/region/${regionId}`
      })
    }

    // Add "Overview" link before lot if we have a lot
    if (lotId) {
      crumbs.push({
        label: 'Overview',
        to: `/world/${worldId}/region/${regionId}/overview`
      })
    }

    // Add Lot if available
    if (lotId) {
      crumbs.push({
        label: lot?.name || 'Loading...',
        to: `/world/${worldId}/region/${regionId}/lot/${lotId}`
      })
    }

    // Add Space if available
    if (spaceId) {
      crumbs.push({
        label: space?.name || 'Loading...',
        to: '#'
      })
    }

    // Add current page (no link)
    if (current) {
      crumbs.push({ label: current, to: '#' })
    }

    return crumbs
  }

  return { buildBreadcrumbs }
}
