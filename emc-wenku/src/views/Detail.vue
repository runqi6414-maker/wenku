<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getCategoryName, getPeriodName } from '../utils/constants'
import { useAppStore } from '../store/useAppStore'

const route = useRoute()
const { literatureList, favorites, toggleFavorite, incrementViews } = useAppStore()
const item = computed(() => literatureList.value.find((entry) => entry.id === route.params.id))

watch(
  () => route.params.id,
  (id) => incrementViews(String(id ?? '')),
  { immediate: true },
)
</script>

<template>
  <article v-if="item" class="detail-page">
    <RouterLink class="back-link" to="/">← 返回文库</RouterLink>
    <p class="eyebrow">{{ item.date }} · {{ item.author }}</p>
    <h1>{{ item.title }}</h1>
    <div class="tag-row">
      <span class="tag">{{ getCategoryName(item.category) }}</span>
      <span class="tag">{{ getPeriodName(item.period) }}</span>
    </div>
    <p class="lead">{{ item.summary }}</p>
    <pre class="article-content">{{ item.content }}</pre>
    <div class="detail-actions">
      <button
        class="button"
        type="button"
        :aria-pressed="favorites.includes(item.id)"
        @click="toggleFavorite(item.id)"
      >
        {{ favorites.includes(item.id) ? '♥ 已收藏' : '♡ 收藏这篇文献' }}
      </button>
      <span class="muted">{{ item.views ?? 0 }} 次浏览</span>
    </div>
  </article>
  <section v-else class="empty-state">
    <h1>未找到这篇文献</h1>
    <RouterLink class="button" to="/">返回首页</RouterLink>
  </section>
</template>
