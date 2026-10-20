<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/apiClient'
const route = useRoute()
const isPeriod = computed(() => route.path.endsWith('/periods'))
const title = computed(() => (isPeriod.value ? '历史时期管理' : '文献分类管理'))
const endpoint = computed(() => (isPeriod.value ? '/periods' : '/categories'))
const records = ref([])
const error = ref('')
const message = ref('')
const form = reactive({ code: '', name: '', sortOrder: 0, active: true })
async function load() {
  try {
    records.value = await api.get(endpoint.value)
  } catch (cause) {
    error.value = cause.message
  }
}
async function save() {
  error.value = ''
  message.value = ''
  try {
    await api.patch(`/admin/${isPeriod.value ? 'periods' : 'categories'}/${form.code}`, {
      name: form.name,
      sortOrder: Number(form.sortOrder),
      active: form.active,
    })
    message.value = '目录项已保存。'
    Object.assign(form, { code: '', name: '', sortOrder: 0, active: true })
    await load()
  } catch (cause) {
    error.value = cause.message
  }
}
function edit(item) {
  Object.assign(form, {
    code: item.code,
    name: item.name,
    sortOrder: item.sortOrder,
    active: item.active,
  })
}
function toggleActive(item) {
  Object.assign(form, {
    code: item.code,
    name: item.name,
    sortOrder: item.sortOrder,
    active: !item.active,
  })
  save()
}
watch(endpoint, load, { immediate: true })
</script>

<template>
  <section>
    <RouterLink class="back-link" to="/admin">← 返回管理后台</RouterLink>
    <div class="page-heading">
      <div>
        <p class="eyebrow">TAXONOMY</p>
        <h1>{{ title }}</h1>
        <p class="muted">停用目录项可保留已有文献关联，新增编号使用两位数字。</p>
      </div>
    </div>
    <form class="taxonomy-form" @submit.prevent="save">
      <label>编号<input v-model.trim="form.code" pattern="[0-9]{2}" maxlength="2" required /></label
      ><label>名称<input v-model.trim="form.name" maxlength="128" required /></label
      ><label>排序<input v-model.number="form.sortOrder" type="number" min="0" /></label
      ><label class="consent-check"><input v-model="form.active" type="checkbox" />启用</label
      ><button class="button button-primary" type="submit">保存</button>
    </form>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-if="message" class="citation-message" role="status">{{ message }}</p>
    <div class="table-scroll">
      <table class="admin-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>名称</th>
            <th>顺序</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in records" :key="item.code">
            <td>{{ item.code }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.sortOrder }}</td>
            <td>{{ item.active ? '启用' : '停用' }}</td>
            <td>
              <button class="text-button" type="button" @click="edit(item)">编辑</button
              ><button class="text-button danger-text" type="button" @click="toggleActive(item)">
                {{ item.active ? '停用' : '启用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
