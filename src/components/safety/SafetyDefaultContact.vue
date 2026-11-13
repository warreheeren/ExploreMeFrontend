<template>
  <section class="card card-pad sm:p-6" aria-labelledby="settings-safety">
    <h2 id="settings-safety" class="card-title mb-1 flex items-center gap-2"><Icon name="shield" :size="18" /> {{ $t('safety.settings.title') }}</h2>
    <p class="mb-4 text-sm text-muted">{{ $t('safety.settings.text') }}</p>
    <div v-if="loading" class="skeleton h-20 rounded-xl" />
    <form v-else class="space-y-3" @submit.prevent="save">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label for="safety-default-name" class="label">{{ $t('safety.form.contactName') }}</label>
          <input id="safety-default-name" v-model.trim="name" maxlength="100" class="input" autocomplete="off" />
        </div>
        <div>
          <label for="safety-default-email" class="label">{{ $t('safety.form.contactEmail') }}</label>
          <input id="safety-default-email" v-model.trim="email" type="email" maxlength="254" class="input" autocomplete="off" />
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="submit" class="btn btn-dark btn-sm" :disabled="saving || !name || !email">{{ $t('safety.settings.save') }}</button>
        <button v-if="hasSaved" type="button" class="btn btn-ghost btn-sm" :disabled="saving" @click="clear">{{ $t('safety.settings.clear') }}</button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import * as safetyApi from '@/api/safetyApi'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'

const { t } = useI18n()
const toast = useToastStore()

const name = ref('')
const email = ref('')
const hasSaved = ref(false)
const loading = ref(true)
const saving = ref(false)

function apply(contact) {
  name.value = contact?.name || ''
  email.value = contact?.email || ''
  hasSaved.value = !!contact?.email
}

async function persist(contact, message) {
  saving.value = true
  try {
    apply(await safetyApi.updateDefaultContact(contact))
    toast.success(message)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

const save = () => persist({ name: name.value, email: email.value }, t('safety.settings.saved'))
const clear = () => persist({ name: null, email: null }, t('safety.settings.cleared'))

onMounted(async () => {
  try {
    apply(await safetyApi.getDefaultContact())
  } catch {
    apply(null)
  } finally {
    loading.value = false
  }
})
</script>
