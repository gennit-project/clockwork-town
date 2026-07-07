<template>
  <v-chart v-if="hasData" class="h-full w-full" :option="option" theme="grafana" autoresize />
  <div v-else class="flex h-full items-center justify-center text-sm text-gf-text-faint">
    No data yet — run the simulation to collect samples.
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { HappinessSample } from '../../stores/types'

const props = defineProps<{
  history: HappinessSample[]
  /** Map of characterId -> display name, for legend + tooltip labels. */
  names: Record<string, string>
}>()

const hasData = computed(() => props.history.length > 0)

const characterIds = computed(() => Object.keys(props.names))

const option = computed(() => ({
  // Extra right margin leaves room for the diagonal end-of-line name labels.
  grid: { top: 16, right: 120, bottom: 40, left: 40 },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value: number) => (value == null ? '–' : `${value.toFixed(1)}%`)
  },
  legend: {
    type: 'scroll',
    bottom: 0,
    data: characterIds.value.map((id) => props.names[id]),
    textStyle: { fontSize: 11 }
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.history.map((sample) => sample.tick),
    // Tilt the time labels so dense ticks don't clip into each other.
    axisLabel: { rotate: 30, hideOverlap: true }
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: { formatter: '{value}%' }
  },
  series: characterIds.value.map((id) => ({
    name: props.names[id],
    type: 'line',
    showSymbol: false,
    emphasis: { focus: 'series' },
    lineStyle: { width: 1.5 },
    // Label each line at its right end, tilted diagonally, so the many
    // character names don't run into each other. Colliding ones are hidden.
    endLabel: {
      show: true,
      formatter: (params: { seriesName: string }) => params.seriesName,
      fontSize: 10,
      rotate: 25,
      align: 'left',
      color: 'inherit'
    },
    labelLayout: { hideOverlap: true },
    data: props.history.map((sample) => {
      const value = sample.perCharacter[id]
      return value == null ? null : +(value * 100).toFixed(2)
    })
  }))
}))
</script>
