<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../services/apiClient'
const documents = ref([])
const error = ref('')
onMounted(async () => {
  try {
    documents.value = await api.get('/meta-documents')
  } catch (cause) {
    error.value = cause.message
  }
})
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">ARCHIVE GOVERNANCE</p>
        <h1>文库制度与元文献</h1>
        <p class="muted">
          这里发布收录计划、编目规则和审核制度，现行制度由文库实际制定并审核后发布。
        </p>
      </div>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div v-if="documents.length" class="submission-list">
      <article v-for="doc in documents" :key="doc.id" class="stat-card">
        <span class="tag"
          >{{ doc.category.name }} ·
          {{ doc.versions?.[0]?.version ? `v${doc.versions[0].version}` : '未标版本' }}</span
        >
        <h2>
          <RouterLink :to="`/about-documents/${doc.slug}`">{{ doc.title }}</RouterLink>
        </h2>
        <p>{{ doc.summary }}</p>
        <span class="muted">{{ doc.status === 'CURRENT' ? '现行有效' : '已被替代' }}</span>
      </article>
    </div>
    <div v-else-if="!error" class="empty-state">
      <h2>制度文件尚未发布</h2>
      <p>为避免把草案误作正式规定，此处只展示经过授权发布的现行或历史版本。</p>
    </div>
  </section>
</template>
