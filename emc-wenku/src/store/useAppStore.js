import { computed, ref, watch } from 'vue'
import { initialData } from '../utils/mockData'
import { STORAGE_KEYS } from '../utils/constants'
import { readFlag, readStorage, writeFlag, writeStorage } from '../utils/storage'

function readLiterature() {
  const saved = readStorage(STORAGE_KEYS.literature, null)
  return Array.isArray(saved) ? saved : initialData.map((item) => ({ ...item }))
}

function readFavorites() {
  const saved = readStorage(STORAGE_KEYS.favorites, [])
  return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []
}

const literatureList = ref(readLiterature())
const favorites = ref(readFavorites())
const searchKeyword = ref('')
const isDarkMode = ref(readStorage(STORAGE_KEYS.theme, 'light') === 'dark')
const adminStatus = ref(readFlag(STORAGE_KEYS.adminStatus))
const isAdmin = computed(() => adminStatus.value)

watch(literatureList, (value) => writeStorage(STORAGE_KEYS.literature, value), { deep: true })
watch(favorites, (value) => writeStorage(STORAGE_KEYS.favorites, value), { deep: true })
watch(
  isDarkMode,
  (value) => {
    document.documentElement.classList.toggle('dark', value)
    writeStorage(STORAGE_KEYS.theme, value ? 'dark' : 'light')
  },
  { immediate: true },
)

function toggleFavorite(id) {
  favorites.value = favorites.value.includes(id)
    ? favorites.value.filter((favoriteId) => favoriteId !== id)
    : [...favorites.value, id]
}

function clearFavorites() {
  favorites.value = []
}

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
}

function incrementViews(id) {
  const item = literatureList.value.find((entry) => entry.id === id)
  if (item) item.views = (Number(item.views) || 0) + 1
}

function saveLiterature(item) {
  const index = literatureList.value.findIndex((entry) => entry.id === item.id)
  if (index === -1) literatureList.value.unshift({ ...item })
  else literatureList.value.splice(index, 1, { ...item })
}

function deleteLiterature(id) {
  literatureList.value = literatureList.value.filter((item) => item.id !== id)
  favorites.value = favorites.value.filter((favoriteId) => favoriteId !== id)
}

function replaceLiterature(items) {
  literatureList.value = items.map((item) => ({ ...item }))
  const ids = new Set(literatureList.value.map((item) => item.id))
  favorites.value = favorites.value.filter((id) => ids.has(id))
}

function login() {
  adminStatus.value = true
  writeFlag(STORAGE_KEYS.adminStatus, true)
}

function logout() {
  adminStatus.value = false
  writeFlag(STORAGE_KEYS.adminStatus, false)
}

export function useAppStore() {
  return {
    literatureList,
    favorites,
    searchKeyword,
    isDarkMode,
    isAdmin,
    toggleFavorite,
    clearFavorites,
    toggleTheme,
    incrementViews,
    saveLiterature,
    deleteLiterature,
    replaceLiterature,
    login,
    logout,
  }
}
