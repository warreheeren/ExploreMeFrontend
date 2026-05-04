<template>
  <div class="max-w-2xl mx-auto space-y-5">

    <!-- Page header -->
    <div class="flex items-center gap-3">
      <button @click="router.back()" class="p-1.5 rounded-lg hover:bg-gray-100 transition">
        <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1 class="text-lg font-bold text-gray-900">Instellingen</h1>
    </div>

    <!-- Profile edit -->
    <div class="bg-white border border-gray-200 rounded-xl p-5">
      <h2 class="text-sm font-bold text-gray-900 mb-4">Profiel bewerken</h2>

      <form @submit.prevent="onSaveProfile" class="space-y-4">

        <!-- Profile photo upload -->
        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-2">Profielfoto</label>
          <div class="flex items-center gap-4">
            <img
              v-if="previewUrl || form.profileImgUrl"
              :src="previewUrl || form.profileImgUrl"
              class="w-16 h-16 rounded-full object-cover shrink-0"
            />
            <div v-else class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-400 shrink-0">
              {{ auth.displayName?.[0]?.toUpperCase() || '?' }}
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                class="px-4 py-2 text-sm font-semibold text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition inline-block text-center"
              >
                Foto kiezen
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  class="hidden"
                  @change="onFileSelected"
                />
              </label>
              <span v-if="uploadError" class="text-xs text-red-500">{{ uploadError }}</span>
              <span v-if="uploading" class="text-xs text-gray-400">Uploaden...</span>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1">Weergavenaam</label>
          <input
            v-model.trim="form.displayName"
            class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1">Bio</label>
          <textarea
            v-model.trim="form.bio"
            rows="3"
            class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-primary-500 transition"
            placeholder="Vertel iets over jezelf..."
          />
        </div>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            :disabled="saving"
            class="px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition"
          >
            {{ saving ? 'Opslaan...' : 'Opslaan' }}
          </button>
          <span v-if="saved" class="text-sm text-green-600 font-medium">Opgeslagen</span>
        </div>

        <p v-if="settingsError" class="text-xs text-red-500">{{ settingsError }}</p>
      </form>
    </div>

    <!-- Account section -->
    <div class="bg-white border border-gray-200 rounded-xl p-5">
      <h2 class="text-sm font-bold text-gray-900 mb-3">Account</h2>
      <button
        @click="onLogout"
        class="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
      >
        Uitloggen
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import * as usersApi from '@/api/userApi'
import * as uploadApi from '@/api/uploadApi'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ displayName: '', bio: '', profileImgUrl: '' })
const saving = ref(false)
const saved = ref(false)
const settingsError = ref('')
const uploading = ref(false)
const uploadError = ref('')
const previewUrl = ref('')

onMounted(async () => {
  if (!auth.userName) return
  try {
    const profile = await usersApi.getProfile(auth.userName)
    form.displayName = profile.displayName || ''
    form.bio = profile.bio || ''
    form.profileImgUrl = profile.profilePhotoUrl || ''
  } catch {
    // ignore
  }
})

async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return

  uploadError.value = ''
  previewUrl.value = URL.createObjectURL(file)
  uploading.value = true

  try {
    const url = await uploadApi.uploadImage(file)
    form.profileImgUrl = url
  } catch (err) {
    uploadError.value = err?.response?.data?.message || 'Upload mislukt'
    previewUrl.value = ''
  } finally {
    uploading.value = false
  }
}

async function onSaveProfile() {
  settingsError.value = ''
  saving.value = true
  saved.value = false
  try {
    const result = await usersApi.updateProfile({
      displayName: form.displayName || null,
      bio: form.bio,
      profileImgUrl: form.profileImgUrl || null
    })
    auth.displayName = result.displayName
    auth.profilePhotoUrl = result.profilePhotoUrl || null
    localStorage.setItem('displayName', result.displayName)
    if (result.profilePhotoUrl) localStorage.setItem('profilePhotoUrl', result.profilePhotoUrl)
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (e) {
    settingsError.value = e?.response?.data?.title || e?.response?.data?.message || 'Opslaan mislukt'
  } finally {
    saving.value = false
  }
}

function onLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>
