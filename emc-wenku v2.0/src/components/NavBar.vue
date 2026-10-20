<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../store/useAppStore'

const router = useRouter()
const {
  searchKeyword,
  favorites,
  favoriteItems,
  isDarkMode,
  canReview,
  user,
  toggleTheme,
  logout,
  loadFavorites,
  ensureLoaded,
} = useAppStore()
function submitSearch() {
  router.push({
    name: 'home',
    query: searchKeyword.value.trim() ? { q: searchKeyword.value.trim() } : {},
  })
}
async function signOut() {
  await logout()
  router.push({ name: 'home' })
}
onMounted(async () => {
  await ensureLoaded()
  if (user.value) loadFavorites().catch(() => {})
})
watch(user, (value) => {
  if (value) loadFavorites().catch(() => {})
  else {
    favorites.value = []
    favoriteItems.value = []
  }
})
</script>

<template>
  <header class="site-header">
    <nav class="nav-bar" aria-label="主导航">
      <RouterLink class="brand" to="/">EarthMC 国区玩家文库</RouterLink>
      <form class="nav-search" role="search" @submit.prevent="submitSearch">
        <label class="sr-only" for="global-search">搜索文献</label
        ><input
          id="global-search"
          v-model="searchKeyword"
          type="search"
          placeholder="搜索标题、作者或正文"
        /><button class="button" type="submit">搜索</button>
      </form>
      <div class="nav-links">
        <RouterLink to="/literature">文献目录</RouterLink
        ><RouterLink to="/periods">历史时期</RouterLink
        ><RouterLink to="/about-documents">文库制度</RouterLink>
        <RouterLink v-if="user" to="/submit">我要投稿</RouterLink
        ><RouterLink v-if="user" to="/submissions">投稿记录</RouterLink>
        <RouterLink v-if="user" to="/me">个人中心</RouterLink>
        <RouterLink v-if="user" to="/me/favorites" class="favorites-link"
          >我的收藏<span v-if="favorites.length" class="nav-count">{{
            favorites.length
          }}</span></RouterLink
        >
        <RouterLink v-if="canReview" to="/admin">审核后台</RouterLink>
        <RouterLink v-if="!user" to="/login">登录</RouterLink
        ><RouterLink v-if="!user" to="/register">注册</RouterLink>
        <button v-if="user" class="button button-quiet" type="button" @click="signOut">
          退出（{{ user.username }}）
        </button>
        <button class="button button-quiet" type="button" @click="toggleTheme">
          {{ isDarkMode ? '浅色模式' : '深色模式' }}
        </button>
      </div>
    </nav>
  </header>
</template>
