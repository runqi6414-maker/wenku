<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getCategoryName, getPeriodName } from '../utils/constants'
import { useAppStore } from '../store/useAppStore'

const route = useRoute()
const { literatureList, favorites, toggleFavorite, incrementViews } = useAppStore()
const item = computed(() => literatureList.value.find((entry) => entry.id === route.params.id))
const citationMessage = ref('')

watch(
  () => route.params.id,
  (id) => incrementViews(String(id ?? '')),
  { immediate: true },
)
watch(
  item,
  (record) => {
    document.title = record
      ? `${record.title} | EarthMC 国区玩家文库`
      : '文献未找到 | EarthMC 国区玩家文库'
  },
  { immediate: true },
)
onUnmounted(() => {
  document.title = 'EarthMC 国区玩家文库'
})

async function copyCitation() {
  if (!item.value) return
  const citation = `${item.value.author}：《${item.value.title}》[${item.value.id}]，${item.value.date}。`
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
    <RouterLink class="back-link" to="/">← 返回文库</RouterLink>
    <p class="eyebrow">{{ item.date }} · {{ item.author }}</p>
    <h1>{{ item.title }}</h1>
    <div class="tag-row">
      <span class="tag">{{ getCategoryName(item.category) }}</span>
      <span class="tag">{{ getPeriodName(item.period) }}</span>
    </div>
    <p class="lead">{{ item.summary }}</p>
    <aside
      v-if="item.source?.name || item.source?.identifier || item.source?.note"
      class="source-note"
    >
      <h2>来源与编目说明</h2>
      <p v-if="item.source.name"><strong>来源：</strong>{{ item.source.name }}</p>
      <p v-if="item.source.identifier"><strong>文件编号：</strong>{{ item.source.identifier }}</p>
      <p v-if="item.source.url">
        <strong>链接：</strong
        ><a :href="item.source.url" target="_blank" rel="noopener noreferrer">{{
          item.source.url
        }}</a>
      </p>
      <p>
        <strong>核实状态：</strong
        >{{
          item.source.verificationStatus === 'verified'
            ? '已核实'
            : item.source.verificationStatus === 'needs-review'
              ? '需要复核'
              : '待核实'
        }}
      </p>
      <p v-if="item.source.visibility === 'internal'">
        <strong>可见范围标记：</strong>内部。此标记不构成访问控制。
      </p>
      <p v-if="item.source.note">{{ item.source.note }}</p>
    </aside>
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
      <button class="button button-quiet" type="button" @click="copyCitation">复制引用</button>
    </div>
    <p v-if="citationMessage" class="citation-message" role="status">{{ citationMessage }}</p>
  </article>
  <section v-else class="empty-state">
    <h1>未找到这篇文献</h1>
    <RouterLink class="button" to="/">返回首页</RouterLink>
  </section>
</template>
