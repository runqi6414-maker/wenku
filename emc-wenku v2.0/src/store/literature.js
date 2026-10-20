import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../services/apiClient'

export const useLiteratureStore = defineStore('literature', () => {
  const literatureList = ref([])
  const favorites = ref([])
  const favoriteItems = ref([])
  const loading = ref(false)
  const error = ref('')
  const overview = ref({ literatureCount: 0, categoryCount: 8, periodCount: 10, viewCount: 0 })
  const overviewLoaded = ref(false)

  async function loadLiterature(params = {}) {
    loading.value = true
    error.value = ''
    try {
      const result = await api.get('/literature', params)
      literatureList.value = result.items
      return result
    } catch (cause) {
      error.value = cause.message
      literatureList.value = []
      throw cause
    } finally {
      loading.value = false
    }
  }
  async function getLiterature(id) {
    const item = await api.get(`/literature/${encodeURIComponent(id)}`)
    const index = literatureList.value.findIndex((entry) => entry.id === item.id)
    if (index < 0) literatureList.value.unshift(item)
    else literatureList.value.splice(index, 1, item)
    return item
  }
  async function loadFavorites() {
    favoriteItems.value = await api.get('/me/favorites')
    favorites.value = favoriteItems.value.map((item) => item.id)
    return favoriteItems.value
  }
  async function toggleFavorite(id, itemData = null) {
    const result = await api.post(`/me/favorites/${encodeURIComponent(id)}`)
    if (result.favorited) {
      if (!favorites.value.includes(id)) favorites.value.push(id)
      const item = itemData ?? literatureList.value.find((entry) => entry.id === id)
      if (item && !favoriteItems.value.some((entry) => entry.id === id))
        favoriteItems.value.push(item)
    } else {
      favorites.value = favorites.value.filter((favorite) => favorite !== id)
      favoriteItems.value = favoriteItems.value.filter((entry) => entry.id !== id)
    }
    return result
  }
  async function clearFavorites() {
    for (const id of [...favorites.value]) await api.post(`/me/favorites/${encodeURIComponent(id)}`)
    favorites.value = []
    favoriteItems.value = []
  }
  async function loadOverview() {
    overview.value = await api.get('/home/overview')
    overviewLoaded.value = true
    return overview.value
  }
  async function incrementViews() {
    /* Views are recorded by the detail API on the server. */
  }
  return {
    literatureList,
    favorites,
    favoriteItems,
    loading,
    error,
    overview,
    overviewLoaded,
    loadLiterature,
    getLiterature,
    loadFavorites,
    toggleFavorite,
    clearFavorites,
    loadOverview,
    incrementViews,
  }
})
