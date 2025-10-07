import { createRouter, createWebHistory } from 'vue-router'
import WorldList from './views/WorldList.vue'
import RegionList from './views/RegionList.vue'
import LotList from './views/LotList.vue'
import SpaceList from './views/SpaceList.vue'

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
      name: 'regions',
      component: RegionList
    },
    {
      path: '/world/:worldId/region/:regionId',
      name: 'lots',
      component: LotList
    },
    {
      path: '/world/:worldId/region/:regionId/lot/:lotId',
      name: 'spaces',
      component: SpaceList
    }
  ]
})
