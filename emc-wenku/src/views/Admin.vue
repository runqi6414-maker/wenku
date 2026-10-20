<script setup>
import { onMounted, ref, watch } from 'vue'
import { api } from '../services/apiClient'

const status = ref('PENDING')
const rows = ref([])
const expanded = ref('')
const error = ref('')
const notice = ref('')
const busyId = ref('')
async function loadQueue() {
  error.value = ''
  try {
    rows.value = await api.get('/admin/submissions', { status: status.value })
  } catch (cause) {
    error.value = cause.message
  }
}
async function act(row, action) {
  const comment = ['return', 'reject'].includes(action)
    ? window.prompt(action === 'return' ? '请填写退回修改的具体意见' : '请填写不予收录的理由')
    : window.prompt('审核意见（可留空）')
  if (comment === null) return
  busyId.value = row.id
  error.value = ''
  notice.value = ''
  try {
    if (action === 'publish') {
      const result = await api.post(`/admin/submissions/${row.id}/publish`)
      notice.value = `已发布为 ${result.publicCode}。`
    } else {
      await api.post(`/admin/submissions/${row.id}/review`, { action, comment })
      notice.value =
        action === 'approve' ? '审核通过；需要管理员发布后才会公开。' : '审核记录已保存。'
    }
    await loadQueue()
  } catch (cause) {
    error.value = cause.message
  } finally {
    busyId.value = ''
  }
}
onMounted(loadQueue)
watch(status, loadQueue)
</script>

<template>
  <section class="admin-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">REVIEW WORKSPACE</p>
        <h1>投稿审核</h1>
        <p class="muted">投稿与正式馆藏分开保存；只有发布操作会生成公开文献。</p>
      </div>
    </div>
    <nav class="admin-shortcuts" aria-label="管理功能">
      <RouterLink to="/admin/literature">正式馆藏</RouterLink
      ><RouterLink to="/admin/categories">文献分类</RouterLink
      ><RouterLink to="/admin/periods">历史时期</RouterLink
      ><RouterLink to="/admin/meta-documents">元文献</RouterLink
      ><RouterLink to="/admin/users">用户与角色</RouterLink
      ><RouterLink to="/admin/audit-logs">操作日志</RouterLink>
    </nav>
    <div class="admin-table-toolbar">
      <label
        >队列状态<select v-model="status">
          <option value="PENDING">待审核</option>
          <option value="IN_REVIEW">审核中</option>
          <option value="REVISION_REQUESTED">待修改</option>
          <option value="APPROVED">已通过待发布</option>
          <option value="REJECTED">未通过</option>
          <option value="PUBLISHED">已发布</option>
        </select></label
      ><button class="button" type="button" @click="loadQueue">刷新</button>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="citation-message" role="status">{{ notice }}</p>
    <div v-if="rows.length" class="submission-list">
      <article v-for="row in rows" :key="row.id" class="stat-card submission-card">
        <div class="page-heading">
          <div>
            <span class="tag">{{ row.status }}</span>
            <h2>{{ row.title }}</h2>
            <p class="muted">
              作者：{{ row.authorName }} · 投稿人：{{ row.submitter?.username }} ·
              {{ new Date(row.submittedAt || row.createdAt).toLocaleString() }}
            </p>
          </div>
          <button
            class="button"
            type="button"
            @click="expanded = expanded === row.id ? '' : row.id"
          >
            {{ expanded === row.id ? '收起' : '查看全文' }}
          </button>
        </div>
        <template v-if="expanded === row.id"
          ><p>{{ row.summary || '（未填写摘要）' }}</p>
          <p>
            <strong>来源：</strong>{{ row.sourceDescription || '未填写' }}
            <a v-if="row.sourceUrl" :href="row.sourceUrl" target="_blank" rel="noopener noreferrer"
              >打开链接</a
            >
          </p>
          <pre class="article-content">{{ row.content }}</pre>
        </template>
        <div class="row-actions">
          <button
            v-if="['PENDING', 'IN_REVIEW'].includes(row.status)"
            class="button"
            :disabled="busyId === row.id"
            @click="act(row, 'start')"
          >
            标记审核中</button
          ><button
            v-if="['PENDING', 'IN_REVIEW'].includes(row.status)"
            class="button"
            :disabled="busyId === row.id"
            @click="act(row, 'return')"
          >
            退回修改</button
          ><button
            v-if="['PENDING', 'IN_REVIEW'].includes(row.status)"
            class="button"
            :disabled="busyId === row.id"
            @click="act(row, 'reject')"
          >
            拒绝收录</button
          ><button
            v-if="['PENDING', 'IN_REVIEW'].includes(row.status)"
            class="button button-primary"
            :disabled="busyId === row.id"
            @click="act(row, 'approve')"
          >
            审核通过</button
          ><button
            v-if="row.status === 'APPROVED'"
            class="button button-primary"
            :disabled="busyId === row.id"
            @click="act(row, 'publish')"
          >
            正式发布
          </button>
        </div>
      </article>
    </div>
    <div v-else class="empty-state">
      <h2>当前队列为空</h2>
      <p>当前状态筛选下没有投稿。</p>
    </div>
  </section>
</template>
