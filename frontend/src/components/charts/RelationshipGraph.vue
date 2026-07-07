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
  /** source's role(s) toward target, e.g. ["colleague", "friend"]. */
  labelsForward?: string[]
  /** target's role(s) toward source, e.g. ["daughter"]. */
  labelsBackward?: string[]
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

const nameById = computed(() => Object.fromEntries(props.nodes.map((n) => [n.id, n.name])))

function joinLabels(labels?: string[]): string {
  return labels && labels.length ? labels.join(', ') : ''
}

// A short symmetric label for an edge (shown on hover). Combines both sides:
// "mother · daughter" when they differ, otherwise the shared term(s).
function edgeDisplayLabel(forward?: string[], backward?: string[]): string {
  const f = joinLabels(forward)
  const b = joinLabels(backward)
  if (f && b) return f === b ? f : `${f} · ${b}`
  return f || b || 'acquaintance'
}

// A character's relationships from their own perspective: each entry is how the
// *other* person relates to this node (e.g. for Amina → "Priya — daughter"),
// with all of that side's labels joined.
function relationsFor(nodeId: string): Array<{ name: string; role: string }> {
  const rels: Array<{ name: string; role: string }> = []
  for (const link of props.links) {
    if (link.source === nodeId) {
      rels.push({ name: nameById.value[link.target] ?? '?', role: joinLabels(link.labelsBackward) || joinLabels(link.labelsForward) || 'acquaintance' })
    } else if (link.target === nodeId) {
      rels.push({ name: nameById.value[link.source] ?? '?', role: joinLabels(link.labelsForward) || joinLabels(link.labelsBackward) || 'acquaintance' })
    }
  }
  return rels
}

const option = computed(() => ({
  tooltip: {
    formatter: (params: { dataType: string; data: Record<string, unknown> }) => {
      if (params.dataType === 'edge') {
        const data = params.data as unknown as GraphLink & { sourceName?: string; targetName?: string }
        const bond = data.bond == null ? '' : ` · bond ${(data.bond * 100).toFixed(0)}%`
        const { labelsForward, labelsBackward, sourceName, targetName } = data
        const f = joinLabels(labelsForward)
        const b = joinLabels(labelsBackward)
        const rel = f && b && f !== b
          ? `${sourceName} is ${targetName}'s ${f}<br/>${targetName} is ${sourceName}'s ${b}`
          : `${sourceName} ↔ ${targetName} · ${edgeDisplayLabel(labelsForward, labelsBackward)}`
        return `${rel}<br/><span style="opacity:.7">warmth ${(data.score * 100).toFixed(0)}%${bond}</span>`
      }
      const data = params.data as unknown as GraphNode
      const rels = relationsFor(data.id)
      const relText = rels.length
        ? `<br/><span style="opacity:.6">relationships</span><br/>${rels.map((r) => `• ${r.name} — ${r.role}`).join('<br/>')}`
        : `<br/><span style="opacity:.6">no relationships yet</span>`
      return `<strong>${data.name}</strong><br/><span style="opacity:.7">happiness ${(data.happiness * 100).toFixed(0)}%</span>${relText}`
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
      edgeLabel: { show: false },
      emphasis: {
        focus: 'adjacency',
        lineStyle: { width: 4 },
        // Reveal the relationship type on the connecting edges when a character
        // is hovered.
        edgeLabel: {
          show: true,
          formatter: (p: { data: GraphLink }) => edgeDisplayLabel(p.data.labelsForward, p.data.labelsBackward),
          color: '#f5f6f7',
          fontSize: 11,
          backgroundColor: 'rgba(20,22,28,0.85)',
          padding: [2, 5],
          borderRadius: 3
        }
      },
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
          labelsForward: link.labelsForward,
          labelsBackward: link.labelsBackward,
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
