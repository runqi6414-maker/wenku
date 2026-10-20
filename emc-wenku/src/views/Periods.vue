<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../services/apiClient'
const items = ref([])
const error = ref('')
onMounted(async () => {
  try {
    items.value = await api.get('/periods')
  } catch (cause) {
    error.value = cause.message
  }
})
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">HISTORICAL PERIODS</p>
        <h1>历史时期</h1>
        <p class="muted">按文献所涉历史背景与事件归属浏览，不以投稿时间断代。</p>
      </div>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div v-if="items.length" class="stats-grid">
      <RouterLink
        v-for="item in items"
        :key="item.id"
        class="stat-card period-card"
        :to="`/periods/${item.code}`"
        ><span class="muted">第 {{ item.code }} 期</span><strong>{{ item.name }}</strong
        ><span>浏览该时期文献 →</span></RouterLink
      >
    </div>
    <div v-else-if="!error" class="empty-state">
      <h2>时期目录暂不可用</h2>
      <p>数据库分类尚未初始化。</p>
    </div>
  </section>
</template>
