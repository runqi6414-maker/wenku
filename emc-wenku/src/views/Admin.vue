<script setup>
import { computed, reactive, ref } from 'vue'
import { categories, periods } from '../utils/constants'
import {
  createEmptySource,
  LITERATURE_SCHEMA_VERSION,
  validateLiteratureCollection,
  validateLiteratureRecord,
  verificationStatuses,
  visibilityOptions,
} from '../utils/literatureSchema'
import { useAppStore } from '../store/useAppStore'

const { literatureList, saveLiterature, deleteLiterature, replaceLiterature } = useAppStore()
const dialogRef = ref(null)
const importInput = ref(null)
const editingId = ref('')
const formError = ref('')
const importMessage = ref('')
const importIsError = ref(false)
const tableKeyword = ref('')
const totalViews = computed(() =>
  literatureList.value.reduce((sum, item) => sum + (Number(item.views) || 0), 0),
)
const visibleLiterature = computed(() => {
  const keyword = tableKeyword.value.trim().toLocaleLowerCase()
  if (!keyword) return literatureList.value
  return literatureList.value.filter((item) =>
    `${item.id} ${item.title} ${item.author}`.toLocaleLowerCase().includes(keyword),
  )
})

function createRecordId() {
  let id
  do {
    id = `EMC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  } while (literatureList.value.some((item) => item.id === id))
  return id
}

const emptyForm = () => ({
  title: '',
  author: '',
  category: '01',
  period: '10',
  summary: '',
  content: '',
  date: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10),
  source: createEmptySource(),
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
  Object.assign(form, { ...item, source: { ...createEmptySource(), ...item.source } })
  dialogRef.value?.showModal()
}

function submitForm() {
  const requiredFields = ['title', 'author', 'summary', 'content', 'date']
  if (requiredFields.some((field) => !String(form[field] ?? '').trim())) {
    formError.value = '请完整填写标题、作者、摘要、正文和发布日期。'
    return
  }

  let item
  try {
    item = validateLiteratureRecord(
      {
        id: editingId.value || createRecordId(),
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
        source: { ...form.source },
      },
      0,
    )
  } catch (error) {
    formError.value = error.message
    return
  }
  saveLiterature(item)
  dialogRef.value?.close()
}

function removeItem(item) {
  if (window.confirm(`确定删除《${item.title}》吗？此操作无法撤销。`)) deleteLiterature(item.id)
}

function exportData() {
  const exportPackage = {
    schemaVersion: LITERATURE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    literature: literatureList.value,
  }
  const blob = new Blob([JSON.stringify(exportPackage, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `emc-wenku-${new Date().toISOString().slice(0, 10)}.json`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function importData(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  importMessage.value = ''

  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('导入文件不能超过 10 MB。')
    const parsed = JSON.parse(await file.text())
    if (parsed?.schemaVersion !== undefined) {
      if (!Number.isSafeInteger(parsed.schemaVersion) || parsed.schemaVersion < 1) {
        throw new Error('数据格式版本无效。')
      }
      if (parsed.schemaVersion > LITERATURE_SCHEMA_VERSION) {
        throw new Error(`该文件使用较新的数据格式版本（${parsed.schemaVersion}），请先升级网站。`)
      }
    }
    const items = validateLiteratureCollection(parsed)
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

    <div class="admin-table-toolbar">
      <label class="search-field admin-search">
        <span class="sr-only">搜索后台文献</span>
        <input v-model="tableKeyword" type="search" placeholder="按 ID、标题或作者搜索" />
      </label>
      <span class="muted"
        >显示 {{ visibleLiterature.length }} / {{ literatureList.length }} 篇</span
      >
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
            <th scope="col">来源</th>
            <th scope="col">核实状态</th>
            <th scope="col">可见范围</th>
            <th scope="col">浏览量</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visibleLiterature" :key="item.id">
            <td class="id-cell">{{ item.id }}</td>
            <td class="title-cell">{{ item.title }}</td>
            <td>{{ item.author }}</td>
            <td>
              {{ categories.find((entry) => entry.id === item.category)?.name ?? item.category }}
            </td>
            <td>{{ periods.find((entry) => entry.id === item.period)?.name ?? item.period }}</td>
            <td>{{ item.date }}</td>
            <td>{{ item.source?.name || '未填写' }}</td>
            <td>
              {{
                verificationStatuses.find((entry) => entry.id === item.source?.verificationStatus)
                  ?.name ?? '待核实'
              }}
            </td>
            <td>
              {{
                visibilityOptions.find((entry) => entry.id === item.source?.visibility)?.name ??
                '公开'
              }}
            </td>
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
            <td colspan="11" class="table-empty">还没有文献，请新增或导入 JSON 数据。</td>
          </tr>
          <tr v-else-if="!visibleLiterature.length">
            <td colspan="11" class="table-empty">没有匹配的文献，请尝试其他关键词。</td>
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
        <fieldset class="source-fieldset">
          <legend>来源与编目状态</legend>
          <p class="muted">可见范围仅用于编目标注；纯前端网站无法阻止访客读取已导入的内容。</p>
          <label>来源名称<input v-model="form.source.name" maxlength="120" /></label>
          <label>文件编号 / 引用<input v-model="form.source.identifier" maxlength="160" /></label>
          <label>来源链接<input v-model="form.source.url" type="url" maxlength="500" /></label>
          <div class="form-row">
            <label
              >核实状态<select v-model="form.source.verificationStatus">
                <option v-for="item in verificationStatuses" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select></label
            >
            <label
              >可见范围<select v-model="form.source.visibility">
                <option v-for="item in visibilityOptions" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select></label
            >
          </div>
          <label>编者备注<textarea v-model="form.source.note" rows="3" maxlength="1000" /></label>
        </fieldset>
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        <div class="dialog-actions">
          <button class="button" type="button" @click="dialogRef?.close()">取消</button
          ><button class="button button-primary" type="submit">保存文献</button>
        </div>
      </form>
    </dialog>
  </section>
</template>
