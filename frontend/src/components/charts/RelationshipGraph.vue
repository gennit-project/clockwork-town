<template>
  <v-chart v-if="nodes.length > 0" class="h-full w-full" :option="option" theme="grafana" autoresize />
  <div v-else class="flex h-full items-center justify-center text-sm text-gf-text-faint">
    No characters loaded.
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { HealthStatus } from '../../stores/utils/happinessMetrics'

export interface GraphNode {
  id: string
  name: string
  status: HealthStatus
  happiness: number
}

export interface GraphLink {
  source: string
  target: string
  /** 0..1 current warmth (short-term sentiment) — drives edge color + width. */
  score: number
  /** 0..1 long-term bond depth — shown in the tooltip. */
  bond?: number
  label?: string
}

const props = defineProps<{
  nodes: GraphNode[]
  links: GraphLink[]
}>()

const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: '#73bf69',
  warning: '#ff9830',
  critical: '#f2495c'
}

function linkColor(score: number): string {
  if (score < 0.3) return '#f2495c'
  if (score < 0.5) return '#ff9830'
  return '#5a6b5a'
}

const option = computed(() => ({
  tooltip: {
    formatter: (params: { dataType: string; data: Record<string, unknown> }) => {
      if (params.dataType === 'edge') {
        const data = params.data as unknown as GraphLink & { sourceName?: string; targetName?: string }
        const bond = data.bond == null ? '' : `<br/>bond: ${(data.bond * 100).toFixed(0)}%`
        return `${data.sourceName} ↔ ${data.targetName}<br/>${data.label || 'acquaintance'}<br/>warmth: ${(data.score * 100).toFixed(0)}%${bond}`
      }
      const data = params.data as unknown as GraphNode
      return `${data.name}<br/>happiness: ${(data.happiness * 100).toFixed(0)}%`
    }
  },
  series: [
    {
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      label: {
        show: true,
        position: 'right',
        color: '#d8d9da',
        fontSize: 11
      },
      force: {
        repulsion: 260,
        edgeLength: [70, 180],
        gravity: 0.08
      },
      lineStyle: { opacity: 0.7, curveness: 0.05 },
      emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
      data: props.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        status: node.status,
        happiness: node.happiness,
        symbolSize: 18 + node.happiness * 24,
        itemStyle: { color: STATUS_COLORS[node.status] }
      })),
      links: props.links.map((link) => {
        const sourceName = props.nodes.find((n) => n.id === link.source)?.name
        const targetName = props.nodes.find((n) => n.id === link.target)?.name
        return {
          source: link.source,
          target: link.target,
          score: link.score,
          bond: link.bond,
          label: link.label,
          sourceName,
          targetName,
          lineStyle: {
            width: 1 + link.score * 3,
            color: linkColor(link.score)
          }
        }
      })
    }
  ]
}))
</script>
