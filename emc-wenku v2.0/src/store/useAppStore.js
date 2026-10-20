import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from './auth'
import { useLiteratureStore } from './literature'
import { usePreferencesStore } from './preferences'

const searchKeyword = ref('')

export function useAppStore() {
  const auth = useAuthStore()
  const literature = useLiteratureStore()
  const preferences = usePreferencesStore()
  const { user, isAdmin, canReview } = storeToRefs(auth)
  const { literatureList, favorites, favoriteItems, overview, overviewLoaded, loading, error } =
    storeToRefs(literature)
  const { isDarkMode } = storeToRefs(preferences)
  return {
    user,
    isAdmin,
    canReview,
    literatureList,
    favorites,
    favoriteItems,
    overview,
    overviewLoaded,
    loading,
    error,
    searchKeyword,
    isDarkMode,
    toggleTheme: preferences.toggleTheme,
    toggleFavorite: literature.toggleFavorite,
    clearFavorites: literature.clearFavorites,
    loadFavorites: literature.loadFavorites,
    loadLiterature: literature.loadLiterature,
    getLiterature: literature.getLiterature,
    loadOverview: literature.loadOverview,
    incrementViews: literature.incrementViews,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    ensureLoaded: auth.ensureLoaded,
  }
}
