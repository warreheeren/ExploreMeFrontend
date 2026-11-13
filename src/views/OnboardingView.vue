<template>
  <div class="min-h-screen bg-ground">
    <header class="border-b border-line bg-surface">
      <div class="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
        <Logo />
        <button type="button" class="btn btn-ghost btn-sm" :disabled="finishing" @click="finish('/')">{{ $t('onboarding.skip') }}</button>
      </div>
    </header>

    <main class="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <!-- Stappen -->
      <ol class="mb-8 flex items-center gap-2" :aria-label="$t('onboarding.progress')">
        <li v-for="(s, i) in steps" :key="s" class="flex flex-1 items-center gap-2">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            :class="i < step ? 'bg-accent-700 text-white' : i === step ? 'bg-ink text-surface' : 'bg-gray-200 text-muted'"
            :aria-current="i === step ? 'step' : undefined"
          >
            <Icon v-if="i < step" name="check" :size="14" :stroke-width="3" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="hidden text-xs font-bold sm:inline" :class="i === step ? 'text-ink' : 'text-muted'">{{ s }}</span>
          <span v-if="i < steps.length - 1" class="h-px flex-1 bg-line" />
        </li>
      </ol>

      <!-- Stap 1: profiel -->
      <section v-if="step === 0" class="card card-pad sm:p-8">
        <h1 class="page-title">{{ $t('onboarding.profile.title', { name: firstName }) }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t('onboarding.profile.intro') }}</p>

        <div class="mt-6 flex items-center gap-5">
          <Avatar :src="photoUrl" :name="displayName" size="xl" />
          <div>
            <label class="btn btn-secondary btn-sm cursor-pointer">
              <Icon name="camera" :size="14" /> {{ photoUrl ? $t('onboarding.profile.otherPhoto') : $t('onboarding.profile.choosePhoto') }}
              <input type="file" :accept="accept" class="sr-only" @change="onPhoto" />
            </label>
            <p v-if="uploading" class="hint">{{ $t('onboarding.profile.uploading') }}</p>
            <p v-else-if="uploadError" class="hint text-red-600">{{ uploadError }}</p>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          <div>
            <label for="ob-name" class="label">{{ $t('onboarding.profile.displayName') }}</label>
            <input id="ob-name" v-model.trim="displayName" class="input" maxlength="60" />
          </div>
          <div>
            <label for="ob-bio" class="label">{{ $t('onboarding.profile.bio') }}</label>
            <textarea id="ob-bio" v-model="bio" rows="3" maxlength="500" class="textarea" :placeholder="$t('onboarding.profile.bioPlaceholder')" />
          </div>
        </div>

        <p v-if="error" class="mt-4 text-sm font-semibold text-red-600">{{ error }}</p>
        <div class="mt-6 flex justify-end">
          <button type="button" class="btn btn-dark" :disabled="saving || uploading || !displayName" @click="saveProfile">
            {{ saving ? $t('onboarding.profile.saving') : $t('onboarding.profile.next') }} <Icon name="arrow-right" :size="16" />
          </button>
        </div>
      </section>

      <!-- Stap 2: volgen -->
      <section v-else-if="step === 1" class="card card-pad sm:p-8">
        <h1 class="page-title">{{ $t('onboarding.follow.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t('onboarding.follow.intro') }}</p>
        <SuggestedTravellers class="mt-4" variant="list" :take="8" @followed="onFollowed" />
        <div class="mt-6 flex items-center justify-between gap-3">
          <button type="button" class="btn btn-ghost" @click="step = 0"><Icon name="arrow-left" :size="16" /> {{ $t('onboarding.follow.back') }}</button>
          <button type="button" class="btn btn-dark" @click="step = 2">
            {{ followedCount ? $t('onboarding.follow.continueCount', { n: followedCount }) : $t('onboarding.follow.continue') }} <Icon name="arrow-right" :size="16" />
          </button>
        </div>
      </section>

      <!-- Stap 3: klaar -->
      <section v-else class="card card-pad text-center sm:p-10">
        <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="plane" :size="30" /></span>
        <h1 class="page-title mt-5">{{ $t('onboarding.done.title') }}</h1>
        <p class="mx-auto mt-2 max-w-md text-sm text-muted">{{ $t('onboarding.done.intro') }}</p>
        <div class="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" class="btn btn-primary btn-lg" :disabled="finishing" @click="finish('/trips/new')"><Icon name="map" :size="18" /> {{ $t('onboarding.done.planTrip') }}</button>
          <button type="button" class="btn btn-secondary btn-lg" :disabled="finishing" @click="finish('/')">{{ $t('onboarding.done.toTimeline') }}</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Logo from '@/components/ui/Logo.vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import SuggestedTravellers from '@/components/SuggestedTravellers.vue'
import { useAuthStore } from '@/stores/auth'
import { useImageUpload } from '@/composables/useImageUpload'
import { errorMessage } from '@/utils/errors'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { uploading, error: uploadError, upload, accept } = useImageUpload()
const { t } = useI18n()

const steps = computed(() => [t('onboarding.steps.profile'), t('onboarding.steps.follow'), t('onboarding.steps.done')])
const step = ref(0)
const displayName = ref(auth.displayName || '')
const bio = ref(auth.bio || '')
const photoUrl = ref(auth.profilePhotoUrl || '')
const saving = ref(false)
const finishing = ref(false)
const error = ref('')
const followed = ref(new Set())

const firstName = computed(() => (auth.displayName || '').split(' ')[0] || t('onboarding.profile.fallbackName'))
const followedCount = computed(() => followed.value.size)

async function onPhoto(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  const url = await upload(file)
  if (url) photoUrl.value = url
}

async function saveProfile() {
  saving.value = true
  error.value = ''
  try {
    await auth.updateProfile({ displayName: displayName.value, bio: bio.value, profileImgUrl: photoUrl.value || '' })
    step.value = 1
  } catch (e) {
    error.value = errorMessage(e, t('onboarding.profile.saveFailed'))
  } finally {
    saving.value = false
  }
}

function onFollowed({ userName, following }) {
  const next = new Set(followed.value)
  if (following) next.add(userName)
  else next.delete(userName)
  followed.value = next
}

async function finish(to) {
  finishing.value = true
  await auth.completeOnboarding()
  // Kwam de gebruiker binnen via "delen naar ExploreMe", dan gaat die gedeelde inhoud voor de tijdlijn.
  const redirect = route.query.redirect
  const pendingShare = typeof redirect === 'string' && redirect.startsWith('/share') ? redirect : null
  router.replace(to === '/' && pendingShare ? pendingShare : to)
}
</script>
