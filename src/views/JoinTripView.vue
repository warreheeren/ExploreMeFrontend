<template>
  <div class="flex min-h-screen flex-col bg-ground">
    <header class="border-b border-line bg-surface">
      <div class="mx-auto flex h-16 max-w-content items-center px-4 sm:px-6">
        <RouterLink to="/" aria-label="ExploreMe"><Logo /></RouterLink>
      </div>
    </header>

    <main class="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:py-12">
      <div v-if="loading" class="space-y-4" aria-busy="true">
        <div class="skeleton h-44 rounded-3xl" />
        <div class="skeleton h-8 w-2/3" />
        <div class="skeleton h-12 rounded-full" />
      </div>

      <EmptyState v-else-if="!preview" icon="lock" :title="$t('join.invalidTitle')" :text="$t('join.invalidText')">
        <RouterLink to="/" class="btn btn-dark btn-sm">{{ $t('join.toHome') }}</RouterLink>
      </EmptyState>

      <article v-else class="card overflow-hidden">
        <div class="aspect-[16/9] bg-gray-50">
          <CoverImage :src="preview.coverImageUrl || ''" :seed="preview.tripId" :alt="''" img-class="h-full w-full object-cover" eager />
        </div>

        <div class="card-pad">
          <p class="flex items-center gap-2 text-sm text-muted">
            <Avatar :src="preview.invitedByProfilePhotoUrl || ''" :name="preview.invitedByDisplayName" size="sm" />
            <span>{{ $t('join.invitedBy', { name: preview.invitedByDisplayName }) }}</span>
          </p>
          <h1 class="title-display mt-3 text-2xl text-ink">{{ preview.title }}</h1>
          <p class="mt-1 text-sm font-semibold text-muted">
            {{ formatDateRange(preview.startDate, preview.endDate) }}<template v-if="preview.country"> · {{ preview.country }}</template>
          </p>

          <div class="mt-4 flex items-center gap-3">
            <ul class="flex -space-x-2" :aria-label="$t('join.participantsAria')">
              <li v-for="(p, i) in preview.participants" :key="i">
                <Avatar :src="p.profilePhotoUrl || ''" :name="p.displayName" size="sm" ring />
              </li>
            </ul>
            <p class="text-sm font-semibold text-body">{{ $t('join.participantCount', preview.participantCount) }}</p>
          </div>

          <div class="mt-6 border-t border-line pt-5">
            <!-- De reis zit vol: niemand kan er nog bij, wie al meedoet kan wel door. -->
            <p v-if="preview.isFull && !preview.alreadyParticipant" class="rounded-xl bg-gray-50 px-3.5 py-3 text-sm font-semibold text-body" role="status">
              {{ $t('join.full') }}
            </p>

            <!-- Ingelogd: één klik. -->
            <template v-else-if="auth.isAuthenticated">
              <button type="button" class="btn btn-dark btn-lg w-full" :disabled="busy" @click="joinAsMember">
                {{ busy ? $t('join.joining') : $t('join.joinAs', { name: auth.displayName }) }}
              </button>
              <p class="mt-3 text-center text-xs text-muted">{{ $t('join.whatYouGet') }}</p>
            </template>

            <!-- Zonder account: alleen een naam. -->
            <template v-else>
              <form novalidate @submit.prevent="joinAsGuest">
                <label for="join-name" class="label">{{ $t('join.nameLabel') }}</label>
                <input id="join-name" v-model.trim="name" class="input" autocomplete="given-name" maxlength="40" :placeholder="$t('join.namePlaceholder')" required autofocus />
                <button type="submit" class="btn btn-dark btn-lg mt-3 w-full" :disabled="busy || name.length < 2">
                  {{ busy ? $t('join.joining') : $t('join.join') }}
                </button>
              </form>
              <p class="mt-2 text-center text-xs text-muted">{{ $t('join.noAccountNeeded') }}</p>

              <!-- Google/Apple: meteen een account dat op elk toestel werkt. Verborgen zonder geconfigureerde providers. -->
              <div v-show="externalAvailable" class="mt-5">
                <div class="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-muted" role="separator" :aria-label="$t('externalAuth.or')">
                  <span class="h-px flex-1 bg-line" aria-hidden="true" />
                  <span aria-hidden="true">{{ $t('externalAuth.or') }}</span>
                  <span class="h-px flex-1 bg-line" aria-hidden="true" />
                </div>
                <ExternalLoginButtons :busy="busy" @credential="joinWithExternal" @error="onExternalError" @available="externalAvailable = $event" />
              </div>

              <i18n-t keypath="join.consent" tag="p" class="mt-4 text-center text-xs text-muted" scope="global">
                <template #terms><RouterLink to="/terms" class="link" target="_blank">{{ $t('legal.termsLink') }}</RouterLink></template>
                <template #privacy><RouterLink to="/privacy" class="link" target="_blank">{{ $t('legal.privacyLink') }}</RouterLink></template>
              </i18n-t>

              <p class="mt-5 text-center text-sm text-muted">
                {{ $t('join.haveAccount') }}
                <RouterLink :to="{ name: 'login', query: { redirect: route.fullPath } }" class="link">{{ $t('sharedTrip.login') }}</RouterLink>
              </p>
            </template>

            <p v-if="error" class="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700" role="alert">{{ error }}</p>
          </div>
        </div>
      </article>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Logo from '@/components/ui/Logo.vue'
import Avatar from '@/components/ui/Avatar.vue'
import CoverImage from '@/components/ui/CoverImage.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ExternalLoginButtons from '@/components/auth/ExternalLoginButtons.vue'
import * as invitesApi from '@/api/invitesApi'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/utils/errors'
import { formatDateRange } from '@/utils/date'

// Landingspagina van een uitnodigingslink: preview van de reis en meedoen met een naam, Google/Apple of een bestaand account.
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { t, locale } = useI18n()

const preview = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const name = ref('')
const externalAvailable = ref(false)

const token = () => String(route.params.token || '')

function openTrip(tripId) {
  router.replace({ name: 'trip-detail', params: { id: tripId } })
}

async function run(action) {
  error.value = ''
  busy.value = true
  try {
    openTrip(await action())
  } catch (e) {
    error.value = errorMessage(e, t('join.failed'))
  } finally {
    busy.value = false
  }
}

const joinAsMember = () => run(() => invitesApi.joinTrip(token()))

const joinAsGuest = () => {
  if (name.value.length < 2) return
  return run(() => auth.joinAsGuest(token(), { displayName: name.value, language: locale.value }))
}

const joinWithExternal = ({ provider, idToken, nonce, displayName }) => run(async () => {
  await auth.externalLogin(provider, { idToken, nonce: nonce || null, displayName: displayName || name.value || null })
  // Nieuw account via de link: de onboarding overslaan, de reis ís het begin.
  if (!auth.onboardingCompleted) await auth.completeOnboarding()
  return invitesApi.joinTrip(token())
})

function onExternalError(provider) {
  error.value = t('externalAuth.unavailable', { provider: provider === 'apple' ? 'Apple' : 'Google' })
}

onMounted(async () => {
  try {
    preview.value = await invitesApi.getInvitePreview(token())
    document.title = `${preview.value.title} · ExploreMe`
    // Wie al meedoet hoeft niets te kiezen.
    if (auth.isAuthenticated && preview.value.alreadyParticipant) openTrip(preview.value.tripId)
  } catch {
    preview.value = null
  } finally {
    loading.value = false
  }
})
</script>
