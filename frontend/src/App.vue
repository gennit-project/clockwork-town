<template>
  <div class="flex h-screen bg-gf-bg text-gf-text">
    <!-- Left nav rail -->
    <aside class="hidden w-[72px] shrink-0 flex-col border-r border-gf-border bg-gf-surface md:flex">
      <router-link
        to="/"
        class="flex h-14 items-center justify-center border-b border-gf-border text-gf-blue"
        title="Clockwork Town"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </router-link>

      <nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto py-2">
        <router-link
          v-for="item in navItems"
          :key="item.key"
          :to="item.to"
          class="group flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors"
          :class="isNavActive(item)
            ? 'text-gf-text'
            : 'text-gf-text-faint hover:text-gf-text-weak'"
          :title="item.requiresRegion && !regionBase ? `${item.label} — select a region first` : item.label"
        >
          <span
            class="flex h-9 w-9 items-center justify-center rounded"
            :class="isNavActive(item) ? 'bg-gf-blue/15 text-gf-blue' : 'group-hover:bg-gf-surface-2'"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" :d="ICONS[item.key]" />
            </svg>
          </span>
          {{ item.label }}
        </router-link>
      </nav>

      <div class="flex flex-col items-center gap-0.5 border-t border-gf-border py-2 text-gf-text-faint">
        <span class="text-[10px] font-semibold uppercase tracking-wider">Service Desk</span>
        <span class="font-mono text-[10px]">{{ appVersion }}</span>
      </div>
    </aside>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Top toolbar -->
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-gf-border bg-gf-surface px-3">
        <div class="flex min-w-0 items-center gap-2">
          <button
            type="button"
            class="rounded p-2 text-gf-text-weak hover:bg-gf-surface-2 md:hidden"
            @click="showMobileNav = !showMobileNav"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <!-- Breadcrumb -->
          <nav class="flex items-center gap-1.5 truncate text-sm">
            <router-link to="/" class="font-semibold text-gf-text hover:text-gf-blue">Clockwork Town</router-link>
            <template v-for="(crumb, index) in breadcrumb" :key="index">
              <span class="text-gf-text-faint">/</span>
              <span class="truncate text-gf-text-weak">{{ crumb }}</span>
            </template>
          </nav>
        </div>

        <div class="flex items-center gap-2">
          <!-- Live status + clock -->
          <div class="hidden items-center gap-2 rounded border border-gf-border bg-gf-bg px-2.5 py-1.5 sm:flex">
            <span class="flex items-center gap-1.5">
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="simulationStore.isPaused ? 'bg-gf-text-faint' : 'bg-gf-green animate-pulse'"
              />
              <span class="text-[11px] font-medium text-gf-text-weak">
                {{ simulationStore.isPaused ? 'Paused' : 'Live' }}
              </span>
            </span>
            <span class="h-3 w-px bg-gf-border" />
            <span class="font-mono text-[11px] text-gf-text" :title="`tick ${simulationStore.currentTick}`">
              {{ simulationStore.formattedSimulationDateTime }}
            </span>
          </div>

          <!-- Run controls -->
          <div class="flex items-center gap-1 rounded border border-gf-border bg-gf-bg px-1.5 py-1">
            <button
              class="rounded p-1.5 text-gf-text-weak hover:bg-gf-surface-2 hover:text-gf-text"
              :title="simulationStore.isPaused ? 'Start auto-tick' : 'Pause auto-tick'"
              @click="togglePlayPause"
            >
              <svg v-if="simulationStore.isPaused" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              <svg v-else class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
            </button>
            <button
              class="rounded p-1.5 text-gf-text-weak hover:bg-gf-surface-2 hover:text-gf-text"
              title="Execute one tick"
              @click="manualTick"
            >
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </button>
            <select
              :value="simulationStore.autoTickSpeed"
              class="rounded bg-transparent px-1 py-0.5 text-[11px] font-medium text-gf-text-weak focus:outline-none"
              title="Auto-refresh rate"
              @change="changePlaySpeed"
            >
              <option class="bg-gf-surface" value="slow">1x</option>
              <option class="bg-gf-surface" value="normal">2.5x</option>
              <option class="bg-gf-surface" value="fast">6.5x</option>
            </select>
          </div>

          <!-- Log stream button -->
          <button
            class="flex items-center gap-1.5 rounded border border-gf-border bg-gf-bg px-2.5 py-1.5 text-[11px] font-medium text-gf-text-weak hover:bg-gf-surface-2 hover:text-gf-text"
            title="View log stream"
            @click="showActivityLog = !showActivityLog"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="hidden lg:inline">Logs</span>
            <span class="rounded bg-gf-surface-3 px-1 text-[10px]">{{ simulationStore.activityLog.length }}</span>
          </button>

          <!-- Reset -->
          <button
            class="rounded border border-gf-border bg-gf-bg p-1.5 text-gf-text-weak hover:border-gf-red/50 hover:text-gf-red"
            title="Reset simulation"
            @click="resetSimulation"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <!-- Theme toggle -->
          <button
            class="rounded border border-gf-border bg-gf-bg p-1.5 text-gf-text-weak hover:text-gf-text"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleDarkMode"
          >
            <svg v-if="isDark" class="h-4 w-4 text-gf-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Mobile nav drawer -->
      <div v-if="showMobileNav" class="border-b border-gf-border bg-gf-surface px-2 py-2 md:hidden">
        <div class="grid grid-cols-3 gap-1">
          <router-link
            v-for="item in navItems"
            :key="item.key"
            :to="item.to"
            class="rounded px-2 py-2 text-center text-xs font-medium text-gf-text-weak hover:bg-gf-surface-2"
            @click="showMobileNav = false"
          >
            {{ item.label }}
          </router-link>
        </div>
      </div>

      <!-- Content + side panes -->
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <aside
          v-if="showCharacterPane"
          class="hidden w-80 shrink-0 flex-col border-r border-gf-border bg-gf-surface lg:flex"
        >
          <CharacterDetailPanel
            :character="selectedCharacterForPanel"
            :available-romance-targets="regionCharacters"
            @close="closeCharacterPanel"
          />
        </aside>

        <main class="min-w-0 flex-1 overflow-auto">
          <router-view />
        </main>

        <!-- Right sidebar - Residents -->
        <aside v-if="currentRegionId" class="hidden w-80 shrink-0 overflow-y-auto border-l border-gf-border bg-gf-surface p-3 lg:block">
          <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gf-text-weak">Residents</h2>
          <div v-if="regionCharacters.length === 0 && regionAnimals.length === 0 && awayCharacters.length === 0" class="text-sm text-gf-text-faint">
            No residents in this region yet.
          </div>
          <div v-else class="space-y-4">
            <div v-if="regionCharacters.length > 0">
              <h3 class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gf-text-faint">
                Characters ({{ regionCharacters.length }})
              </h3>
              <div class="space-y-1.5">
                <div
                  v-for="character in regionCharacters"
                  :key="character.id"
                  class="cursor-pointer rounded border px-3 py-2 transition-colors"
                  :class="characterPanelStore.activeCharacterId === character.id
                    ? 'border-gf-blue bg-gf-blue/10'
                    : 'border-gf-border bg-gf-surface-2 hover:border-gf-border-weak'"
                  @click="selectCharacter(character)"
                >
                  <div class="mb-1 flex items-center justify-between">
                    <p class="text-sm font-medium text-gf-text">{{ character.name }}, {{ character.age }}</p>
                    <span class="text-xs">👤</span>
                  </div>
                  <div class="space-y-0.5 text-xs text-gf-text-faint">
                    <div class="flex items-center gap-1 truncate">
                      <svg class="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span class="truncate">{{ getCharacterLocation(character.id) }}</span>
                    </div>
                    <div class="flex items-center gap-1 truncate text-gf-blue">
                      <svg class="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span class="truncate">{{ getCharacterStatus(character.id) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="awayCharacters.length > 0">
              <h3 class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gf-text-faint">
                Away ({{ awayCharacters.length }})
              </h3>
              <div class="space-y-1.5">
                <div
                  v-for="character in awayCharacters"
                  :key="character.id"
                  class="cursor-pointer rounded border border-dashed border-gf-border px-3 py-2 opacity-70 transition-opacity hover:opacity-100"
                  @click="selectCharacter(character)"
                  title="Household member currently outside this region"
                >
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-gf-text-weak">{{ character.name }}, {{ character.age }}</p>
                    <span class="text-xs">🚶</span>
                  </div>
                  <p class="mt-0.5 text-xs text-gf-text-faint">Currently elsewhere</p>
                </div>
              </div>
            </div>

            <div v-if="regionAnimals.length > 0">
              <h3 class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gf-text-faint">
                Animals ({{ regionAnimals.length }})
              </h3>
              <div class="space-y-1.5">
                <div
                  v-for="animal in regionAnimals"
                  :key="animal.id"
                  class="cursor-pointer rounded border border-gf-border bg-gf-surface-2 px-3 py-2 hover:border-gf-border-weak"
                  @click="selectAnimal(animal)"
                >
                  <div class="mb-1 flex items-center justify-between">
                    <p class="text-sm font-medium text-gf-text">{{ animal.name }}, {{ animal.age }}</p>
                    <span class="text-xs">🐾</span>
                  </div>
                  <div v-if="animal.traits && animal.traits.length > 0" class="text-xs text-gf-text-faint">
                    {{ animal.traits.join(', ') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Log stream modal -->
    <div v-if="showActivityLog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click.self="showActivityLog = false">
      <div class="flex max-h-[80vh] w-full max-w-4xl flex-col rounded border border-gf-border bg-gf-surface shadow-2xl">
        <div class="flex items-center justify-between border-b border-gf-border px-4 py-3">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gf-text-weak">Log Stream</h2>
          <button class="text-gf-text-faint hover:text-gf-text" @click="showActivityLog = false">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-3">
          <div v-if="simulationStore.activityLog.length === 0" class="py-12 text-center text-sm text-gf-text-faint">
            No activity recorded yet. Start the simulation to populate the stream.
          </div>
          <div v-else class="space-y-1 font-mono text-xs">
            <div
              v-for="(entry, index) in simulationStore.recentActivityLog"
              :key="index"
              class="flex items-start gap-3 rounded px-2 py-1.5 hover:bg-gf-surface-2"
            >
              <span class="shrink-0 text-gf-text-faint">{{ new Date(entry.timestamp).toLocaleTimeString() }}</span>
              <span class="shrink-0 text-gf-green">t{{ entry.tick }}</span>
              <span class="text-gf-text">
                <span class="text-gf-blue">{{ entry.action }}</span> — {{ entry.details }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AnimalDetailPanel
      v-if="selectedAnimalForPanel"
      :animal="selectedAnimalForPanel"
      @close="selectedAnimalForPanel = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDarkMode } from './composables/useDarkMode'
import { getCharacterStatusText } from './composables/useCharacterStatus'
import { useSimulationStore } from './stores/simulation'
import { useCharacterPanelStore } from './stores/characterPanel'
import { client, queries } from './graphql'
import CharacterDetailPanel from './components/CharacterDetailPanel.vue'
import AnimalDetailPanel from './components/AnimalDetailPanel.vue'

const appVersion = 'v0.1.0'

// Outline icon path data (Heroicons-style) keyed by nav item.
const ICONS: Record<string, string> = {
  overview: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  residents: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  world: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  logs: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  tickets: 'M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z',
  alerts: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  analytics: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  reports: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  library: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
  settings: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894zM15 12a3 3 0 11-6 0 3 3 0 016 0z'
}

interface CharacterSummary {
  id: string
  name: string
  age: number
  bio?: string
  traits?: string[]
  location?: {
    id: string
    name: string
    lotType?: string
  }
}

interface AnimalSummary {
  id: string
  name: string
  age: number
  traits?: string[]
  bio?: string
}

interface GetRegionResult {
  region?: {
    characters?: CharacterSummary[]
    animals?: AnimalSummary[]
  } | null
}

interface GetHouseholdsResult {
  households?: Array<{ characters?: Array<{ id: string; name: string; age: number }> }>
}

function normalizeRouteParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

const route = useRoute()
const router = useRouter()
const { isDark, toggle: toggleDarkMode } = useDarkMode()
const simulationStore = useSimulationStore()
const characterPanelStore = useCharacterPanelStore()

const showActivityLog = ref(false)
const showMobileNav = ref(false)
const regionCharacters = ref<CharacterSummary[]>([])
const regionAnimals = ref<AnimalSummary[]>([])
const regionHouseholdMembers = ref<{ id: string; name: string; age: number }[]>([])
const selectedCharacterForPanel = ref<CharacterSummary | null>(null)
const selectedCharacterWorldId = ref<string | null>(null)
const selectedAnimalForPanel = ref<AnimalSummary | null>(null)

const currentWorldId = computed(() => normalizeRouteParam(route.params.worldId))
const currentRegionId = computed(() => normalizeRouteParam(route.params.regionId))
const showCharacterPane = computed(() =>
  Boolean(
    selectedCharacterForPanel.value &&
    currentWorldId.value &&
    selectedCharacterWorldId.value === currentWorldId.value
  )
)

// Household members not currently present on a lot in this region.
const awayCharacters = computed(() => {
  const present = new Set(regionCharacters.value.map((c) => c.id))
  return regionHouseholdMembers.value.filter((member) => !present.has(member.id))
})

// Base path for region-scoped nav items (null when no region is active).
const regionBase = computed(() =>
  currentWorldId.value && currentRegionId.value
    ? `/world/${currentWorldId.value}/region/${currentRegionId.value}`
    : null
)

interface NavItem {
  key: string
  label: string
  to: string
  routeName?: string
  routePrefix?: string
  requiresRegion?: boolean
}

const navItems = computed<NavItem[]>(() => {
  const base = regionBase.value
  return [
    { key: 'overview', label: 'Overview', to: base ? `${base}/dashboard` : '/', routeName: 'town-dashboard', requiresRegion: true },
    { key: 'residents', label: 'Residents', to: base ? `${base}/lots` : '/', routeName: 'lots-and-households', requiresRegion: true },
    { key: 'world', label: 'World', to: base ? `${base}/overview` : '/', routeName: 'region-overview', requiresRegion: true },
    { key: 'logs', label: 'Logs', to: base ? `${base}/activity-log` : '/', routeName: 'activity-log', requiresRegion: true },
    { key: 'tickets', label: 'Tickets', to: '/tickets', routeName: 'tickets' },
    { key: 'alerts', label: 'Alerts', to: '/alerts', routeName: 'alerts' },
    { key: 'calendar', label: 'Calendar', to: '/calendar', routeName: 'calendar' },
    { key: 'analytics', label: 'Analytics', to: '/analytics', routeName: 'analytics' },
    { key: 'reports', label: 'Reports', to: '/reports', routeName: 'reports' },
    { key: 'library', label: 'Library', to: '/library', routePrefix: '/library' },
    { key: 'settings', label: 'Settings', to: '/settings', routeName: 'settings' }
  ]
})

function isNavActive(item: NavItem): boolean {
  if (item.routePrefix) {
    return route.path.startsWith(item.routePrefix)
  }
  return route.name === item.routeName
}

// Simple breadcrumb derived from region context + current section.
const breadcrumb = computed<string[]>(() => {
  const crumbs: string[] = []
  const active = navItems.value.find((item) => isNavActive(item))
  if (currentRegionId.value && active && active.requiresRegion) {
    crumbs.push(active.label)
  } else if (active && !active.requiresRegion) {
    crumbs.push(active.label)
  }
  return crumbs
})

const togglePlayPause = () => {
  if (simulationStore.isPaused) {
    simulationStore.startAutoTick()
  } else {
    simulationStore.pauseAutoTick()
  }
}

const manualTick = () => {
  simulationStore.executeTick()
}

const changePlaySpeed = (event: Event) => {
  const target = event.target as HTMLSelectElement
  simulationStore.setAutoTickSpeed(target.value as 'slow' | 'normal' | 'fast')
}

const resetSimulation = () => {
  if (confirm('Reset simulation? This will clear all character states and activity logs.')) {
    simulationStore.resetSimulation()
    characterPanelStore.resetPanel()
  }
}

// Load characters and animals for the current region
const loadRegionData = async () => {
  if (!currentRegionId.value) {
    regionCharacters.value = []
    regionAnimals.value = []
    regionHouseholdMembers.value = []
    return
  }

  try {
    const [regionData, householdsData] = await Promise.all([
      client.request<GetRegionResult>(queries.getRegion, { id: currentRegionId.value }),
      client.request<GetHouseholdsResult>(queries.getHouseholds, { regionId: currentRegionId.value })
    ])
    regionCharacters.value = regionData.region?.characters || []
    regionAnimals.value = regionData.region?.animals || []
    regionHouseholdMembers.value = (householdsData.households || []).flatMap((h) => h.characters || [])
  } catch (e) {
    console.error('Failed to load region data:', e)
    regionCharacters.value = []
    regionAnimals.value = []
    regionHouseholdMembers.value = []
  }
}

// Watch for region changes
watch(currentRegionId, () => {
  loadRegionData()
}, { immediate: true })

watch(currentWorldId, (newWorldId) => {
  if (!newWorldId) {
    closeCharacterPanel()
  }
})

// Character selection - route to the resident detail page
const selectCharacter = (character: CharacterSummary) => {
  characterPanelStore.setActiveCharacter(character.id)

  const worldId = currentWorldId.value
  const regionId = currentRegionId.value
  if (worldId && regionId) {
    router.push(`/world/${worldId}/region/${regionId}/character/${character.id}`)
  }
}

const selectAnimal = (animal: AnimalSummary) => {
  selectedAnimalForPanel.value = animal
}

const closeCharacterPanel = () => {
  selectedCharacterForPanel.value = null
  selectedCharacterWorldId.value = null
  characterPanelStore.resetPanel()
}

// Get character location from simulation store (or fallback to API data)
const getCharacterLocation = (characterId: string) => {
  // First check simulation store (for reactive updates during simulation)
  const charState = simulationStore.characterStates[characterId]
  if (charState?.location?.lotName) {
    // Include both lot and space if available
    if (charState.location.spaceName) {
      return `${charState.location.lotName} → ${charState.location.spaceName}`
    }
    return charState.location.lotName
  }

  // Fallback to character's raw location from API (for initial display before simulation initializes)
  const character = regionCharacters.value.find(c => c.id === characterId)
  if (character?.location?.name) {
    return character.location.name
  }

  return 'Unknown location'
}

// Get character status/activity from simulation store
const getCharacterStatus = (characterId: string) => {
  const charState = simulationStore.characterStates[characterId]
  return getCharacterStatusText(charState)
}
</script>
