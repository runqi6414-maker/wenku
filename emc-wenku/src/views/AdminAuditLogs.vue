<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../services/apiClient'
const logs = ref([])
const error = ref('')
onMounted(async () => {
  try {
    const result = await api.get('/admin/audit-logs')
    logs.value = result.items
  } catch (cause) {
    error.value = cause.message
  }
})
</script>

<template>
  <section>
    <RouterLink class="back-link" to="/admin">← 返回管理后台</RouterLink>
    <div class="page-heading">
      <div>
        <p class="eyebrow">AUDIT TRAIL</p>
        <h1>管理员操作日志</h1>
        <p class="muted">记录审核、发布、分类与用户权限变更。</p>
      </div>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="table-scroll">
      <table class="admin-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>操作者</th>
            <th>操作</th>
            <th>对象类型</th>
            <th>对象 ID</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in logs" :key="item.id">
            <td>{{ new Date(item.createdAt).toLocaleString() }}</td>
            <td>{{ item.actor?.username || '系统' }}</td>
            <td>{{ item.action }}</td>
            <td>{{ item.entityType }}</td>
            <td class="id-cell">{{ item.entityId || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!logs.length && !error" class="empty-state">暂无操作记录。</p>
  </section>
</template>
