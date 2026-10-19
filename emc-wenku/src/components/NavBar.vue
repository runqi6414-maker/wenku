<script setup>
import { useRouter } from 'vue-router'
import { useAppStore } from '../store/useAppStore'

const router = useRouter()
const { searchKeyword, favorites, isDarkMode, isAdmin, toggleTheme, logout } = useAppStore()

function submitSearch() {
  router.push({
    name: 'home',
    query: searchKeyword.value.trim() ? { q: searchKeyword.value.trim() } : {},
  })
}

function signOut() {
  logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="site-header">
    <nav class="nav-bar" aria-label="主导航">
      <RouterLink class="brand" to="/">EarthMC 国区玩家文库</RouterLink>
      <form class="nav-search" role="search" @submit.prevent="submitSearch">
        <label class="sr-only" for="global-search">搜索文献</label>
        <input
          id="global-search"
          v-model="searchKeyword"
          type="search"
          placeholder="搜索标题或作者"
        />
        <button class="button" type="submit">搜索</button>
      </form>
      <div class="nav-links">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/profile" class="favorites-link">
          我的收藏<span v-if="favorites.length" class="nav-count">{{ favorites.length }}</span>
        </RouterLink>
        <RouterLink to="/admin">后台管理</RouterLink>
        <button v-if="isAdmin" class="button button-quiet" type="button" @click="signOut">
          退出管理
        </button>
        <button class="button button-quiet" type="button" @click="toggleTheme">
          {{ isDarkMode ? '浅色模式' : '深色模式' }}
        </button>
      </div>
    </nav>
  </header>
</template>
