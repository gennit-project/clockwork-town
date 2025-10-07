import { createRouter, createWebHistory } from 'vue-router'
import WorldList from './views/WorldList.vue'
import RegionList from './views/RegionList.vue'
import RegionOverview from './views/RegionOverview.vue'
import LotList from './views/LotList.vue'
import SpaceList from './views/SpaceList.vue'
import HouseholdForm from './views/HouseholdForm.vue'
import HouseholdDetail from './views/HouseholdDetail.vue'

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
      name: 'lots',
      component: LotList
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
    }
  ]
})

