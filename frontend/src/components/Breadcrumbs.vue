<template>
  <nav class="mb-6" aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center gap-x-1 gap-y-1 md:gap-x-3">
      <li v-for="(crumb, index) in crumbs" :key="index" class="inline-flex items-center whitespace-nowrap">
        <svg v-if="index > 0" class="w-3 h-3 mx-1 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4"/>
        </svg>
        <router-link
          v-if="index < crumbs.length - 1"
          :to="crumb.to"
          class="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-white"
        >
          {{ crumb.label }}
        </router-link>
        <span v-else class="text-sm font-medium text-gray-500">
          {{ crumb.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
interface Breadcrumb {
  label: string
  to: string
}

defineProps<{
  crumbs: Breadcrumb[]
}>()
</script>
