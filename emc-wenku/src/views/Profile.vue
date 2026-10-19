<script setup>
import { computed } from 'vue'
import LitCard from '../components/LitCard.vue'
import { useAppStore } from '../store/useAppStore'

const { literatureList, favorites, clearFavorites } = useAppStore()
const savedItems = computed(() =>
  literatureList.value.filter((item) => favorites.value.includes(item.id)),
)

function clearAll() {
  if (savedItems.value.length && window.confirm('确定清空全部收藏吗？')) clearFavorites()
}
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">PERSONAL LIBRARY</p>
        <h1>我的收藏</h1>
        <p class="muted">已收藏 {{ savedItems.length }} 篇文献</p>
      </div>
      <button v-if="savedItems.length" class="button" type="button" @click="clearAll">
        清空收藏
      </button>
    </div>
    <div v-if="savedItems.length" class="literature-grid">
      <LitCard v-for="item in savedItems" :key="item.id" :lit-item="item" />
    </div>
    <div v-else class="empty-state">
      <h2>还没有收藏</h2>
      <p>在文献卡片上点击收藏，就能在这里快速找到它。</p>
      <RouterLink class="button" to="/">浏览文库</RouterLink>
    </div>
  </section>
</template>
