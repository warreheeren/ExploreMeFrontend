<template>
  <!-- Nationaliteit(en) voor de visumregels in de landeninfo. Doel van de CTA "/settings#passport". -->
  <section id="passport" ref="root" class="card-pad space-y-4 border-t border-line sm:p-6" aria-labelledby="settings-passport">
    <div>
      <h3 id="settings-passport" class="flex items-center gap-2 text-sm font-extrabold text-ink"><Icon name="globe" :size="16" class="text-muted" /> {{ $t('countryInfo.passportSettings.title') }}</h3>
      <p class="mt-1 text-sm text-muted">{{ $t('countryInfo.passportSettings.intro', { max: MAX_PASSPORTS }) }}</p>
    </div>

    <ul v-if="selected.length" class="flex flex-wrap gap-2" aria-live="polite">
      <li v-for="code in selected" :key="code" class="chip chip-muted h-8">
        <span class="text-xs font-extrabold text-muted">{{ code }}</span> {{ nameOf(code) }}
        <button
          type="button"
          class="-mr-1 ml-0.5 rounded-full p-0.5 hover:text-ink"
          :disabled="saving"
          :aria-label="$t('countryInfo.passportSettings.remove', { country: nameOf(code) })"
          @click="remove(code)"
        >
          <Icon name="x" :size="12" />
        </button>
      </li>
    </ul>

    <div v-if="selected.length < MAX_PASSPORTS" class="sm:max-w-sm">
      <label for="set-passport" class="label">{{ $t('countryInfo.passportSettings.label') }}</label>
      <select id="set-passport" class="select" :disabled="saving || !loaded" :value="''" @change="add($event.target.value); $event.target.value = ''">
        <option value="" disabled>{{ $t('countryInfo.passportSettings.placeholder') }}</option>
        <option v-for="o in available" :key="o.code" :value="o.code">{{ o.name }}</option>
      </select>
    </div>
    <p v-else class="hint">{{ $t('countryInfo.passportSettings.max', { max: MAX_PASSPORTS }) }}</p>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import * as userApi from '@/api/userApi'
import { localeTag } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { MAX_PASSPORTS, passportOptions, regionName } from '@/utils/passports'

const { t, locale } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()

const root = ref(null)
const selected = ref([])
const loaded = ref(false)
const saving = ref(false)

// Afhankelijk van locale.value, zodat namen en sortering meegaan bij een taalwissel (localeTag() leest die taal).
const tag = computed(() => {
  void locale.value
  return localeTag()
})
const options = computed(() => passportOptions(tag.value))
const available = computed(() => options.value.filter((o) => !selected.value.includes(o.code)))

const nameOf = (code) => regionName(code, tag.value)

/** Elke wijziging wordt meteen bewaard: er is geen aparte opslaan-knop voor een paar chips. */
async function persist(next) {
  const previous = selected.value
  selected.value = next
  saving.value = true
  try {
    await auth.updateProfile({ passportCountries: next })
    toast.success(t('countryInfo.passportSettings.saved'))
  } catch (e) {
    selected.value = previous
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}

function add(code) {
  if (!code || selected.value.includes(code) || selected.value.length >= MAX_PASSPORTS) return
  persist([...selected.value, code])
}

function remove(code) {
  persist(selected.value.filter((c) => c !== code))
}

onMounted(async () => {
  try {
    const me = await userApi.getMe()
    selected.value = (me?.passportCountries || []).map((c) => String(c).toUpperCase())
  } catch {
    // Zonder gegevens tonen we een lege keuzelijst; opslaan meldt een eventuele fout.
  } finally {
    loaded.value = true
  }
  if (route.hash === '#passport') {
    await nextTick()
    root.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})
</script>
