import { createRouter, createWebHistory } from 'vue-router'
import WorldList from './views/WorldList.vue'
import RegionList from './views/RegionList.vue'
import RegionOverview from './views/RegionOverview.vue'
import TownDashboard from './views/TownDashboard.vue'
import ServiceDeskStub from './views/ServiceDeskStub.vue'
import CharacterDashboard from './views/CharacterDashboard.vue'
import ActivityLog from './views/ActivityLog.vue'
import LotList from './views/LotList.vue'
import SpaceList from './views/SpaceList.vue'
import SpaceDetail from './views/SpaceDetail.vue'
import HouseholdForm from './views/HouseholdForm.vue'
import HouseholdDetail from './views/HouseholdDetail.vue'
import CharacterEditor from './views/CharacterEditor.vue'
import Library from './views/Library.vue'
import LotTemplates from './views/LotTemplates.vue'
import LotTemplateDetail from './views/LotTemplateDetail.vue'
import LotTemplateEdit from './views/LotTemplateEdit.vue'
import HouseholdTemplates from './views/HouseholdTemplates.vue'
import HouseholdTemplateDetail from './views/HouseholdTemplateDetail.vue'
import LibraryStub from './views/LibraryStub.vue'
import LotsAndHouseholds from './views/LotsAndHouseholds.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'worlds',
      component: WorldList
    },
    {
      path: '/world/:worldId',
      name: 'world-regions',
      component: RegionList
    },
    {
      path: '/world/:worldId/region/:regionId',
      name: 'region-detail',
      component: RegionList
    },
    {
      path: '/world/:worldId/region/:regionId/lots',
      name: 'lots-and-households',
      component: LotsAndHouseholds
    },
    {
      path: '/world/:worldId/region/:regionId/overview',
      name: 'region-overview',
      component: RegionOverview
    },
    {
      path: '/world/:worldId/region/:regionId/dashboard',
      name: 'town-dashboard',
      component: TownDashboard
    },
    {
      path: '/world/:worldId/region/:regionId/activity-log',
      name: 'activity-log',
      component: ActivityLog
    },
    {
      path: '/world/:worldId/region/:regionId/lot/:lotId',
      name: 'spaces',
      component: SpaceList
    },
    {
      path: '/world/:worldId/region/:regionId/lot/:lotId/space/:spaceId',
      name: 'space-detail',
      component: SpaceDetail
    },
    {
      path: '/world/:worldId/region/:regionId/household/new',
      name: 'household-create',
      component: HouseholdForm
    },
    {
      path: '/world/:worldId/region/:regionId/household/:householdId/edit',
      name: 'household-edit',
      component: HouseholdForm
    },
    {
      path: '/world/:worldId/region/:regionId/household/:householdId',
      name: 'household-detail',
      component: HouseholdDetail
    },
    {
      path: '/world/:worldId/region/:regionId/household/:householdId/character/new',
      name: 'character-create',
      component: CharacterEditor
    },
    {
      path: '/world/:worldId/region/:regionId/character/:characterId/edit',
      name: 'character-edit',
      component: CharacterEditor
    },
    {
      path: '/world/:worldId/region/:regionId/character/:characterId',
      name: 'character-dashboard',
      component: CharacterDashboard
    },
    {
      path: '/tickets',
      name: 'tickets',
      component: ServiceDeskStub,
      meta: {
        sectionTitle: 'Tickets',
        sectionBlurb:
          'Resident incidents — unmet wants, complaints, grief, and disapproval reactions — will be filed here as the desire/complaint systems land.'
      }
    },
    {
      path: '/alerts',
      name: 'alerts',
      component: ServiceDeskStub,
      meta: {
        sectionTitle: 'Alerts',
        sectionBlurb:
          'Threshold-based pages: critical needs, value-neglect, and advance death warnings will surface here.'
      }
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: ServiceDeskStub,
      meta: {
        sectionTitle: 'Calendar',
        sectionBlurb:
          'Household schedules, meal rotas, work shifts, and auto-proposed hangouts will be managed from this view.'
      }
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: ServiceDeskStub,
      meta: {
        sectionTitle: 'Analytics',
        sectionBlurb: 'Cross-town trends and cohort breakdowns will live here. For now, see the region dashboard.'
      }
    },
    {
      path: '/reports',
      name: 'reports',
      component: ServiceDeskStub,
      meta: {
        sectionTitle: 'Reports',
        sectionBlurb: 'Scheduled summaries and exports will live here.'
      }
    },
    {
      path: '/settings',
      name: 'settings',
      component: ServiceDeskStub,
      meta: {
        sectionTitle: 'Settings',
        sectionBlurb:
          'World/region config, climate, item & template authoring, and backup/restore will live here.'
      }
    },
    {
      path: '/library',
      component: Library,
      redirect: '/library/lots',
      children: [
        {
          path: 'lots',
          name: 'library-lots',
          component: LotTemplates
        },
        {
          path: 'lots/:templateId',
          name: 'library-lot-detail',
          component: LotTemplateDetail
        },
        {
          path: 'lots/:templateId/edit',
          name: 'library-lot-edit',
          component: LotTemplateEdit
        },
        {
          path: 'households',
          name: 'library-households',
          component: HouseholdTemplates
        },
        {
          path: 'households/:templateId',
          name: 'library-household-detail',
          component: HouseholdTemplateDetail
        },
        {
          path: 'regions',
          name: 'library-regions',
          component: LibraryStub
        },
        {
          path: 'characters',
          name: 'library-characters',
          component: LibraryStub
        },
        {
          path: 'items',
          name: 'library-items',
          component: LibraryStub
        }
      ]
    }
  ]
})
