<template>
  <ul class="divide-y divide-gf-border" data-testid="grievances">
    <li v-for="grievance in grievances" :key="grievance.id" class="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div class="min-w-0">
        <p class="text-sm text-gf-text">
          <router-link v-if="linkFor(grievance.aboutCharacterId)" :to="linkFor(grievance.aboutCharacterId)!" class="text-gf-blue hover:underline">
            {{ grievance.aboutName }}
          </router-link>
          <span v-else>{{ grievance.aboutName }}</span>
          <span class="text-gf-text-weak"> · {{ grievance.summary }}</span>
        </p>
        <p v-if="grievance.times > 1" class="text-xs text-gf-text-faint">seen {{ grievance.times }} times</p>
        <WhyCause v-if="grievance.cause" :cause="grievance.cause" />
      </div>
      <span class="shrink-0 text-xs text-gf-text-faint">fades in {{ describeTicksRemaining(grievance.ticksRemaining) }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { describeTicksRemaining } from '../stores/utils/valueEffects'
import WhyCause from './WhyCause.vue'
import type { Grievance } from '../stores/types'

const props = defineProps<{
  grievances: Grievance[]
  /** Where a resident's dashboard lives, if known. */
  residentLink?: (characterId: string) => string | null
}>()

const linkFor = (characterId: string) => props.residentLink?.(characterId) ?? null
</script>
