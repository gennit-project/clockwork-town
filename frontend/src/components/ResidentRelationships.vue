<template>
  <div>
    <div v-if="sorted.length === 0" class="py-6 text-center text-sm text-gf-text-faint">
      No relationships recorded yet.
    </div>
    <ul v-else class="space-y-2">
      <li
        v-for="rel in sorted"
        :key="rel.id"
        class="cursor-pointer rounded border border-gf-border bg-gf-surface-2 px-3 py-2 transition-colors hover:border-gf-border-weak"
        @click="$emit('select', rel.toCharacterId)"
      >
        <div class="mb-1.5 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="statusDot(rel.status)" />
            <span class="truncate text-sm font-medium text-gf-text">{{ rel.name }}</span>
            <span
              v-for="label in rel.labels"
              :key="label"
              class="rounded border border-gf-purple/30 bg-gf-purple/15 px-1.5 py-0.5 text-[10px] text-gf-purple"
            >
              {{ label }}
            </span>
            <span v-if="rel.isDeceasedTarget" class="rounded border border-gf-border bg-gf-surface-3 px-1.5 py-0.5 text-[10px] text-gf-text-faint">
              deceased
            </span>
          </div>
          <span class="shrink-0 text-[11px]" :class="statusText(rel.status)">{{ rel.statusLabel }}</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="mb-0.5 flex justify-between text-[10px] text-gf-text-faint">
              <span>Warmth</span><span>{{ pct(rel.shortTermScore) }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded bg-gf-surface-3">
              <div class="h-full rounded" :style="{ width: pct(rel.shortTermScore), backgroundColor: warmthColor(rel.shortTermScore) }" />
            </div>
          </div>
          <div>
            <div class="mb-0.5 flex justify-between text-[10px] text-gf-text-faint">
              <span>Bond</span><span>{{ pct(rel.longTermScore) }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded bg-gf-surface-3">
              <div class="h-full rounded bg-gf-blue" :style="{ width: pct(rel.longTermScore) }" />
            </div>
          </div>
        </div>

        <div class="mt-1.5 flex gap-3 text-[10px] text-gf-text-faint">
          <span><i class="ti" /> seen {{ rel.seen }}</span>
          <span>spoke {{ rel.spoke }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CharacterRelationship } from '../stores/types'
import { hoursBetween, timeSince } from '../stores/utils/relativeTime'

type Status = 'warm' | 'cooling' | 'fading'

const props = defineProps<{
  relationships: CharacterRelationship[]
  names: Record<string, string>
  nowIso: string
}>()

defineEmits<{ (e: 'select', id: string): void }>()

const pct = (v: number) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`

function warmthColor(v: number): string {
  if (v < 0.25) return '#f2495c'
  if (v < 0.5) return '#ff9830'
  return '#73bf69'
}

function statusOf(rel: CharacterRelationship): Status {
  const hours = hoursBetween(rel.lastSpokeAt, props.nowIso)
  if (hours > 72 || rel.shortTermScore < 0.2) return 'fading'
  if (hours > 24 || rel.shortTermScore < 0.45) return 'cooling'
  return 'warm'
}

const STATUS_LABEL: Record<Status, string> = { warm: 'warm', cooling: 'cooling', fading: 'fading' }

function statusDot(s: Status): string {
  return s === 'fading' ? 'bg-gf-red' : s === 'cooling' ? 'bg-gf-amber' : 'bg-gf-green'
}
function statusText(s: Status): string {
  return s === 'fading' ? 'text-gf-red' : s === 'cooling' ? 'text-gf-amber' : 'text-gf-green'
}

const SEVERITY: Record<Status, number> = { fading: 0, cooling: 1, warm: 2 }

const sorted = computed(() =>
  props.relationships
    .map((rel) => {
      const status = statusOf(rel)
      return {
        ...rel,
        name: props.names[rel.toCharacterId] || 'Unknown resident',
        status,
        statusLabel: STATUS_LABEL[status],
        seen: timeSince(rel.lastSeenAt, props.nowIso),
        spoke: timeSince(rel.lastSpokeAt, props.nowIso)
      }
    })
    // At-risk relationships surface first (service-desk style).
    .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status] || b.shortTermScore - a.shortTermScore)
)
</script>
