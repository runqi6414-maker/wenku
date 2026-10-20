<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../store/useAppStore'

const route = useRoute()
const router = useRouter()
const { login } = useAppStore()
const form = reactive({ username: '', password: '' })
const errorMessage = ref('')
const submitting = ref(false)

async function submitLogin() {
  submitting.value = true
  errorMessage.value = ''
  try {
    await login(form)
    const redirect = route.query.redirect
    const safeRedirect =
      typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    router.replace(safeRedirect ? redirect : { name: 'home' })
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="form-panel login-panel">
    <p class="eyebrow">ACCOUNT</p>
    <h1>登录文库</h1>
    <p class="muted">登录后可以投稿、查看审核进度并管理收藏。</p>
    <form class="stack-form" @submit.prevent="submitLogin">
      <label
        >用户名或邮箱<input
          v-model.trim="form.username"
          autocomplete="username"
          required
          maxlength="254"
      /></label>
      <label
        >密码<input
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
          maxlength="128"
      /></label>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <button class="button button-primary" type="submit" :disabled="submitting">
        {{ submitting ? '正在登录…' : '登录' }}
      </button>
    </form>
    <p class="muted"><RouterLink to="/forgot-password">忘记密码？</RouterLink></p>
    <p class="muted">还没有账户？<RouterLink to="/register">注册</RouterLink></p>
  </section>
</template>
