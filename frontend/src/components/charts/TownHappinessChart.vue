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
import { HAPPINESS_THRESHOLDS } from '../../stores/utils/happinessMetrics'

const props = defineProps<{ history: HappinessSample[] }>()

const hasData = computed(() => props.history.length > 0)

const option = computed(() => ({
  grid: { top: 16, right: 16, bottom: 24, left: 40 },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value: number) => `${value.toFixed(1)}%`
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.history.map((sample) => sample.tick)
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: { formatter: '{value}%' }
  },
  series: [
    {
      name: 'Town happiness',
      type: 'line',
      showSymbol: false,
      data: props.history.map((sample) => +(sample.town * 100).toFixed(2)),
      lineStyle: { width: 2, color: '#73bf69' },
      itemStyle: { color: '#73bf69' },
      areaStyle: {
        opacity: 0.18,
        color: '#73bf69'
      },
      markLine: {
        silent: true,
        symbol: 'none',
        label: { show: false },
        data: [
          { yAxis: HAPPINESS_THRESHOLDS.warning * 100, lineStyle: { color: '#ff9830', type: 'dashed', width: 1 } },
          { yAxis: HAPPINESS_THRESHOLDS.critical * 100, lineStyle: { color: '#f2495c', type: 'dashed', width: 1 } }
        ]
      }
    }
  ]
}))
</script>
