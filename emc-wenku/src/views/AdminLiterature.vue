<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { categories, politicalSubcategories } from '../utils/constants'
import { api } from '../services/apiClient'
const status = ref('PUBLISHED')
const records = ref([])
const selected = ref(null)
const error = ref('')
const notice = ref('')
const form = reactive({
  title: '',
  authorName: '',
  category: '',
  subcategory: '',
  summary: '',
  content: '',
  sourceDescription: '',
  sourceUrl: '',
  sourceDate: '',
  changeNote: '',
})
watch(
  () => form.category,
  (category) => {
    if (category !== '04') form.subcategory = ''
  },
)
const statusLabel = computed(
  () => ({ PUBLISHED: '公开', WITHDRAWN: '已撤回', HIDDEN: '已隐藏' })[status.value],
)
async function load() {
  try {
    const result = await api.get('/admin/literature', { status: status.value, pageSize: 100 })
    records.value = result.items
  } catch (cause) {
    error.value = cause.message
  }
}
function edit(item) {
  selected.value = item
  Object.assign(form, {
    title: item.title,
    authorName: item.author,
    category: item.category,
    subcategory: item.subcategory || '',
    summary: item.summary,
    content: item.content,
    sourceDescription: item.source?.description || '',
    sourceUrl: item.source?.url || '',
    sourceDate: item.date || '',
    changeNote: '',
  })
}
async function save() {
  if (!selected.value) return
  error.value = ''
  try {
    await api.patch(`/admin/literature/${selected.value.id}`, { ...form })
    notice.value = '修订已保存为新版本。'
    selected.value = null
    await load()
  } catch (cause) {
    error.value = cause.message
  }
}
async function setStatus(item, nextStatus) {
  const action = nextStatus === 'PUBLISHED' ? '恢复公开' : nextStatus === 'HIDDEN' ? '隐藏' : '撤回'
  if (!window.confirm(`确定${action}《${item.title}》吗？`)) return
  try {
    await api.patch(`/admin/literature/${item.id}/status`, { status: nextStatus })
    notice.value = `文献状态已更新：${action}。`
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
        <p class="eyebrow">OFFICIAL CATALOGUE</p>
        <h1>正式馆藏管理</h1>
        <p class="muted">修改会保存完整版本快照；撤回或隐藏的记录仍保留在数据库与审计日志。</p>
      </div>
    </div>
    <div class="admin-table-toolbar">
      <label
        >状态<select v-model="status" @change="load">
          <option value="PUBLISHED">公开</option>
          <option value="WITHDRAWN">已撤回</option>
          <option value="HIDDEN">已隐藏</option>
        </select></label
      ><span class="muted">{{ statusLabel }} · {{ records.length }} 篇</span>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="citation-message" role="status">{{ notice }}</p>
    <div class="table-scroll">
      <table class="admin-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>标题</th>
            <th>作者</th>
            <th>分类</th>
            <th>政论文书子分类</th>
            <th>浏览</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in records" :key="item.id">
            <td>{{ item.publicCode }}</td>
            <td>{{ item.title }}</td>
            <td>{{ item.author }}</td>
            <td>{{ categories.find((entry) => entry.id === item.category)?.name }}</td>
            <td>{{ politicalSubcategories.find((entry) => entry.id === item.subcategory)?.name || '—' }}</td>
            <td>{{ item.views }}</td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" @click="edit(item)">修订</button
                ><button
                  v-if="item.status !== 'PUBLISHED'"
                  class="text-button"
                  type="button"
                  @click="setStatus(item, 'PUBLISHED')"
                >
                  恢复公开</button
                ><button
                  v-if="item.status === 'PUBLISHED'"
                  class="text-button"
                  type="button"
                  @click="setStatus(item, 'HIDDEN')"
                >
                  隐藏</button
                ><button
                  v-if="item.status === 'PUBLISHED'"
                  class="text-button danger-text"
                  type="button"
                  @click="setStatus(item, 'WITHDRAWN')"
                >
                  撤回
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <form v-if="selected" class="stack-form form-panel admin-edit-form" @submit.prevent="save">
      <div class="page-heading">
        <div>
          <p class="eyebrow">VERSIONED REVISION</p>
          <h2>修订 {{ selected.publicCode }}</h2>
        </div>
        <button class="text-button" type="button" @click="selected = null">取消</button>
      </div>
      <label>标题<input v-model.trim="form.title" maxlength="240" required /></label
      ><label>原文作者<input v-model.trim="form.authorName" maxlength="160" required /></label>
      <div class="form-row">
        <label
          >分类<select v-model="form.category">
            <option v-for="item in categories" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select></label
        ><label v-if="form.category === '04'"
          >政论文书分期<select v-model="form.subcategory">
            <option value="">未确定</option>
            <option v-for="item in politicalSubcategories" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select></label
        >
      </div>
      <label>原始形成时间<input v-model.trim="form.sourceDate" maxlength="80" /></label
      ><label>摘要<textarea v-model.trim="form.summary" rows="3" maxlength="3000" /></label
      ><label>正文<textarea v-model="form.content" rows="12" required /></label
      ><label>来源说明<textarea v-model.trim="form.sourceDescription" rows="3" required /></label
      ><label>来源 URL<input v-model.trim="form.sourceUrl" type="url" /></label
      ><label>修订说明<input v-model.trim="form.changeNote" maxlength="1000" required /></label
      ><button class="button button-primary" type="submit">保存新版本</button>
    </form>
    <p v-if="!records.length && !error" class="empty-state">当前状态下没有正式文献。</p>
  </section>
</template>
