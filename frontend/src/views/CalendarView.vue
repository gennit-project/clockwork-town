<template>
  <div class="p-4">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gf-text">Calendar</h1>
        <p class="text-xs text-gf-text-faint">
          Weekly work schedule · {{ simWeekday }}, {{ clock }}<span v-if="loading"> · loading…</span>
        </p>
      </div>
    </div>

    <Panel title="Weekly schedule">
      <WeeklySchedule
        :entries="entries"
        :today-weekday="simWeekday"
        :now-minutes="simMinutes"
        @select="goToResident"
      />
      <p v-if="scheduledCount === 0 && !loading" class="mt-3 text-xs text-gf-text-faint">
        No shifts scheduled yet — add work shifts in a resident's editor to populate the calendar.
      </p>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Panel from '../components/Panel.vue'
import WeeklySchedule from '../components/WeeklySchedule.vue'
import { useSimulationStore } from '../stores/simulation'
import { useTownDataLoader } from '../composables/useTownDataLoader'

const route = useRoute()
const router = useRouter()
const simulationStore = useSimulationStore()
const { characterStates } = storeToRefs(simulationStore)
const { load, loading } = useTownDataLoader()

function normalize(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
const worldId = computed(() => normalize(route.params.worldId))
const regionId = computed(() => normalize(route.params.regionId))

const simWeekday = computed(() => simulationStore.simulationDateTime.weekday)
const simMinutes = computed(() => simulationStore.simulationDateTime.hour * 60 + simulationStore.simulationDateTime.minute)
const clock = computed(() => {
  const h = String(simulationStore.simulationDateTime.hour).padStart(2, '0')
  const m = String(simulationStore.simulationDateTime.minute).padStart(2, '0')
  return `${h}:${m}`
})

const entries = computed(() =>
  Object.entries(characterStates.value).map(([id, state]) => ({
    id,
    name: state.name,
    shifts: state.workSchedule || []
  }))
)

const scheduledCount = computed(() => entries.value.filter((e) => e.shifts.length > 0).length)

function goToResident(id: string) {
  if (worldId.value && regionId.value) {
    router.push(`/world/${worldId.value}/region/${regionId.value}/character/${id}`)
  }
}

async function ensureLoaded() {
  if (worldId.value && regionId.value && Object.keys(characterStates.value).length === 0) {
    await load(worldId.value, regionId.value)
  }
}

onMounted(ensureLoaded)
watch([worldId, regionId], ensureLoaded)
</script>
