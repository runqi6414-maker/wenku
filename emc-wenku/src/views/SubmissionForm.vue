<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, apiUrl } from '../services/apiClient'
import { categories, politicalSubcategories } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const submissionId = ref(String(route.params.id ?? ''))
const form = reactive({
  title: '',
  authorName: '',
  category: '01',
  subcategory: '',
  summary: '',
  content: '',
  sourceDescription: '',
  sourceUrl: '',
  sourceDate: '',
})
const accepted = ref(false)
const message = ref('')
const busy = ref(false)
const allowedToEdit = ref(true)
const attachments = ref([])
const selectedFiles = ref([])
const payload = () => ({ ...form })
function chooseFiles(event) {
  selectedFiles.value = Array.from(event.target.files ?? [])
}
async function uploadSelectedFiles() {
  if (!selectedFiles.value.length) return
  const data = new FormData()
  selectedFiles.value.forEach((file) => data.append('files', file))
  const uploaded = await api.upload(`/submissions/${submissionId.value}/attachments`, data)
  attachments.value.push(...uploaded)
  selectedFiles.value = []
}
async function removeAttachment(file) {
  try {
    await api.delete(`/submissions/${submissionId.value}/attachments/${file.id}`)
    attachments.value = attachments.value.filter((item) => item.id !== file.id)
  } catch (error) {
    message.value = error.message
  }
}
watch(
  () => form.category,
  (category) => {
    if (category !== '04') form.subcategory = ''
  },
)
async function saveDraft() {
  busy.value = true
  message.value = ''
  try {
    const saved = submissionId.value
      ? await api.patch(`/submissions/${submissionId.value}`, payload())
      : await api.post('/submissions', payload())
    submissionId.value = saved.id
    if (route.params.id !== saved.id)
      router.replace({ name: 'submission-edit', params: { id: saved.id } })
    await uploadSelectedFiles()
    message.value = `草稿已保存 · ${new Date(saved.updatedAt).toLocaleTimeString()}`
    return saved
  } catch (error) {
    message.value = error.message
    return null
  } finally {
    busy.value = false
  }
}
async function submit() {
  if (!accepted.value) {
    message.value = '请先确认投稿声明。'
    return
  }
  const saved = await saveDraft()
  if (!saved) return
  busy.value = true
  try {
    await api.post(`/submissions/${submissionId.value}/submit`, { declarationAccepted: true })
    router.replace({ name: 'submission-detail', params: { id: submissionId.value } })
  } catch (error) {
    message.value = error.message
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  if (!submissionId.value) return
  try {
    const existing = await api.get(`/submissions/${submissionId.value}`)
    if (!['draft', 'revision_requested'].includes(existing.status)) {
      allowedToEdit.value = false
      message.value = '此投稿目前不允许修改。'
      return
    }
    Object.assign(form, {
      title: existing.title,
      authorName: existing.authorName,
      category: existing.category,
      subcategory: existing.subcategory,
      summary: existing.summary,
      content: existing.content,
      sourceDescription: existing.sourceDescription,
      sourceUrl: existing.sourceUrl,
      sourceDate: existing.sourceDate,
    })
    attachments.value = existing.attachments ?? []
  } catch (error) {
    allowedToEdit.value = false
    message.value = error.message
  }
})
</script>

<template>
  <section class="form-panel submission-form">
    <p class="eyebrow">CONTRIBUTE TO THE ARCHIVE</p>
    <h1>{{ submissionId ? '编辑投稿' : '提交文献' }}</h1>
    <p class="muted">
      草稿仅本人和授权审核人员可见。提交后进入审核队列，通过并发布后才会出现在公开目录。
    </p>
    <form v-if="allowedToEdit" class="stack-form" @submit.prevent="submit">
      <label>文献标题<input v-model.trim="form.title" maxlength="240" required /></label>
      <label
        >原文作者或署名<input
          v-model.trim="form.authorName"
          maxlength="160"
          placeholder="可填写“佚名”或“作者不详”"
          required
      /></label>
      <div class="form-row">
        <label
          >文献分类<select v-model="form.category" required>
            <option v-for="item in categories" :key="item.id" :value="item.id">
              {{ item.id }} · {{ item.name }}
            </option>
          </select></label
        ><label v-if="form.category === '04'"
          >政论文书分期<select v-model="form.subcategory">
            <option value="">未确定</option>
            <option v-for="item in politicalSubcategories" :key="item.id" :value="item.id">
              {{ item.id }} · {{ item.name }}
            </option>
          </select></label
        >
      </div>
      <label
        >原始形成时间<input
          v-model.trim="form.sourceDate"
          maxlength="80"
          placeholder="如：2026-05-04、约 2026 年春或不详"
      /></label>
      <label>摘要<textarea v-model.trim="form.summary" rows="3" maxlength="3000" /></label>
      <label
        >文献正文（可直接填写，也可上传附件）<textarea v-model="form.content" rows="16" maxlength="500000" />
      </label>
      <section class="source-note attachment-editor">
        <h2>文献附件</h2>
        <p class="muted">支持 PDF、JPG、PNG、WebP、DOCX；每个文件最大 10 MB，每篇最多 10 个。</p>
        <p class="muted">选择文件后，点击“保存草稿”或“提交审核”即可上传。</p>
        <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.docx" @change="chooseFiles" />
        <p v-if="selectedFiles.length" class="muted">待上传：{{ selectedFiles.map((file) => file.name).join('、') }}</p>
        <ul v-if="attachments.length">
          <li v-for="file in attachments" :key="file.id">
            <a :href="apiUrl(`/submissions/${submissionId}/attachments/${file.id}/file`)">{{ file.name }}</a>
            · {{ (file.size / 1024 / 1024).toFixed(2) }} MB
            <button class="button button-quiet" type="button" @click="removeAttachment(file)">删除</button>
          </li>
        </ul>
      </section>
      <label
        >来源与真实性说明<textarea
          v-model.trim="form.sourceDescription"
          rows="4"
          maxlength="3000"
          placeholder="说明原始发布平台、获取方式、原件/转载/节录等情况；未知信息请如实说明。"
          required
        />
      </label>
      <label
        >原始来源链接（可选）<input
          v-model.trim="form.sourceUrl"
          type="url"
          maxlength="2000"
          placeholder="https://…"
      /></label>
      <label class="consent-check"
        ><input
          v-model="accepted"
          type="checkbox"
        />我确认已尽可能准确填写资料、说明已知来源，并有权提交该资料或已说明其合法来源与使用依据。我已了解文库的公开、保存及必要格式整理规则。</label
      >
      <p
        v-if="message"
        :class="message.includes('已保存') ? 'citation-message' : 'form-error'"
        role="status"
      >
        {{ message }}
      </p>
      <div class="row-actions">
        <button class="button" type="button" :disabled="busy" @click="saveDraft">
          {{ busy ? '保存中…' : '保存草稿' }}</button
        ><button class="button button-primary" type="submit" :disabled="busy">提交审核</button>
      </div>
    </form>
    <p v-else class="form-error" role="alert">{{ message }}</p>
  </section>
</template>
