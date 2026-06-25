<template>
  <div>
    <div v-if="entries.length === 0" class="py-6 text-center text-sm text-gf-text-faint">
      No residents to schedule.
    </div>
    <div v-else class="overflow-x-auto">
      <div class="min-w-[640px]">
        <!-- Header -->
        <div class="grid border-b border-gf-border" :style="gridStyle">
          <div class="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gf-text-faint">
            Resident
          </div>
          <div
            v-for="day in DAYS"
            :key="day"
            class="px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider"
            :class="day === todayWeekday ? 'text-gf-blue' : 'text-gf-text-faint'"
          >
            {{ day.slice(0, 3) }}
          </div>
        </div>

        <!-- Rows -->
        <div
          v-for="entry in entries"
          :key="entry.id || entry.name"
          class="grid border-b border-gf-border/60"
          :style="gridStyle"
        >
          <button
            class="truncate px-2 py-2 text-left text-sm text-gf-text hover:text-gf-blue"
            @click="entry.id && $emit('select', entry.id)"
          >
            {{ entry.name }}
          </button>
          <div
            v-for="day in DAYS"
            :key="day"
            class="px-1 py-1.5"
            :class="day === todayWeekday ? 'bg-gf-blue/5' : ''"
          >
            <div
              v-for="(shift, i) in shiftsFor(entry, day)"
              :key="i"
              class="mb-0.5 rounded border px-1.5 py-1 text-[10px] leading-tight"
              :class="isActive(shift, day)
                ? 'border-gf-blue bg-gf-blue/20 text-gf-blue'
                : 'border-gf-border bg-gf-surface-2 text-gf-text-weak'"
              :title="`${shift.start}–${shift.end} · ${shift.locationLotName || 'workplace'}`"
            >
              <div class="font-medium">{{ shift.start }}–{{ shift.end }}</div>
              <div class="truncate text-gf-text-faint">{{ shift.locationLotName || 'workplace' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Shift {
  day: string
  start: string
  end: string
  locationLotName?: string | null
}
interface Entry {
  id?: string
  name: string
  shifts: Shift[]
}

const props = defineProps<{
  entries: Entry[]
  todayWeekday?: string
  nowMinutes?: number
}>()

defineEmits<{ (e: 'select', id: string): void }>()

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const gridStyle = computed(() => ({
  gridTemplateColumns: `minmax(96px, 1.4fr) repeat(7, minmax(64px, 1fr))`
}))

function shiftsFor(entry: Entry, day: string): Shift[] {
  return entry.shifts.filter((s) => s.day === day)
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

function isActive(shift: Shift, day: string): boolean {
  if (day !== props.todayWeekday || props.nowMinutes == null) {
    return false
  }
  return props.nowMinutes >= toMinutes(shift.start) && props.nowMinutes < toMinutes(shift.end)
}
</script>
