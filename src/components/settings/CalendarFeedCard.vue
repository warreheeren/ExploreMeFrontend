<template>
  <section class="card card-pad mb-5 space-y-4 sm:p-6" aria-labelledby="settings-calendar-feed">
    <div>
      <h2 id="settings-calendar-feed" class="card-title">{{ $t('calendarFeed.title') }}</h2>
      <p class="mt-0.5 text-sm text-muted">{{ $t('calendarFeed.text') }}</p>
    </div>

    <div v-if="loading" class="skeleton h-11 rounded-xl" />

    <button v-else-if="!enabled" type="button" class="btn btn-primary" :disabled="busy" @click="enable">
      <Icon name="calendar" :size="16" /> {{ $t('calendarFeed.enable') }}
    </button>

    <template v-else>
      <!-- De link wordt alleen bij het aanmaken getoond (de server bewaart enkel een hash). -->
      <p v-if="!url" class="rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm text-body">{{ $t('calendarFeed.hiddenUrl') }}</p>
      <div v-else>
        <label for="calendar-feed-url" class="label">{{ $t('calendarFeed.urlLabel') }}</label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input id="calendar-feed-url" :value="url" class="input min-w-0 flex-1 font-mono text-xs" readonly @focus="$event.target.select()" />
          <button type="button" class="btn btn-secondary" @click="copy"><Icon name="copy" :size="16" /> {{ $t('calendarFeed.copy') }}</button>
        </div>
        <p class="hint">{{ $t('calendarFeed.privateNote') }}</p>
      </div>

      <div v-if="url" class="flex flex-wrap gap-2">
        <a :href="webcalUrl" class="btn btn-dark btn-sm"><Icon name="calendar" :size="14" /> {{ $t('calendarFeed.openApp') }}</a>
        <a :href="googleUrl" target="_blank" rel="noopener" class="btn btn-secondary btn-sm"><Icon name="external" :size="14" /> {{ $t('calendarFeed.google') }}</a>
      </div>

      <div class="flex flex-wrap gap-2 border-t border-line pt-4">
        <button type="button" class="btn btn-ghost btn-sm" :disabled="busy" @click="regenerate"><Icon name="refresh" :size="14" /> {{ $t('calendarFeed.regenerate') }}</button>
        <button type="button" class="btn btn-danger-ghost btn-sm" :disabled="busy" @click="disable"><Icon name="x" :size="14" /> {{ $t('calendarFeed.disable') }}</button>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import * as calendarApi from '@/api/calendarApi'
import { confirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { googleCalendarUrl, toWebcalUrl } from '@/utils/calendarFeed'

// "Agenda-abonnement" in Instellingen → Account: een geheime .ics-link met al je reizen.
const { t } = useI18n()
const toast = useToastStore()

const url = ref(null)
const enabled = ref(false)
const loading = ref(true)
const busy = ref(false)

const webcalUrl = computed(() => toWebcalUrl(url.value))
const googleUrl = computed(() => googleCalendarUrl(url.value))

async function load() {
  loading.value = true
  try {
    const feed = await calendarApi.getCalendarFeed()
    enabled.value = !!feed.enabled
    url.value = feed.url || null
  } catch {
    enabled.value = false
    url.value = null
  } finally {
    loading.value = false
  }
}

async function run(action, successKey) {
  busy.value = true
  try {
    await action()
    toast.success(t(successKey))
  } catch (e) {
    toast.error(errorMessage(e, t('calendarFeed.failed')))
  } finally {
    busy.value = false
  }
}

async function createLink() {
  const feed = await calendarApi.regenerateCalendarFeed()
  enabled.value = true
  url.value = feed.url
}

function enable() {
  return run(createLink, 'calendarFeed.enabled')
}

async function regenerate() {
  const ok = await confirm({
    title: t('calendarFeed.regenerateTitle'),
    message: t('calendarFeed.regenerateText'),
    confirmLabel: t('calendarFeed.regenerateConfirm'),
    variant: 'danger',
  })
  if (ok) await run(createLink, 'calendarFeed.regenerated')
}

async function disable() {
  const ok = await confirm({
    title: t('calendarFeed.disableTitle'),
    message: t('calendarFeed.disableText'),
    confirmLabel: t('calendarFeed.disableConfirm'),
    variant: 'danger',
  })
  if (ok) {
    await run(async () => {
      await calendarApi.disableCalendarFeed()
      enabled.value = false
      url.value = null
    }, 'calendarFeed.disabled')
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(url.value)
    toast.success(t('calendarFeed.copied'))
  } catch {
    toast.error(t('calendarFeed.copyFailed'))
  }
}

onMounted(load)
</script>
