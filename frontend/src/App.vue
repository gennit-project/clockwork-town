<template>
  <div class="min-h-screen bg-gray-100 flex">
    <!-- Left Sidebar -->
    <aside class="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-4">
      <router-link
        to="/"
        class="p-3 rounded-lg hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-700': $route.path === '/' || ($route.path.startsWith('/world') && !$route.path.startsWith('/library')) }"
        title="Worlds"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </router-link>

      <router-link
        to="/library"
        class="p-3 rounded-lg hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-700': $route.path.startsWith('/library') }"
        title="Library"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      </router-link>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col">
      <nav class="bg-white shadow-sm">
        <div class="mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <span class="text-xl font-bold text-gray-900">
                Clockwork Town
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main class="flex-1 w-full mx-auto py-6 sm:px-6 lg:px-8">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
</script>
