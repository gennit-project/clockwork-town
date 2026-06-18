<template>
  <div class="p-4">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gf-text">Template Library</h1>
        <p class="mt-2 text-sm text-gf-text-weak">
          Reusable templates for lots, households, regions, characters, and items
        </p>
      </div>
    </div>

    <!-- Secondary Navigation -->
    <div class="mt-6 border-b border-gf-border">
      <nav class="-mb-px flex space-x-8">
        <router-link
          to="/library/lots"
          class="border-transparent text-gf-text-weak hover:text-gf-text hover:border-gf-border whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          active-class="border-gf-blue text-gf-blue"
        >
          Lots
        </router-link>
        <router-link
          to="/library/households"
          class="border-transparent text-gf-text-weak hover:text-gf-text hover:border-gf-border whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          active-class="border-gf-blue text-gf-blue"
        >
          Households
        </router-link>
        <router-link
          to="/library/regions"
          class="border-transparent text-gf-text-weak hover:text-gf-text hover:border-gf-border whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          active-class="border-gf-blue text-gf-blue"
        >
          Regions
        </router-link>
        <router-link
          to="/library/characters"
          class="border-transparent text-gf-text-weak hover:text-gf-text hover:border-gf-border whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          active-class="border-gf-blue text-gf-blue"
        >
          Characters
        </router-link>
        <router-link
          to="/library/items"
          class="border-transparent text-gf-text-weak hover:text-gf-text hover:border-gf-border whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          active-class="border-gf-blue text-gf-blue"
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

<script setup lang="ts">
</script>
