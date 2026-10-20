<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../services/apiClient'

const items = ref([])
const error = ref('')
const labels = {
  draft: '草稿',
  pending: '待审核',
  in_review: '审核中',
  revision_requested: '待修改',
  approved: '已通过待发布',
  published: '已发布',
  rejected: '未通过',
  withdrawn: '已撤回',
}
onMounted(async () => {
  try {
    items.value = await api.get('/submissions/mine')
  } catch (cause) {
    error.value = cause.message
  }
})
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">SUBMISSION HISTORY</p>
        <h1>我的投稿</h1>
        <p class="muted">投稿状态和审核意见仅对你与授权审核人员开放。</p>
      </div>
      <RouterLink class="button button-primary" to="/submit">新建投稿</RouterLink>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div v-if="items.length" class="submission-list">
      <article v-for="item in items" :key="item.id" class="stat-card submission-card">
        <span class="tag">{{ labels[item.status] ?? item.status }}</span>
        <h2>
          <RouterLink :to="`/submissions/${item.id}`">{{ item.title || '无标题草稿' }}</RouterLink>
        </h2>
        <p class="muted">
          {{ item.authorName || '未填写作者' }} · 更新于
          {{ new Date(item.updatedAt).toLocaleString() }}
        </p>
        <RouterLink
          v-if="['draft', 'revision_requested'].includes(item.status)"
          class="text-button"
          :to="`/submissions/${item.id}/edit`"
          >继续编辑</RouterLink
        >
      </article>
    </div>
    <div v-else-if="!error" class="empty-state">
      <h2>还没有投稿</h2>
      <p>你保存的草稿和提交的稿件会显示在这里。</p>
      <RouterLink class="button" to="/submit">开始投稿</RouterLink>
    </div>
  </section>
</template>
