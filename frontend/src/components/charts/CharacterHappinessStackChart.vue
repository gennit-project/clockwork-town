<template>
  <div v-if="hasData" class="relative h-full w-full">
    <v-chart class="h-full w-full" :option="option" theme="grafana" autoresize />
    <p
      v-if="!hasValues"
      class="pointer-events-none absolute right-3 top-2 text-[11px] text-gf-text-faint"
    >
      Fulfillment hidden: no values yet
    </p>
  </div>
  <div v-else class="flex h-full items-center justify-center text-sm text-gf-text-faint">
    No data yet — run the simulation to collect samples.
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { HappinessSample } from '../../stores/types'
import { buildStackSeries } from '../../stores/utils/happinessBreakdown'

const props = defineProps<{
  history: HappinessSample[]
  characterId: string
  traitIds?: readonly string[]
  /** With no values, the fulfillment layer is left out. */
  hasValues: boolean
}>()

const hasData = computed(() => props.history.length > 0)

const series = computed(() =>
  buildStackSeries({
    history: props.history,
    characterId: props.characterId,
    traitIds: props.traitIds,
    hasValues: props.hasValues
  })
)

// Bottom to top: basics, emotions, fulfillment. Colors follow the Grafana tokens.
const LAYERS = [
  { key: 'basic', name: 'Basics', color: '#3274d9' },
  { key: 'emotional', name: 'Emotions', color: '#b877d9' },
  { key: 'higher', name: 'Fulfillment', color: '#ff9830' }
] as const

const visibleLayers = computed(() => LAYERS.filter((layer) => layer.key !== 'higher' || props.hasValues))

const option = computed(() => ({
  grid: { top: 16, right: 24, bottom: 40, left: 40 },
  tooltip: {
    trigger: 'axis',
    formatter: (params: Array<{ dataIndex: number }>) => {
      const i = params[0]?.dataIndex ?? 0
      const rows = visibleLayers.value
        .map((layer) => {
          const value = series.value[layer.key][i]
          return `<div style="display:flex;justify-content:space-between;gap:16px">
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${layer.color};margin-right:6px"></span>${layer.name}</span>
            <b>${value == null ? '–' : value.toFixed(1)}</b></div>`
        })
        .join('')
      const total = series.value.total[i]
      return `<div>tick ${series.value.ticks[i]}</div>${rows}
        <div style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;border-top:1px solid #444;padding-top:4px">
          <span>Happiness</span><b>${total == null ? '–' : total.toFixed(1)}%</b></div>`
    }
  },
  legend: { bottom: 0, data: visibleLayers.value.map((layer) => layer.name), textStyle: { fontSize: 11 } },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: series.value.ticks,
    axisLabel: { rotate: 30, hideOverlap: true }
  },
  yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
  series: visibleLayers.value.map((layer) => ({
    name: layer.name,
    type: 'line',
    stack: 'happiness',
    showSymbol: false,
    emphasis: { focus: 'series' },
    lineStyle: { width: 1.5, color: layer.color },
    itemStyle: { color: layer.color },
    areaStyle: { color: layer.color, opacity: 0.45 },
    data: series.value[layer.key]
  }))
}))
</script>
