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
  /** Needs switched off by a trait, mapped to the trait's display name. */
  disabled?: Partial<Record<NeedName, string>>
}>()

function colorFor(value: number): string {
  if (value < HAPPINESS_THRESHOLDS.critical) return '#f2495c'
  if (value < HAPPINESS_THRESHOLDS.warning) return '#ff9830'
  return '#73bf69'
}

const labelFor = (need: string) => need.charAt(0).toUpperCase() + need.slice(1)
const DISABLED_COLOR = '#6e7681'

const option = computed(() => {
  const ordered = [...props.needs].reverse() // ECharts category axis renders bottom-up
  return {
    grid: { top: 8, right: 40, bottom: 8, left: 76 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ name: string; value: number; dataIndex: number }>) => {
        const [p] = params
        const need = ordered[p.dataIndex]
        const reason = props.disabled?.[need]
        return reason
          ? `${p.name}: disabled because of trait: ${reason}`
          : `${p.name}: ${p.value.toFixed(0)}%`
      }
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
        data: ordered.map((need) => {
          const reason = props.disabled?.[need]
          return {
            value: reason ? 100 : +((props.values[need] ?? 0) * 100).toFixed(0),
            itemStyle: { color: reason ? DISABLED_COLOR : colorFor(props.values[need] ?? 0), borderRadius: 2, opacity: reason ? 0.4 : 1 },
            label: reason ? { formatter: 'off' } : undefined
          }
        }),
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
