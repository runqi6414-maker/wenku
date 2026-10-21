<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import LitCard from '../components/LitCard.vue'
import { api } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
const route = useRoute()
const { literatureList, loadLiterature } = useAppStore()
const subcategory = ref(null)
const error = ref('')
const items = computed(() => literatureList.value)
watch(
  () => route.params.id,
  async (subcategoryCode) => {
    subcategory.value = null
    error.value = ''
    try {
      const items = await api.get('/categories/04/subcategories')
      subcategory.value = items.find((entry) => entry.code === subcategoryCode)
      if (!subcategory.value) throw new Error('政论文书子分类不存在。')
      await loadLiterature({ categoryId: '04', subcategoryId: subcategoryCode, pageSize: 50 })
    } catch (cause) {
      error.value = cause.message
    }
  },
  { immediate: true },
)
</script>

<template>
  <section>
    <RouterLink class="back-link" to="/literature/political-subcategories">← 返回政论文书分期</RouterLink>
    <div class="page-heading">
      <div>
        <p class="eyebrow">POLITICAL DOCUMENT SUBCATEGORY</p>
        <h1>{{ subcategory?.name || '政论文书子分类' }}</h1>
        <p class="muted">共收录 {{ items.length }} 篇文献</p>
      </div>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div v-if="items.length" class="literature-grid">
      <LitCard v-for="item in items" :key="item.id" :lit-item="item" />
    </div>
    <div v-else-if="!error" class="empty-state">
      <h2>该子分类暂未收录文献</h2>
      <p>文献需经审核并正式发布后才会显示。</p>
    </div>
  </section>
</template>
