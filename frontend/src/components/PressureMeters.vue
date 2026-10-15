<template>
  <ul class="space-y-3" data-testid="pressure-meters">
    <li v-for="reading in readings" :key="reading.meter">
      <div class="flex items-center justify-between text-sm">
        <span class="capitalize text-gf-text">{{ reading.meter }}</span>
        <span class="text-xs" :class="reading.over ? 'text-gf-red' : 'text-gf-text-faint'">
          {{ Math.round(reading.value * 100) }}%
          <template v-if="Number.isFinite(reading.threshold)"> (limit {{ Math.round(reading.threshold * 100) }}%)</template>
          <template v-else> (drama off)</template>
        </span>
      </div>
      <div class="relative mt-1 h-1.5 rounded bg-gf-surface-2">
        <div class="h-full rounded" :class="reading.over ? 'bg-gf-red' : 'bg-gf-amber'" :style="{ width: `${Math.min(100, reading.value * 100)}%` }" />
        <div
          v-if="Number.isFinite(reading.threshold) && reading.threshold <= 1"
          class="absolute top-[-2px] h-2.5 w-px bg-gf-text-weak"
          :style="{ left: `${reading.threshold * 100}%` }"
        />
      </div>
      <WhyCause v-if="reading.value > 0.005" :cause="causeFor(reading)" class="mt-1" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WhyCause from './WhyCause.vue'
import { PRESSURE_METERS, type DramaIntensity } from '../stores/config/pressure'
import { TRAIT_EFFECTS } from '../stores/config/traitEffects'
import { buildPressureCause } from '../stores/utils/causes'
import { meterEnabled, readPressure, type PressureReading } from '../stores/utils/pressure'
import type { CharacterState } from '../stores/types'

const props = defineProps<{ state: CharacterState; intensity: DramaIntensity }>()

const readings = computed(() =>
  PRESSURE_METERS.filter((meter) => meterEnabled(props.state.traitIds, meter)).map((meter) =>
    readPressure(props.state, meter, props.intensity)
  )
)

const causeFor = (reading: PressureReading) =>
  buildPressureCause({
    residentName: props.state.name,
    meter: reading.meter,
    value: reading.value,
    threshold: reading.threshold,
    intensityLabel: props.intensity,
    traitNames: (props.state.traitIds ?? [])
      .map((id, i) => (TRAIT_EFFECTS[id]?.pressure ? props.state.traits[i] ?? id : null))
      .filter((n): n is string => !!n),
    contributions: reading.contributions
  })
</script>
