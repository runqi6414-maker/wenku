<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/apiClient'

const route = useRoute()
const item = ref(null)
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
watch(
  () => route.params.id,
  async (id) => {
    item.value = null
    error.value = ''
    try {
      item.value = await api.get(`/submissions/${id}`)
    } catch (cause) {
      error.value = cause.message
    }
  },
  { immediate: true },
)
</script>

<template>
  <section v-if="item" class="detail-page">
    <RouterLink class="back-link" to="/submissions">← 返回我的投稿</RouterLink>
    <p class="eyebrow">SUBMISSION · {{ labels[item.status] ?? item.status }}</p>
    <h1>{{ item.title }}</h1>
    <p class="muted">
      作者：{{ item.authorName }} · 更新时间：{{ new Date(item.updatedAt).toLocaleString() }}
    </p>
    <p class="lead">{{ item.summary }}</p>
    <div class="source-note">
      <h2>来源说明</h2>
      <p>{{ item.sourceDescription || '暂未填写' }}</p>
    </div>
    <pre class="article-content">{{ item.content }}</pre>
    <div v-if="item.reviews?.length" class="source-note">
      <h2>审核记录</h2>
      <ol>
        <li v-for="(review, index) in item.reviews" :key="index">
          <strong>{{ labels[review.status] ?? review.status }}</strong> · {{ review.reviewer }} ·
          {{ new Date(review.createdAt).toLocaleString() }}
          <p>{{ review.comment || '审核意见为空' }}</p>
        </li>
      </ol>
    </div>
    <RouterLink
      v-if="['draft', 'revision_requested'].includes(item.status)"
      class="button button-primary"
      :to="`/submissions/${item.id}/edit`"
      >编辑并重新提交</RouterLink
    ><RouterLink
      v-if="item.status === 'published' && item.publishedLiteratureId"
      class="button"
      :to="`/literature/${item.publishedLiteratureId}`"
      >查看正式馆藏</RouterLink
    >
  </section>
  <section v-else class="empty-state">
    <h1>{{ error ? '无法打开投稿' : '正在读取投稿…' }}</h1>
    <p v-if="error">{{ error }}</p>
    <RouterLink v-if="error" class="button" to="/submissions">返回投稿列表</RouterLink>
  </section>
</template>
