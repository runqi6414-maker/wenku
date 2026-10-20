<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/apiClient'
const route = useRoute()
const document = ref(null)
const error = ref('')
watch(
  () => route.params.slug,
  async (slug) => {
    document.value = null
    error.value = ''
    try {
      document.value = await api.get(`/meta-documents/${encodeURIComponent(slug)}`)
    } catch (cause) {
      error.value = cause.message
    }
  },
  { immediate: true },
)
</script>

<template>
  <article v-if="document" class="detail-page">
    <RouterLink class="back-link" to="/about-documents">← 返回元文献目录</RouterLink>
    <p class="eyebrow">
      {{ document.category.name }} · {{ document.status === 'CURRENT' ? '现行有效' : '历史版本' }}
    </p>
    <h1>{{ document.title }}</h1>
    <p class="lead">{{ document.summary }}</p>
    <section v-for="version in document.versions" :key="version.id" class="meta-version">
      <h2>
        版本 {{ version.version }} ·
        {{
          version.effectiveAt ? new Date(version.effectiveAt).toLocaleDateString() : '未标生效日'
        }}
      </h2>
      <pre class="article-content">{{ version.content }}</pre>
      <p class="muted">修订说明：{{ version.changeNote || '未提供' }}</p>
    </section>
  </article>
  <section v-else class="empty-state">
    <h1>{{ error ? '元文献暂不可用' : '正在读取元文献…' }}</h1>
    <p v-if="error">{{ error }}</p>
    <RouterLink v-if="error" class="button" to="/about-documents">返回元文献目录</RouterLink>
  </section>
</template>
