<template>
  <div ref="root" class="relative" @mousemove="onMove" @mouseleave="hovered = null">
    <div class="flex flex-wrap gap-3">
      <div
        v-for="group in renderGroups"
        :key="group.key"
        class="min-w-[180px] max-w-[360px] flex-1 rounded border p-2"
        :class="group.kind === 'residential' ? 'border-gf-blue/40' : group.kind === 'community' ? 'border-gf-green/40' : 'border-gf-border'"
        :style="group.tint ? { backgroundColor: group.tint } : undefined"
      >
        <div class="mb-1 text-center">
          <button
            type="button"
            class="rounded border border-gf-border bg-gf-surface-2 px-2 py-0.5 text-[11px] text-gf-text transition-colors hover:border-gf-blue hover:text-gf-blue"
            @click="$emit('select-building', group.key)"
          >
            {{ group.label }}
          </button>
        </div>
        <div v-if="group.kind && group.kind !== 'other'" class="mb-1 text-center">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
            :class="group.kind === 'residential' ? 'bg-gf-blue/15 text-gf-blue' : 'bg-gf-green/15 text-gf-green'"
          >
            {{ group.kind === 'residential' ? 'Residence' : 'Community' }}
          </span>
        </div>
        <div class="mb-1.5 text-center text-[10px] text-gf-text-faint">
          {{ group.nodes.length }} {{ group.nodes.length === 1 ? 'resident' : 'residents' }}
        </div>
        <!-- Render at intrinsic pixel size (not 100%) so hexes stay the same
             size regardless of how wide the lot card stretches. -->
        <svg
          v-if="group.hexes.length > 0"
          :viewBox="`0 0 ${viewBoxW} ${viewBoxH}`"
          :width="viewBoxW"
          :height="viewBoxH"
          class="mx-auto block max-w-full"
        >
          <polygon
            v-for="hex in group.hexes"
            :key="hex.id"
            :points="hex.points"
            :fill="hex.fill"
            stroke="#111217"
            stroke-width="1.5"
            class="hex cursor-pointer"
            :aria-label="`${hex.name} · ${hex.label}`"
            @click="$emit('select', hex.id)"
            @mouseenter="hovered = hex"
            @mouseleave="hovered = null"
          />
        </svg>
        <div v-else class="py-6 text-center text-xs text-gf-text-faint">empty</div>
      </div>
    </div>

    <div
      v-if="hovered"
      class="pointer-events-none absolute z-50 whitespace-nowrap rounded border border-gf-border bg-gf-surface-2 px-2 py-1 text-xs shadow-lg"
      :style="{ left: `${tipX + 14}px`, top: `${tipY + 14}px` }"
    >
      <span class="font-medium text-gf-text">{{ hovered.name }}</span>
      <span class="ml-1.5 text-gf-text-weak">{{ hovered.label }}</span>
    </div>

    <div v-if="legendLabel" class="mt-3 flex items-center gap-2">
      <span class="text-[11px] text-gf-text-weak">{{ legendLabel }}</span>
      <span class="text-[11px] text-gf-text-faint">0%</span>
      <span class="h-2 flex-1 rounded" :style="{ background: gradient }" />
      <span class="text-[11px] text-gf-text-faint">100%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VIRIDIS_GRADIENT, viridisColor } from '../../charts/viridis'

interface RenderedHex {
  id: string
  name: string
  label: string
  points: string
  fill: string
}

export interface HexNode {
  id: string
  name: string
  /** 0..1 metric value driving the fill color. */
  value: number
}

export interface HexGroup {
  key: string
  label: string
  tint?: string
  /** Lot kind, drives the Residence/Community badge. */
  kind?: 'residential' | 'community' | 'other'
  nodes: HexNode[]
}

const props = defineProps<{
  groups: HexGroup[]
  legendLabel?: string
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'select-building', id: string): void
}>()

const gradient = VIRIDIS_GRADIENT

const root = ref<HTMLElement | null>(null)
const hovered = ref<RenderedHex | null>(null)
const tipX = ref(0)
const tipY = ref(0)

function onMove(e: MouseEvent) {
  const el = root.value
  if (!el) {
    return
  }
  const rect = el.getBoundingClientRect()
  tipX.value = e.clientX - rect.left
  tipY.value = e.clientY - rect.top
}

const COLUMNS = 6
const R = 15
const DX = R * 1.5
const DY = R * Math.sqrt(3)
const OY = DY / 2

function hexPoints(cx: number, cy: number): string {
  const pts: string[] = []
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 180) * (60 * k)
    pts.push(`${(cx + R * Math.cos(ang)).toFixed(1)},${(cy + R * Math.sin(ang)).toFixed(1)}`)
  }
  return pts.join(' ')
}

const maxRows = computed(() => {
  const counts = props.groups.map((g) => Math.ceil(g.nodes.length / COLUMNS))
  return Math.max(1, ...counts)
})

const viewBoxW = computed(() => Math.round(R + 2 + (COLUMNS - 1) * DX + R + 4))
const viewBoxH = computed(() => Math.round(R + 4 + (maxRows.value - 1) * DY + OY + R + 4))

const renderGroups = computed(() =>
  props.groups.map((group) => ({
    ...group,
    hexes: group.nodes.map((node, i) => {
      const col = i % COLUMNS
      const row = Math.floor(i / COLUMNS)
      const cx = R + 2 + col * DX
      const cy = R + 4 + row * DY + (col % 2) * OY
      return {
        id: node.id,
        name: node.name,
        label: `${Math.round((node.value ?? 0) * 100)}%`,
        points: hexPoints(cx, cy),
        fill: viridisColor(node.value ?? 0)
      }
    })
  }))
)
</script>

<style scoped>
.hex {
  transition: stroke 0.1s ease;
}
.hex:hover {
  stroke: #ffffff;
  stroke-width: 2;
}
</style>
