import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const usePreferencesStore = defineStore('preferences', () => {
  const isDarkMode = ref(window.localStorage.getItem('emc_theme') === 'dark')
  watch(
    isDarkMode,
    (value) => {
      document.documentElement.classList.toggle('dark', value)
      window.localStorage.setItem('emc_theme', value ? 'dark' : 'light')
    },
    { immediate: true },
  )
  function toggleTheme() {
    isDarkMode.value = !isDarkMode.value
  }
  return { isDarkMode, toggleTheme }
})
