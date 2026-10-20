<script setup>
import { useAppStore } from '../store/useAppStore'
import { useRouter } from 'vue-router'
import { getCategoryName, getPeriodName } from '../utils/constants'

const props = defineProps({ litItem: { type: Object, required: true } })
const { favorites, toggleFavorite } = useAppStore()
const router = useRouter()
async function favorite(id) {
  try {
    await toggleFavorite(id, props.litItem)
  } catch (error) {
    if (error.status === 401)
      router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
  }
}
</script>

<template>
  <article class="literature-card">
    <div class="tag-row">
      <span class="tag">{{ getCategoryName(litItem.category) }}</span
      ><span class="tag">{{ getPeriodName(litItem.period) }}</span>
    </div>
    <h2>
      <RouterLink :to="`/literature/${litItem.id}`">{{ litItem.title }}</RouterLink>
    </h2>
    <p class="muted">作者：{{ litItem.author }}</p>
    <p class="summary">{{ litItem.summary }}</p>
    <footer class="card-footer">
      <span>{{ litItem.views ?? 0 }} 次浏览 · {{ litItem.date }}</span>
      <button
        class="button button-quiet"
        type="button"
        :aria-pressed="favorites.includes(litItem.id)"
        @click="favorite(litItem.id)"
      >
        {{ favorites.includes(litItem.id) ? '♥ 已收藏' : '♡ 收藏' }}
      </button>
    </footer>
  </article>
</template>
