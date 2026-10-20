<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import LitCard from '../components/LitCard.vue'
import { api } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
const route = useRoute()
const { literatureList, loadLiterature } = useAppStore()
const period = ref(null)
const error = ref('')
const items = computed(() => literatureList.value)
watch(
  () => route.params.id,
  async (periodId) => {
    period.value = null
    error.value = ''
    try {
      const periods = await api.get('/periods')
      period.value = periods.find((entry) => entry.code === periodId)
      if (!period.value) throw new Error('历史时期不存在。')
      await loadLiterature({ periodId, pageSize: 50 })
    } catch (cause) {
      error.value = cause.message
    }
  },
  { immediate: true },
)
</script>

<template>
  <section>
    <RouterLink class="back-link" to="/periods">← 返回历史时期</RouterLink>
    <div class="page-heading">
      <div>
        <p class="eyebrow">HISTORICAL PERIOD</p>
        <h1>{{ period?.name || '时期文献' }}</h1>
        <p class="muted">共收录 {{ items.length }} 篇文献</p>
      </div>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div v-if="items.length" class="literature-grid">
      <LitCard v-for="item in items" :key="item.id" :lit-item="item" />
    </div>
    <div v-else-if="!error" class="empty-state">
      <h2>该时期暂未收录文献</h2>
      <p>文献需经审核并正式发布后才会显示。</p>
    </div>
  </section>
</template>
