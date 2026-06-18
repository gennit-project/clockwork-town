<template>
  <div>
    <div v-if="cols.length === 0" class="flex h-full items-center justify-center py-8 text-sm text-gf-text-faint">
      No data yet — run the simulation to collect samples.
    </div>
    <template v-else>
      <svg :viewBox="`0 0 ${W} ${H}`" width="100%" style="max-width: 760px" preserveAspectRatio="xMinYMid meet">
        <g v-for="(need, r) in needs" :key="need">
          <text :x="LABEL_W - 6" :y="r * rowH + rowH / 2 + 3" text-anchor="end" class="hm-label">
            {{ labelFor(need) }}
          </text>
          <rect
            v-for="cell in row(need, r)"
            :key="cell.c"
            :x="cell.x"
            :y="cell.y"
            :width="cellW + 0.5"
            :height="rowH - 1.5"
            :fill="cell.fill"
          >
            <title>{{ labelFor(need) }} · {{ cell.label }} · t{{ cell.tick }}</title>
          </rect>
        </g>
      </svg>
      <div class="mt-2 flex items-center gap-2">
        <span class="text-[11px] text-gf-text-faint">older</span>
        <span class="text-[11px] text-gf-text-faint">0%</span>
        <span class="h-2 flex-1 rounded" :style="{ background: gradient }" />
        <span class="text-[11px] text-gf-text-faint">100%</span>
        <span class="text-[11px] text-gf-text-faint">now</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HappinessSample, NeedName } from '../../stores/types'
import { VIRIDIS_GRADIENT, viridisColor } from '../../charts/viridis'

const props = defineProps<{
  history: HappinessSample[]
  characterId: string
  needs: NeedName[]
}>()

const MAX_COLS = 90
const LABEL_W = 78
const rowH = 22
const gradient = VIRIDIS_GRADIENT

const labelFor = (need: string) => need.charAt(0).toUpperCase() + need.slice(1)

// Only samples that have this character's needs recorded.
const cols = computed(() =>
  props.history.filter((s) => s.perCharacterNeeds && s.perCharacterNeeds[props.characterId]).slice(-MAX_COLS)
)

const cellW = computed(() => 540 / MAX_COLS)
const W = computed(() => LABEL_W + MAX_COLS * cellW.value)
const H = computed(() => props.needs.length * rowH)

function row(need: NeedName, r: number) {
  const offset = MAX_COLS - cols.value.length // right-align: newest at the right edge
  return cols.value.map((sample, c) => {
    const value = sample.perCharacterNeeds[props.characterId]?.[need] ?? 0
    return {
      c,
      x: LABEL_W + (offset + c) * cellW.value,
      y: r * rowH,
      fill: viridisColor(value),
      label: `${Math.round(value * 100)}%`,
      tick: sample.tick
    }
  })
}
</script>

<style scoped>
.hm-label {
  fill: #9fa7b3;
  font-size: 11px;
}
</style>
