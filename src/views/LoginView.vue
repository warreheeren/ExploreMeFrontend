<template>
  <div class="flex items-center justify-center min-h-[70vh]">
    <div class="w-full max-w-sm">
      <div class="bg-white border border-gray-200 rounded-xl p-8">
        <div class="text-center mb-8">
          <svg class="w-10 h-10 mx-auto mb-4" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="#1a1a1a" stroke-width="2"/>
            <path d="M8 16c0-5 3-9 8-9s8 4 8 9-3 9-8 9" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            <circle cx="16" cy="16" r="2.5" fill="#1a1a1a"/>
          </svg>
          <h1 class="text-xl font-bold text-gray-900">Welkom terug</h1>
          <p class="text-sm text-gray-400 mt-1">Log in op ExploreMe</p>
        </div>

        <form @submit.prevent="onSubmit" class="space-y-4">
          <input
            v-model.trim="userName"
            autocomplete="username"
            placeholder="Gebruikersnaam"
            class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-primary-500 transition"
          />
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Wachtwoord"
            class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-primary-500 transition"
          />

          <button
            :disabled="loading || !userName || !password"
            class="w-full py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-default transition"
          >
            {{ loading ? 'Even geduld...' : 'Inloggen' }}
          </button>

          <p v-if="error" class="text-sm text-red-500 text-center">{{ error }}</p>
        </form>
      </div>

      <p class="text-sm text-gray-400 text-center mt-5">
        Geen account?
        <RouterLink to="/register" class="text-primary-600 font-semibold hover:text-primary-700 hover:underline">Registreren</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const userName = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(userName.value, password.value)
    router.push({ name: 'home' })
  } catch (e) {
    error.value = e?.response?.data?.title || e?.response?.data?.message || 'Login mislukt'
  } finally {
    loading.value = false
  }
}
</script>
