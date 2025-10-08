<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Template Library</h1>
        <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Reusable templates for lots, regions, characters, and items
        </p>
      </div>
    </div>

    <!-- Secondary Navigation -->
    <div class="mt-6 border-b border-gray-200">
      <nav class="-mb-px flex space-x-8">
        <router-link
          to="/library/lots"
          class="border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          active-class="border-indigo-500 text-indigo-600"
        >
          Lots
        </router-link>
        <router-link
          to="/library/regions"
          class="border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          active-class="border-indigo-500 text-indigo-600"
        >
          Regions
        </router-link>
        <router-link
          to="/library/characters"
          class="border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          active-class="border-indigo-500 text-indigo-600"
        >
          Characters
        </router-link>
        <router-link
          to="/library/items"
          class="border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          active-class="border-indigo-500 text-indigo-600"
        >
          Items
        </router-link>
      </nav>
    </div>

    <!-- Content Area -->
    <div class="mt-6">
      <router-view />
    </div>
  </div>
</template>

<script setup>
</script>
