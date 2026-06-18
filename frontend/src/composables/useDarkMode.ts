import { ref, watch } from 'vue'

const isDark = ref(false)
let isInitialized = false

// Apply dark mode class to document
function applyDarkMode(value: boolean) {
  if (typeof window !== 'undefined') {
    if (value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

// Initialize from localStorage
if (typeof window !== 'undefined') {
  // Dark-first: default to dark (Grafana aesthetic) unless the user explicitly chose light.
  const stored = localStorage.getItem('darkMode')
  isDark.value = stored === null ? true : stored === 'true'
  applyDarkMode(isDark.value)
}

export function useDarkMode() {
  const toggle = () => {
    isDark.value = !isDark.value
    localStorage.setItem('darkMode', isDark.value.toString())
    applyDarkMode(isDark.value)
  }

  // Only set up the watcher once
  if (!isInitialized) {
    watch(isDark, (newValue) => {
      applyDarkMode(newValue)
    })
    isInitialized = true
  }

  return {
    isDark,
    toggle
  }
}
