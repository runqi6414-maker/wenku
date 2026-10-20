<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import LitCard from '../components/LitCard.vue'
import { useAppStore } from '../store/useAppStore'

const route = useRoute()
const { user, favorites, favoriteItems, loadFavorites, clearFavorites } = useAppStore()
const error = ref('')
const isFavoritesPage = () => route.path.endsWith('/favorites')
onMounted(() =>
  loadFavorites().catch((cause) => {
    error.value = cause.message
  }),
)
async function clearAll() {
  if (!favorites.value.length || !window.confirm('确定清空账号的全部收藏吗？')) return
  try {
    await clearFavorites()
  } catch (cause) {
    error.value = cause.message
  }
}
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">MY LIBRARY</p>
        <h1>{{ isFavoritesPage() ? '我的收藏' : '个人中心' }}</h1>
        <p class="muted">{{ user?.username }} · 收藏与投稿数据由服务端保存。</p>
      </div>
      <button
        v-if="isFavoritesPage() && favorites.length"
        class="button"
        type="button"
        @click="clearAll"
      >
        清空收藏
      </button>
    </div>
    <div v-if="!isFavoritesPage()" class="stats-grid">
      <RouterLink class="stat-card" to="/submissions"
        ><span class="muted">我的投稿</span><strong>查看记录 →</strong></RouterLink
      ><RouterLink class="stat-card" to="/me/favorites"
        ><span class="muted">收藏文献</span><strong>{{ favorites.length }} 篇 →</strong></RouterLink
      ><RouterLink class="stat-card" to="/submit"
        ><span class="muted">参与文库</span><strong>提交新文献 →</strong></RouterLink
      >
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <template v-if="isFavoritesPage()"
      ><div v-if="favoriteItems.length" class="literature-grid">
        <LitCard v-for="item in favoriteItems" :key="item.id" :lit-item="item" />
      </div>
      <div v-else class="empty-state">
        <h2>还没有收藏</h2>
        <p>登录后在文献卡片上点击收藏，可以在这里找到它们。</p>
        <RouterLink class="button" to="/literature">浏览文库</RouterLink>
      </div></template
    >
  </section>
</template>
