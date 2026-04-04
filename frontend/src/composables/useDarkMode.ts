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
  const stored = localStorage.getItem('darkMode')
  isDark.value = stored === 'true' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
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
