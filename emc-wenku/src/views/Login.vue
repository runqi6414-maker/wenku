<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DEMO_ADMIN } from '../utils/constants'
import { useAppStore } from '../store/useAppStore'

const route = useRoute()
const router = useRouter()
const { login } = useAppStore()
const form = reactive({ username: '', password: '' })
const errorMessage = ref('')

function submitLogin() {
  if (form.username !== DEMO_ADMIN.username || form.password !== DEMO_ADMIN.password) {
    errorMessage.value = '账号或密码不正确。'
    return
  }

  errorMessage.value = ''
  login()
  const redirect = route.query.redirect
  const safeRedirect =
    typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
  router.replace(safeRedirect ? redirect : { name: 'admin' })
}
</script>

<template>
  <section class="form-panel login-panel">
    <p class="eyebrow">ADMINISTRATION</p>
    <h1>管理员登录</h1>
    <p class="muted">这是纯前端演示登录，不提供真实身份验证。</p>
    <form class="stack-form" @submit.prevent="submitLogin">
      <label
        >管理员账号<input v-model.trim="form.username" autocomplete="username" required
      /></label>
      <label
        >密码<input
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
      /></label>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <button class="button button-primary" type="submit">登录后台</button>
    </form>
    <p class="demo-hint">演示账号：<code>admin</code>　演示密码：<code>emc-wenku</code></p>
  </section>
</template>
