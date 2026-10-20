<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../services/apiClient'
const users = ref([])
const error = ref('')
const notice = ref('')
async function load() {
  try {
    const result = await api.get('/admin/users')
    users.value = result.items
  } catch (cause) {
    error.value = cause.message
  }
}
async function setRole(user, role) {
  try {
    await api.patch(`/admin/users/${user.id}/role`, { role })
    notice.value = `${user.username} 的角色已更新。`
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
        <p class="eyebrow">ACCOUNT ACCESS</p>
        <h1>用户与角色</h1>
        <p class="muted">普通用户、审核员和管理员权限由服务端执行。</p>
      </div>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="citation-message" role="status">{{ notice }}</p>
    <div class="table-scroll">
      <table class="admin-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>状态</th>
            <th>注册时间</th>
            <th>最近登录</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.email || '—' }}</td>
            <td>
              <select :value="user.role" @change="setRole(user, $event.target.value)">
                <option value="USER">普通用户</option>
                <option value="REVIEWER">审核员</option>
                <option value="ADMIN">管理员</option>
              </select>
            </td>
            <td>{{ user.status }}</td>
            <td>{{ new Date(user.createdAt).toLocaleDateString() }}</td>
            <td>{{ user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
