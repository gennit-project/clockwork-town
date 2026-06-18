<template>
  <div ref="root" class="relative" @mousemove="onMove" @mouseleave="clearHover">
    <div class="flex flex-wrap gap-3">
      <div
        v-for="b in renderBuildings"
        :key="b.key"
        class="min-w-[220px] max-w-[360px] flex-1 rounded border border-gf-border p-2"
        :style="b.tint ? { backgroundColor: b.tint } : undefined"
      >
        <div class="mb-1 text-center">
          <span class="rounded border border-gf-border bg-gf-surface-2 px-2 py-0.5 text-[11px] text-gf-text">
            {{ b.label }}
          </span>
        </div>
        <div class="mb-1.5 text-center text-[10px] text-gf-text-faint">
          {{ b.rooms.length }} {{ b.rooms.length === 1 ? 'room' : 'rooms' }}
        </div>
        <svg :viewBox="`0 0 ${b.w} ${b.h}`" width="100%">
          <g v-for="room in b.rooms" :key="room.id">
            <polygon
              :points="room.points"
              fill="rgba(255,255,255,0.02)"
              :stroke="hoveredRoomId === room.id ? '#cdd6f4' : '#3a4048'"
              :stroke-width="hoveredRoomId === room.id ? 3 : 1.5"
              @mouseenter="enterRoom(room)"
              @mouseleave="clearHover"
            />
            <polygon
              v-for="occ in room.occupants"
              :key="occ.id"
              :points="occ.points"
              :fill="occ.fill"
              stroke="#111217"
              stroke-width="1.5"
              class="hex cursor-pointer"
              :aria-label="`${occ.name} · ${occ.label}`"
              @mouseenter="enterNode(occ, room.id)"
              @mouseleave="clearHover"
              @click="$emit('select', occ.id)"
            />
            <text :x="room.cx" :y="room.labelY" text-anchor="middle" class="roomlabel">{{ room.name }}</text>
          </g>
        </svg>
      </div>
    </div>

    <div
      v-if="tip"
      class="pointer-events-none absolute z-50 max-w-[220px] rounded border border-gf-border bg-gf-surface-2 px-2 py-1 text-xs shadow-lg"
      :style="{ left: `${tipX + 14}px`, top: `${tipY + 14}px` }"
    >
      <div class="font-medium text-gf-text">{{ tip.title }}</div>
      <div v-if="tip.sub" class="text-gf-text-weak">{{ tip.sub }}</div>
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

export interface NestedHexNode {
  id: string
  name: string
  value: number
}

export interface NestedRoom {
  id: string
  name: string
  description?: string
  occupants: NestedHexNode[]
}

export interface NestedBuilding {
  key: string
  label: string
  tint?: string
  rooms: NestedRoom[]
}

const props = defineProps<{
  groups: NestedBuilding[]
  legendLabel?: string
}>()

defineEmits<{ (e: 'select', id: string): void }>()

const gradient = VIRIDIS_GRADIENT

// Layout constants
const CR = 14 // resident hex radius
const S = CR * 1.18 // resident centre spacing
const PAD = 9 // padding from outermost resident to room edge
const MIN_R = CR * 1.7 // smallest room hex (0-1 occupants)
const GAP = 12
const BOX_W = 300

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 180) * (60 * k)
    pts.push(`${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`)
  }
  return pts.join(' ')
}

// Spiral of axial hex coordinates: center, then outward rings.
function hexSpiral(n: number): { q: number; r: number }[] {
  const cells = [{ q: 0, r: 0 }]
  const dirs = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
  ]
  let k = 1
  while (cells.length < n) {
    let q = dirs[4].q * k
    let r = dirs[4].r * k
    for (let side = 0; side < 6 && cells.length < n; side++) {
      for (let step = 0; step < k && cells.length < n; step++) {
        cells.push({ q, r })
        q += dirs[side].q
        r += dirs[side].r
      }
    }
    k++
  }
  return cells.slice(0, n)
}

function axialToPixel(q: number, r: number): { x: number; y: number } {
  return { x: S * 1.5 * q, y: S * Math.sqrt(3) * (r + q / 2) }
}

// Pre-compute each room's radius and resident offsets from occupancy.
function layoutRoom(room: NestedRoom) {
  const n = room.occupants.length
  const offsets = hexSpiral(Math.max(n, 1)).map((c) => axialToPixel(c.q, c.r))
  const used = offsets.slice(0, n)
  const bounding = n <= 1 ? CR : Math.max(...used.map((o) => Math.hypot(o.x, o.y))) + CR
  const radius = Math.max(MIN_R, bounding + PAD)
  return { room, radius, offsets }
}

const renderBuildings = computed(() =>
  props.groups.map((building) => {
    const laidOut = building.rooms.map(layoutRoom)

    let x = GAP
    let y = GAP
    let rowH = 0
    let maxRight = 0

    const rooms = laidOut.map(({ room, radius, offsets }) => {
      const d = radius * 2
      if (x > GAP && x + d > BOX_W) {
        x = GAP
        y += rowH + GAP
        rowH = 0
      }
      const cx = x + radius
      const cy = y + radius

      const occupants = room.occupants.map((occ, i) => ({
        id: occ.id,
        name: occ.name,
        label: `${Math.round((occ.value ?? 0) * 100)}%`,
        fill: viridisColor(occ.value ?? 0),
        points: hexPoints(cx + offsets[i].x, cy + offsets[i].y, CR)
      }))

      x += d + GAP
      rowH = Math.max(rowH, d + 18)
      maxRight = Math.max(maxRight, cx + radius)

      return {
        id: room.id,
        name: room.name,
        description: room.description,
        cx,
        cy,
        labelY: cy + radius + 13,
        points: hexPoints(cx, cy, radius),
        occupants
      }
    })

    return {
      key: building.key,
      label: building.label,
      tint: building.tint,
      rooms,
      w: BOX_W,
      h: Math.max(80, y + rowH + GAP)
    }
  })
)

// Hover state
const root = ref<HTMLElement | null>(null)
const hoveredRoomId = ref<string | null>(null)
const tip = ref<{ title: string; sub?: string } | null>(null)
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

function enterRoom(room: { id: string; name: string; description?: string }) {
  hoveredRoomId.value = room.id
  tip.value = { title: room.name, sub: room.description }
}

function enterNode(occ: { name: string; label: string }, roomId: string) {
  hoveredRoomId.value = roomId
  tip.value = { title: occ.name, sub: occ.label }
}

function clearHover() {
  hoveredRoomId.value = null
  tip.value = null
}
</script>

<style scoped>
.roomlabel {
  fill: #9fa7b3;
  font-size: 11px;
}
.hex {
  transition: stroke 0.1s ease;
}
.hex:hover {
  stroke: #ffffff;
  stroke-width: 2;
}
</style>
