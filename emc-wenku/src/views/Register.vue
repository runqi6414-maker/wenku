<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../store/useAppStore'

const router = useRouter()
const { register } = useAppStore()
const form = reactive({ username: '', email: '', password: '', confirmPassword: '' })
const message = ref('')
const busy = ref(false)
async function submit() {
  message.value = ''
  if (form.password !== form.confirmPassword) {
    message.value = '两次输入的密码不一致。'
    return
  }
  busy.value = true
  try {
    await register({ username: form.username, email: form.email, password: form.password })
    router.replace({ name: 'me' })
  } catch (error) {
    message.value = error.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="form-panel login-panel">
    <p class="eyebrow">CREATE ACCOUNT</p>
    <h1>注册账户</h1>
    <p class="muted">账户由服务端保存。公开投稿仍需审核后才会进入文库。</p>
    <form class="stack-form" @submit.prevent="submit">
      <label
        >用户名<input
          v-model.trim="form.username"
          autocomplete="username"
          minlength="3"
          maxlength="32"
          required
      /></label>
      <label
        >邮箱<input
          v-model.trim="form.email"
          type="email"
          autocomplete="email"
          maxlength="254"
          required
      /></label>
      <label
        >密码（至少 12 位）<input
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          minlength="12"
          maxlength="128"
          required
      /></label>
      <label
        >确认密码<input
          v-model="form.confirmPassword"
          type="password"
          autocomplete="new-password"
          required
      /></label>
      <p v-if="message" class="form-error" role="alert">{{ message }}</p>
      <button class="button button-primary" type="submit" :disabled="busy">
        {{ busy ? '正在注册…' : '创建账户' }}
      </button>
    </form>
    <p class="muted">已有账户？<RouterLink to="/login">前往登录</RouterLink></p>
  </section>
</template>
