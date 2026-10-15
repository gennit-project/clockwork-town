<template>
  <div>
    <template v-if="rows.length === 0">
      <p class="text-sm text-gf-text-weak">
        No values yet. Values are what this resident finds meaningful; neglecting them drags mood down.
      </p>
      <router-link
        v-if="editLink"
        :to="editLink"
        class="mt-2 inline-block rounded border border-gf-border bg-gf-blue/15 px-2 py-1 text-xs text-gf-blue hover:bg-gf-blue/25"
      >
        Edit values →
      </router-link>
    </template>

    <ul v-else class="space-y-3">
      <li
        v-for="row in rows"
        :key="row.id"
        class="flex items-start gap-3"
        :class="row.disabledReason ? 'opacity-50' : ''"
        :title="row.disabledReason ? `disabled because of trait: ${row.disabledReason}` : undefined"
      >
        <span class="mt-0.5 w-5 shrink-0 text-center text-xs font-semibold text-gf-text-faint">{{ row.rank }}</span>
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex items-center justify-between gap-2">
            <span class="truncate text-sm text-gf-text">{{ row.name }}</span>
            <span class="shrink-0 text-xs" :class="row.neglected ? 'font-semibold text-gf-red' : 'text-gf-text-weak'">
              {{ row.label }}
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-gf-surface-3">
            <div
              class="h-full rounded-full transition-all"
              :class="row.barClass"
              :style="{ width: `${row.percent}%` }"
            />
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  describeTicksAgo,
  getValueDef,
  isValueDisabled,
  isValueNeglected,
  valueSatisfaction
} from '../stores/utils/valueEffects'
import { getDisabledNeedReasons } from '../stores/utils/traitEffects'
import type { CharacterState } from '../stores/types'

const props = defineProps<{
  state: Pick<CharacterState, 'values' | 'traitIds' | 'traits'>
  editLink?: string | null
}>()

function barClassFor(satisfaction: number): string {
  if (satisfaction >= 0.5) return 'bg-gf-green'
  if (satisfaction >= 0.25) return 'bg-gf-amber'
  return 'bg-gf-red'
}

const rows = computed(() => {
  const reasons = getDisabledNeedReasons(props.state)
  return (props.state.values ?? []).map((value, index) => {
    const def = getValueDef(value.id)
    const disabled = isValueDisabled(value, props.state.traitIds)
    const satisfaction = valueSatisfaction(value)
    const neglected = !disabled && def !== undefined && isValueNeglected(value)
    let label = describeTicksAgo(value.ticksSinceFulfilled)
    if (!def) label = 'no effect yet'
    else if (disabled) label = 'off'
    else if (neglected) label = `neglected · ${label}`
    return {
      id: value.id,
      rank: index + 1,
      name: value.name,
      label,
      neglected,
      percent: disabled || !def ? 100 : Math.round(satisfaction * 100),
      barClass: disabled || !def ? 'bg-gf-text-faint' : barClassFor(satisfaction),
      disabledReason: disabled && def?.requiresNeed ? reasons[def.requiresNeed] : undefined
    }
  })
})
</script>
