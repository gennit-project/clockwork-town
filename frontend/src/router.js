import { createRouter, createWebHistory } from 'vue-router'
import WorldList from './views/WorldList.vue'
import RegionList from './views/RegionList.vue'
import RegionOverview from './views/RegionOverview.vue'
import LotList from './views/LotList.vue'
import SpaceList from './views/SpaceList.vue'
import SpaceDetail from './views/SpaceDetail.vue'
import HouseholdForm from './views/HouseholdForm.vue'
import HouseholdDetail from './views/HouseholdDetail.vue'
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

