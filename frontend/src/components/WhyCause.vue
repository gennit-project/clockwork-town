<template>
  <div v-if="cause" class="text-xs" data-testid="why-cause">
    <button
      type="button"
      class="text-gf-text-weak hover:text-gf-text"
      :aria-expanded="open"
      @click.stop="open = !open"
    >
      <span class="text-gf-text-faint">{{ open ? '▾' : '▸' }} why:</span> {{ cause.summary }}
    </button>
    <ul v-if="open" class="mt-1 ml-3 space-y-0.5 border-l border-gf-border pl-2 text-gf-text-faint" data-testid="why-factors">
      <li v-for="(factor, i) in cause.factors" :key="i">
        {{ factor.label }}: <span class="text-gf-text-weak">{{ factor.value }}</span
        ><span v-if="factor.threshold !== undefined"> (threshold {{ factor.threshold }})</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Cause } from '../stores/types'

defineProps<{ cause?: Cause }>()
const open = ref(false)
</script>
