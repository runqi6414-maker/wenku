<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../services/apiClient'
const items = ref([])
const error = ref('')
onMounted(async () => {
  try {
    items.value = await api.get('/categories/04/subcategories')
  } catch (cause) {
    error.value = cause.message
  }
})
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">POLITICAL DOCUMENT SUBCATEGORIES</p>
        <h1>政论文书分期</h1>
        <p class="muted">这十个分期是“政论文书”的子分类，只用于编目政论文书类文献。</p>
      </div>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div v-if="items.length" class="stats-grid">
      <RouterLink
        v-for="item in items"
        :key="item.id"
        class="stat-card period-card"
        :to="`/literature/political-subcategories/${item.code}`"
        ><span class="muted">政论文书 · 子分类 {{ item.code }}</span><strong>{{ item.name }}</strong
        ><span>浏览该子分类文献 →</span></RouterLink
      >
    </div>
    <div v-else-if="!error" class="empty-state">
      <h2>政论文书子分类暂不可用</h2>
      <p>数据库分类尚未初始化。</p>
    </div>
  </section>
</template>
