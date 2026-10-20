<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/apiClient'
import { categories, periods } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const submissionId = ref(String(route.params.id ?? ''))
const form = reactive({
  title: '',
  authorName: '',
  category: '01',
  period: '',
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
const payload = () => ({ ...form })
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
      period: existing.period,
      summary: existing.summary,
      content: existing.content,
      sourceDescription: existing.sourceDescription,
      sourceUrl: existing.sourceUrl,
      sourceDate: existing.sourceDate,
    })
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
        ><label
          >历史时期<select v-model="form.period">
            <option value="">未确定</option>
            <option v-for="item in periods" :key="item.id" :value="item.id">
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
        >文献正文<textarea v-model="form.content" rows="16" maxlength="500000" required />
      </label>
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
