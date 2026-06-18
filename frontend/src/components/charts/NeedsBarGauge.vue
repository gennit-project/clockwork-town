<template>
  <v-chart class="h-full w-full" :option="option" theme="grafana" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { NeedName } from '../../stores/types'
import { HAPPINESS_THRESHOLDS } from '../../stores/utils/happinessMetrics'

const props = defineProps<{
  needs: NeedName[]
  values: Record<NeedName, number>
}>()

function colorFor(value: number): string {
  if (value < HAPPINESS_THRESHOLDS.critical) return '#f2495c'
  if (value < HAPPINESS_THRESHOLDS.warning) return '#ff9830'
  return '#73bf69'
}

const labelFor = (need: string) => need.charAt(0).toUpperCase() + need.slice(1)

const option = computed(() => {
  const ordered = [...props.needs].reverse() // ECharts category axis renders bottom-up
  return {
    grid: { top: 8, right: 40, bottom: 8, left: 76 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value: number) => `${value.toFixed(0)}%`
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      show: false
    },
    yAxis: {
      type: 'category',
      data: ordered.map(labelFor),
      axisLabel: { fontSize: 11 }
    },
    series: [
      {
        type: 'bar',
        barWidth: 12,
        data: ordered.map((need) => ({
          value: +((props.values[need] ?? 0) * 100).toFixed(0),
          itemStyle: { color: colorFor(props.values[need] ?? 0), borderRadius: 2 }
        })),
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: '#9fa7b3',
          fontSize: 11
        },
        showBackground: true,
        backgroundStyle: { color: '#2c3235', borderRadius: 2 }
      }
    ]
  }
})
</script>
