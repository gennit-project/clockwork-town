<template>
  <div>
    <!-- Event-type filters -->
    <div v-if="eventTypes.length > 1" class="mb-3 flex flex-wrap gap-1.5">
      <button
        type="button"
        class="rounded border px-2 py-0.5 text-[11px] transition-colors"
        :class="filter === 'all' ? 'border-gf-blue bg-gf-blue/15 text-gf-blue' : 'border-gf-border text-gf-text-weak hover:bg-gf-surface-2'"
        @click="filter = 'all'"
      >
        All ({{ memories.length }})
      </button>
      <button
        v-for="et in eventTypes"
        :key="et.key"
        type="button"
        class="rounded border px-2 py-0.5 text-[11px] transition-colors"
        :class="filter === et.key ? 'border-gf-blue bg-gf-blue/15 text-gf-blue' : 'border-gf-border text-gf-text-weak hover:bg-gf-surface-2'"
        @click="filter = et.key"
      >
        {{ et.label }} ({{ et.count }})
      </button>
    </div>

    <div v-if="visible.length === 0" class="py-6 text-center text-sm text-gf-text-faint">
      No memories recorded yet.
    </div>

    <ul v-else class="max-h-[28rem] space-y-0 overflow-y-auto pr-1">
      <li v-for="(m, i) in visible" :key="m.id" class="flex gap-3">
        <!-- timeline rail -->
        <div class="flex flex-col items-center">
          <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: m.color }" />
          <span v-if="i < visible.length - 1" class="w-px flex-1 bg-gf-border" />
        </div>
        <div class="min-w-0 flex-1 pb-3">
          <div class="flex items-center justify-between gap-2">
            <span class="rounded border px-1.5 py-0.5 text-[10px]" :style="{ borderColor: m.color + '66', color: m.color }">
              {{ m.label }}
            </span>
            <span class="shrink-0 text-[10px] text-gf-text-faint">{{ m.ago }}</span>
          </div>
          <p class="mt-1 text-sm text-gf-text">{{ m.content }}</p>
          <div class="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-gf-text-faint">
            <span v-if="m.locationLotName">📍 {{ m.locationLotName }}</span>
            <button
              v-for="who in m.withWhom"
              :key="who.id"
              class="text-gf-blue hover:underline"
              @click="$emit('select', who.id)"
            >
              with {{ who.name }}
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CharacterRelationship, LongTermMemory } from '../stores/types'
import { timeSince } from '../stores/utils/relativeTime'

const props = defineProps<{
  memories: LongTermMemory[]
  relationships: CharacterRelationship[]
  names: Record<string, string>
  nowIso: string
}>()

defineEmits<{ (e: 'select', id: string): void }>()

const filter = ref<string>('all')

const labelFor = (et: string) => et.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// Color event types by category.
function colorFor(et: string | null | undefined): string {
  const e = et || ''
  if (/romance|date|propose/.test(e)) return '#d4537e' // pink — romance
  if (/chat|invite|lunch|movie|reunit|friend/.test(e)) return '#5794f2' // blue — social
  if (/work|volunteer/.test(e)) return '#ff9830' // amber — work
  if (/read|write|view|art/.test(e)) return '#b877d9' // purple — enrichment
  return '#9fa7b3' // neutral
}

// relationshipId -> { id: toCharacterId, name }
const relMap = computed(() => {
  const map: Record<string, { id: string; name: string }> = {}
  for (const rel of props.relationships) {
    map[rel.id] = { id: rel.toCharacterId, name: props.names[rel.toCharacterId] || 'someone' }
  }
  return map
})

const decorated = computed(() =>
  [...props.memories]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((m) => ({
      ...m,
      label: labelFor(m.eventType || 'event'),
      color: colorFor(m.eventType),
      ago: timeSince(m.createdAt, props.nowIso),
      withWhom: (m.relationshipIds || []).map((rid) => relMap.value[rid]).filter(Boolean)
    }))
)

const eventTypes = computed(() => {
  const counts = new Map<string, number>()
  for (const m of props.memories) {
    const key = m.eventType || 'event'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count, label: labelFor(key) }))
    .sort((a, b) => b.count - a.count)
})

const visible = computed(() =>
  filter.value === 'all'
    ? decorated.value
    : decorated.value.filter((m) => (m.eventType || 'event') === filter.value)
)
</script>
