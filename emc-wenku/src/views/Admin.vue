<script setup>
import { computed, reactive, ref } from 'vue'
import { categories, periods } from '../utils/constants'
import { useAppStore } from '../store/useAppStore'

const { literatureList, saveLiterature, deleteLiterature, replaceLiterature } = useAppStore()
const dialogRef = ref(null)
const importInput = ref(null)
const editingId = ref('')
const formError = ref('')
const importMessage = ref('')
const importIsError = ref(false)
const totalViews = computed(() =>
  literatureList.value.reduce((sum, item) => sum + (Number(item.views) || 0), 0),
)

const emptyForm = () => ({
  title: '',
  author: '',
  category: '01',
  period: '10',
  summary: '',
  content: '',
  date: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10),
})
const form = reactive(emptyForm())

function openCreate() {
  editingId.value = ''
  formError.value = ''
  Object.assign(form, emptyForm())
  dialogRef.value?.showModal()
}

function openEdit(item) {
  editingId.value = item.id
  formError.value = ''
  Object.assign(form, { ...item })
  dialogRef.value?.showModal()
}

function submitForm() {
  const requiredFields = ['title', 'author', 'summary', 'content', 'date']
  if (requiredFields.some((field) => !String(form[field] ?? '').trim())) {
    formError.value = '请完整填写标题、作者、摘要、正文和发布日期。'
    return
  }

  const item = {
    id: editingId.value || `EMC-${Date.now().toString(36).toUpperCase()}`,
    title: form.title.trim(),
    author: form.author.trim(),
    category: form.category,
    period: form.period,
    summary: form.summary.trim(),
    content: form.content.trim(),
    date: form.date,
    views: editingId.value
      ? Number(literatureList.value.find((entry) => entry.id === editingId.value)?.views) || 0
      : 0,
  }
  saveLiterature(item)
  dialogRef.value?.close()
}

function removeItem(item) {
  if (window.confirm(`确定删除《${item.title}》吗？此操作无法撤销。`)) deleteLiterature(item.id)
}

function exportData() {
  const blob = new Blob([JSON.stringify(literatureList.value, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `emc-wenku-${new Date().toISOString().slice(0, 10)}.json`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function validateImportedData(parsed) {
  const rows = Array.isArray(parsed) ? parsed : parsed?.literature
  if (!Array.isArray(rows)) throw new Error('JSON 顶层必须是文献数组，或包含 literature 数组。')

  const categoryIds = new Set(categories.map((item) => item.id))
  const periodIds = new Set(periods.map((item) => item.id))
  const seenIds = new Set()

  return rows.map((row, index) => {
    const rowNumber = index + 1
    if (!row || typeof row !== 'object' || Array.isArray(row))
      throw new Error(`第 ${rowNumber} 条不是有效文献对象。`)

    const item = {
      id: String(row.id ?? '').trim(),
      title: String(row.title ?? '').trim(),
      author: String(row.author ?? '').trim(),
      period: String(row.period ?? '').trim(),
      category: String(row.category ?? '').trim(),
      summary: String(row.summary ?? '').trim(),
      content: String(row.content ?? '').trim(),
      views: Number(row.views ?? 0),
      date: String(row.date ?? '').trim(),
    }

    if (!item.id || seenIds.has(item.id)) throw new Error(`第 ${rowNumber} 条的 ID 为空或重复。`)
    if (!item.title || !item.author || !item.summary || !item.content)
      throw new Error(`第 ${rowNumber} 条缺少标题、作者、摘要或正文。`)
    if (!categoryIds.has(item.category) || !periodIds.has(item.period))
      throw new Error(`第 ${rowNumber} 条的分类或时期编号无效。`)
    if (!Number.isFinite(item.views) || item.views < 0)
      throw new Error(`第 ${rowNumber} 条的浏览量无效。`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || Number.isNaN(Date.parse(item.date)))
      throw new Error(`第 ${rowNumber} 条的日期格式应为 YYYY-MM-DD。`)
    seenIds.add(item.id)
    return item
  })
}

async function importData(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  importMessage.value = ''

  try {
    const parsed = JSON.parse(await file.text())
    const items = validateImportedData(parsed)
    if (
      !window.confirm(
        `将用文件中的 ${items.length} 条文献替换当前全部 ${literatureList.value.length} 条数据，确定继续吗？`,
      )
    )
      return
    replaceLiterature(items)
    importIsError.value = false
    importMessage.value = `已导入 ${items.length} 条文献。`
  } catch (error) {
    importIsError.value = true
    importMessage.value =
      error instanceof SyntaxError ? '文件不是有效的 JSON。' : error.message || '导入失败。'
  }
}
</script>

<template>
  <section class="admin-page">
    <div class="page-heading admin-heading">
      <div>
        <p class="eyebrow">CATALOGUE MANAGEMENT</p>
        <h1>后台管理</h1>
        <p class="muted">管理文库条目并维护本地数据。</p>
      </div>
      <button class="button button-primary" type="button" @click="openCreate">＋ 新增文献</button>
    </div>

    <div class="stats-grid" aria-label="文库数据概览">
      <article class="stat-card">
        <span class="muted">文献总数</span><strong>{{ literatureList.length }}</strong>
      </article>
      <article class="stat-card">
        <span class="muted">累计浏览</span><strong>{{ totalViews.toLocaleString() }}</strong>
      </article>
    </div>

    <div class="admin-toolbar">
      <div class="toolbar-actions">
        <button class="button" type="button" @click="exportData">导出 JSON</button>
        <button class="button" type="button" @click="importInput?.click()">导入 JSON</button>
        <input
          ref="importInput"
          class="sr-only"
          type="file"
          accept="application/json,.json"
          @change="importData"
        />
      </div>
      <p
        v-if="importMessage"
        class="import-message"
        :class="{ 'form-error': importIsError }"
        role="status"
      >
        {{ importMessage }}
      </p>
    </div>

    <div class="table-scroll">
      <table class="admin-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">标题</th>
            <th scope="col">作者</th>
            <th scope="col">分类</th>
            <th scope="col">时期</th>
            <th scope="col">发布日期</th>
            <th scope="col">浏览量</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in literatureList" :key="item.id">
            <td class="id-cell">{{ item.id }}</td>
            <td class="title-cell">{{ item.title }}</td>
            <td>{{ item.author }}</td>
            <td>
              {{ categories.find((entry) => entry.id === item.category)?.name ?? item.category }}
            </td>
            <td>{{ periods.find((entry) => entry.id === item.period)?.name ?? item.period }}</td>
            <td>{{ item.date }}</td>
            <td>{{ item.views ?? 0 }}</td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" @click="openEdit(item)">编辑</button
                ><button class="text-button danger-text" type="button" @click="removeItem(item)">
                  删除
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!literatureList.length">
            <td colspan="8" class="table-empty">还没有文献，请新增或导入 JSON 数据。</td>
          </tr>
        </tbody>
      </table>
    </div>

    <dialog ref="dialogRef" class="editor-dialog" aria-labelledby="editor-title">
      <form class="stack-form" @submit.prevent="submitForm">
        <div class="dialog-heading">
          <div>
            <p class="eyebrow">LITERATURE RECORD</p>
            <h2 id="editor-title">{{ editingId ? '编辑文献' : '新增文献' }}</h2>
          </div>
          <button class="icon-button" type="button" aria-label="关闭" @click="dialogRef?.close()">
            ×
          </button>
        </div>
        <p v-if="editingId" class="muted">
          文献 ID：<code>{{ editingId }}</code>
        </p>
        <label>标题<input v-model="form.title" maxlength="120" required /></label>
        <label>作者<input v-model="form.author" maxlength="80" required /></label>
        <div class="form-row">
          <label
            >文献分类<select v-model="form.category" required>
              <option v-for="item in categories" :key="item.id" :value="item.id">
                {{ item.id }} · {{ item.name }}
              </option>
            </select></label
          >
          <label
            >历史时期<select v-model="form.period" required>
              <option v-for="item in periods" :key="item.id" :value="item.id">
                {{ item.id }} · {{ item.name }}
              </option>
            </select></label
          >
        </div>
        <label>发布日期<input v-model="form.date" type="date" required /></label>
        <label>摘要<textarea v-model="form.summary" rows="3" maxlength="500" required /></label>
        <label>正文<textarea v-model="form.content" rows="9" required /></label>
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        <div class="dialog-actions">
          <button class="button" type="button" @click="dialogRef?.close()">取消</button
          ><button class="button button-primary" type="submit">保存文献</button>
        </div>
      </form>
    </dialog>
  </section>
</template>
