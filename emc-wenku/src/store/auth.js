import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../services/apiClient'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const initialized = ref(false)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const canReview = computed(() => ['ADMIN', 'REVIEWER'].includes(user.value?.role))

  async function refresh() {
    try {
      user.value = await api.get('/auth/me')
    } catch {
      user.value = null
    }
    initialized.value = true
    return user.value
  }
  async function login(credentials) {
    const result = await api.post('/auth/login', credentials)
    user.value = result.user
    initialized.value = true
    return user.value
  }
  async function register(details) {
    const result = await api.post('/auth/register', details)
    user.value = result.user
    initialized.value = true
    return user.value
  }
  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      user.value = null
      initialized.value = true
    }
  }
  async function ensureLoaded() {
    if (!initialized.value) await refresh()
    return user.value
  }

  return { user, initialized, isAdmin, canReview, refresh, login, register, logout, ensureLoaded }
})
