<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from '../services/apiClient'
const categories = ref([])
const documents = ref([])
const draft = ref(null)
const error = ref('')
const notice = ref('')
const form = reactive({
  title: '',
  slug: '',
  categoryCode: 'M01',
  summary: '',
  content: '',
  changeNote: '初版',
})
async function load() {
  try {
    ;[categories.value, documents.value] = await Promise.all([
      api.get('/admin/meta-document-categories'),
      api.get('/meta-documents'),
    ])
  } catch (cause) {
    error.value = cause.message
  }
}
async function createDraft() {
  error.value = ''
  try {
    draft.value = await api.post('/admin/meta-documents', { ...form })
    notice.value = '草稿已保存。请检查内容后再发布。'
  } catch (cause) {
    error.value = cause.message
  }
}
async function publishDraft() {
  if (!draft.value || !window.confirm('确认将此元文献版本公开发布并标记为现行规则？')) return
  try {
    await api.post(`/admin/meta-documents/${draft.value.id}/publish`, {})
    notice.value = '元文献已发布。'
    draft.value = null
    Object.assign(form, {
      title: '',
      slug: '',
      categoryCode: 'M01',
      summary: '',
      content: '',
      changeNote: '初版',
    })
    await load()
  } catch (cause) {
    error.value = cause.message
  }
}
async function retire(doc, status) {
  if (
    !window.confirm(
      status === 'WITHDRAWN'
        ? `确认撤回《${doc.title}》？`
        : `确认将《${doc.title}》标记为已替代？`,
    )
  )
    return
  try {
    await api.post(`/admin/meta-documents/${doc.id}/retire`, { status })
    await load()
  } catch (cause) {
    error.value = cause.message
  }
}
onMounted(load)
</script>

<template>
  <section>
    <RouterLink class="back-link" to="/admin">← 返回管理后台</RouterLink>
    <div class="page-heading">
      <div>
        <p class="eyebrow">GOVERNANCE DOCUMENTS</p>
        <h1>元文献管理</h1>
        <p class="muted">制度内容须由文库实际制定；发布后保留版本记录。</p>
      </div>
    </div>
    <form class="stack-form form-panel" @submit.prevent="createDraft">
      <h2>新建制度草稿</h2>
      <label>标题<input v-model.trim="form.title" maxlength="240" required /></label
      ><label
        >URL 标识<input
          v-model.trim="form.slug"
          pattern="[a-z0-9-]+"
          maxlength="180"
          required /></label
      ><label
        >元文献分类<select v-model="form.categoryCode">
          <option v-for="item in categories" :key="item.code" :value="item.code">
            {{ item.code }} · {{ item.name }}
          </option>
        </select></label
      ><label>内容摘要<textarea v-model.trim="form.summary" maxlength="3000" rows="3" /></label
      ><label>正文<textarea v-model="form.content" required rows="12" /></label
      ><label>修订说明<input v-model.trim="form.changeNote" maxlength="1000" required /></label>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <p v-if="notice" class="citation-message" role="status">{{ notice }}</p>
      <div class="row-actions">
        <button class="button" type="submit">保存草稿</button
        ><button v-if="draft" class="button button-primary" type="button" @click="publishDraft">
          发布此版本
        </button>
      </div>
    </form>
    <section class="submission-list">
      <h2>已发布元文献</h2>
      <article v-for="doc in documents" :key="doc.id" class="stat-card">
        <span class="tag"
          >{{ doc.category.name }} · {{ doc.status === 'CURRENT' ? '现行有效' : '已替代' }}</span
        >
        <h3>{{ doc.title }}</h3>
        <p>{{ doc.summary }}</p>
        <RouterLink :to="`/about-documents/${doc.slug}`">查看公开页面</RouterLink>
        <div class="row-actions">
          <button
            v-if="doc.status === 'CURRENT'"
            class="text-button"
            type="button"
            @click="retire(doc, 'SUPERSEDED')"
          >
            标记已替代</button
          ><button
            v-if="doc.status === 'CURRENT'"
            class="text-button danger-text"
            type="button"
            @click="retire(doc, 'WITHDRAWN')"
          >
            撤回
          </button>
        </div>
      </article>
      <p v-if="!documents.length" class="muted">当前没有正式发布的制度文本。</p>
    </section>
  </section>
</template>
