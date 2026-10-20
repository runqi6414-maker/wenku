<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCategoryName, getPeriodName } from '../utils/constants'
import { useAppStore } from '../store/useAppStore'

const route = useRoute()
const router = useRouter()
const { literatureList, favorites, getLiterature, toggleFavorite } = useAppStore()
const item = computed(() =>
  literatureList.value.find(
    (entry) => entry.id === route.params.id || entry.publicCode === route.params.id,
  ),
)
const loadError = ref('')
const citationMessage = ref('')
watch(
  () => route.params.id,
  async (id) => {
    loadError.value = ''
    try {
      await getLiterature(String(id ?? ''))
    } catch (error) {
      loadError.value = error.message
    }
  },
  { immediate: true },
)
watch(
  item,
  (record) => {
    document.title = record
      ? `${record.title} | EarthMC 国区玩家文库`
      : '文献 | EarthMC 国区玩家文库'
  },
  { immediate: true },
)
onUnmounted(() => {
  document.title = 'EarthMC 国区玩家文库'
})

async function saveFavorite() {
  try {
    await toggleFavorite(item.value.id, item.value)
  } catch (error) {
    if (error.status === 401) router.push({ name: 'login', query: { redirect: route.fullPath } })
    else citationMessage.value = error.message
  }
}
async function copyCitation() {
  if (!item.value) return
  const citation = `${item.value.author}：《${item.value.title}》[${item.value.publicCode || item.value.id}]，${item.value.date}。`
  try {
    await navigator.clipboard.writeText(citation)
    citationMessage.value = '引用格式已复制。'
  } catch {
    citationMessage.value = `复制失败，请手动复制：${citation}`
  }
}
</script>

<template>
  <article v-if="item" class="detail-page">
    <RouterLink class="back-link" to="/literature">← 返回文库</RouterLink>
    <p class="eyebrow">{{ item.publicCode }} · {{ item.date }} · {{ item.author }}</p>
    <h1>{{ item.title }}</h1>
    <div class="tag-row">
      <span class="tag">{{ getCategoryName(item.category) }}</span
      ><span class="tag">{{ getPeriodName(item.period) }}</span>
    </div>
    <p class="lead">{{ item.summary }}</p>
    <aside v-if="item.source?.description || item.source?.url" class="source-note">
      <h2>来源与编目说明</h2>
      <p v-if="item.source.description">{{ item.source.description }}</p>
      <p v-if="item.source.url">
        <a :href="item.source.url" target="_blank" rel="noopener noreferrer">查看原始来源</a>
      </p>
    </aside>
    <pre class="article-content">{{ item.content }}</pre>
    <div class="detail-actions">
      <button
        class="button"
        type="button"
        :aria-pressed="favorites.includes(item.id)"
        @click="saveFavorite"
      >
        {{ favorites.includes(item.id) ? '♥ 已收藏' : '♡ 收藏这篇文献' }}</button
      ><span class="muted">{{ item.views ?? 0 }} 次浏览</span
      ><button class="button button-quiet" type="button" @click="copyCitation">复制引用</button>
    </div>
    <p v-if="citationMessage" class="citation-message" role="status">{{ citationMessage }}</p>
    <section v-if="item.versions?.length" class="source-note">
      <h2>版本记录</h2>
      <ul>
        <li v-for="version in item.versions" :key="version.version">
          第 {{ version.version }} 版 · {{ version.changeNote }} ·
          {{ new Date(version.createdAt).toLocaleDateString() }}
        </li>
      </ul>
    </section>
  </article>
  <section v-else class="empty-state">
    <h1>{{ loadError ? '无法打开文献' : '正在读取文献…' }}</h1>
    <p v-if="loadError">{{ loadError }}</p>
    <RouterLink v-if="loadError" class="button" to="/literature">返回目录</RouterLink>
  </section>
</template>
