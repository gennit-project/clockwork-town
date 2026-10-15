<template>
  <div class="space-y-5">
    <section v-for="section in sections" :key="section.label" class="space-y-2">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-gf-text-faint">{{ section.label }}</h4>
      <NeedBar
        v-for="need in section.needs"
        :key="need.key"
        :icon="need.icon"
        :label="need.label"
        :percentage="(state.needs[need.key] ?? 0) * 100"
        :disabled-reason="disabledReasons[need.key]"
      />

      <!-- Values feed fulfillment, so they sit directly under its bar -->
      <div
        v-if="section.hasValues"
        class="ml-4 border-l border-gf-border pl-4 pt-1"
        data-testid="values-under-fulfillment"
      >
        <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gf-text-faint">Values</p>
        <ValuesList :state="state" :edit-link="editLink" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import NeedBar from './NeedBar.vue'
import ValuesList from './ValuesList.vue'
import { getDisabledNeedReasons } from '../stores/utils/traitEffects'
import type { CharacterState, NeedName } from '../stores/types'

const props = defineProps<{
  state: Pick<CharacterState, 'needs' | 'traitIds' | 'traits' | 'values'>
  editLink?: string | null
}>()

interface NeedDescriptor {
  key: NeedName
  icon: string
  label: string
}

const sections: Array<{ label: string; needs: NeedDescriptor[]; hasValues?: boolean }> = [
  {
    label: 'Basics',
    needs: [
      { key: 'food', icon: '🍎', label: 'Food' },
      { key: 'sleep', icon: '😴', label: 'Sleep' },
      { key: 'bladder', icon: '🚽', label: 'Bladder' },
      { key: 'hygiene', icon: '🫧', label: 'Hygiene' },
      { key: 'health', icon: '💊', label: 'Health' }
    ]
  },
  {
    label: 'Emotions',
    needs: [
      { key: 'friends', icon: '💬', label: 'Friends' },
      { key: 'family', icon: '👨‍👩‍👧', label: 'Family' },
      { key: 'romance', icon: '💕', label: 'Romance' }
    ]
  },
  { label: 'Fulfillment', needs: [{ key: 'fulfillment', icon: '✨', label: 'Fulfillment' }], hasValues: true }
]

const disabledReasons = computed(() => getDisabledNeedReasons(props.state))
</script>
