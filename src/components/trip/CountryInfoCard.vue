<template>
  <article class="card overflow-hidden">
    <button
      type="button"
      class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50 sm:px-5"
      :aria-expanded="open"
      :aria-label="$t('countryInfo.toggle', { country: info.name })"
      @click="open = !open"
    >
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-xs font-extrabold text-accent-700">{{ info.code }}</span>
      <span class="min-w-0 flex-1">
        <span class="flex min-w-0 items-center gap-2">
          <span class="card-title truncate">{{ info.name }}</span>
          <!-- Fase 5: FCDO-niveau; op smalle schermen alleen het gekleurde bolletje. -->
          <span
            v-if="hasLevel"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset"
            :class="levelClass"
            :title="$t('countryInfo.advisoryLevelLabel', { level: levelText })"
          >
            <span class="h-2 w-2 rounded-full" :class="dotClass" aria-hidden="true" />
            <span class="hidden sm:inline">{{ levelText }}</span>
          </span>
        </span>
        <span class="block truncate text-xs font-semibold text-muted">
          {{ info.currency }} · {{ $t(`countryInfo.drivingSide.${info.drivingSide}`) }} · {{ plugText }}
        </span>
      </span>
      <Icon name="chevron-down" :size="18" class="shrink-0 text-muted transition" :class="open ? 'rotate-180' : ''" />
    </button>

    <dl v-if="open" class="grid grid-cols-1 gap-4 border-t border-line px-4 py-4 text-sm sm:grid-cols-2 sm:px-5">
      <div>
        <dt class="eyebrow mb-1">{{ $t('countryInfo.emergency') }}</dt>
        <dd>
          <ul class="space-y-1">
            <li v-for="[kind, number] in emergency" :key="kind" class="flex items-baseline justify-between gap-3">
              <span class="text-body">{{ $t(`countryInfo.emergencyKinds.${kind}`) }}</span>
              <a :href="`tel:${number}`" class="link tabular-nums" :aria-label="$t('countryInfo.call', { number })">{{ number }}</a>
            </li>
          </ul>
        </dd>
      </div>

      <div>
        <dt class="eyebrow mb-1">{{ $t('countryInfo.plugs') }}</dt>
        <dd class="text-ink">{{ plugText }} · {{ $t('countryInfo.voltage', { voltage: info.voltage }) }}</dd>
      </div>

      <div>
        <dt class="eyebrow mb-1">{{ $t('countryInfo.currency') }}</dt>
        <dd class="text-ink">
          <template v-if="rateText">{{ rateText }}</template>
          <template v-else>{{ info.currency }} <span class="text-muted">· {{ $t('countryInfo.rateUnknown') }}</span></template>
        </dd>
      </div>

      <div>
        <dt class="eyebrow mb-1">{{ $t('countryInfo.tipping') }}</dt>
        <dd class="text-ink">{{ $t(`countryInfo.tippingKinds.${info.tipping}`) }}</dd>
      </div>

      <div>
        <dt class="eyebrow mb-1">{{ $t('countryInfo.driving') }}</dt>
        <dd class="text-ink">{{ $t(`countryInfo.drivingSide.${info.drivingSide}`) }}</dd>
      </div>

      <div v-if="languages">
        <dt class="eyebrow mb-1">{{ $t('countryInfo.languages') }}</dt>
        <dd class="text-ink">{{ languages }}</dd>
      </div>

      <div v-if="info.advisoryUrl || hasLevel" class="sm:col-span-2">
        <dt class="eyebrow mb-1">{{ $t('countryInfo.advisory') }}</dt>
        <dd class="space-y-1.5">
          <p v-if="hasLevel" class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset" :class="levelClass">
              <span class="h-2 w-2 rounded-full" :class="dotClass" aria-hidden="true" /> {{ levelText }}
            </span>
            <span class="text-xs text-muted">
              <template v-if="updatedText">{{ $t('countryInfo.advisoryUpdated', { date: updatedText }) }} · </template>{{ $t('countryInfo.advisorySource') }}
            </span>
          </p>
          <a v-if="info.advisoryUrl" :href="info.advisoryUrl" target="_blank" rel="noopener noreferrer" class="link inline-flex items-center gap-1.5">
            {{ $t('countryInfo.advisoryLink') }} <Icon name="external" :size="14" />
          </a>
        </dd>
      </div>

      <!-- Inreiseisen per paspoort van de kijker (Passport Index); zonder paspoort een uitnodiging naar de instellingen. -->
      <div v-if="visa.length || showPassportCta" class="sm:col-span-2">
        <dt class="eyebrow mb-1">{{ $t('countryInfo.visa.title') }}</dt>
        <dd v-if="visa.length" class="space-y-2">
          <ul class="space-y-1.5">
            <li v-for="v in visa" :key="v.passport" class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="text-body">{{ $t('countryInfo.visa.passport', { country: passportName(v.passport) }) }}</span>
              <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset" :class="v.levelClass">
                <span class="h-2 w-2 rounded-full" :class="v.dotClass" aria-hidden="true" />
                {{ v.label }}<template v-if="v.days"> · {{ $t('countryInfo.visa.days', v.days) }}</template>
              </span>
              <a v-if="v.officialUrl" :href="v.officialUrl" target="_blank" rel="noopener noreferrer" class="link inline-flex items-center gap-1 text-xs">
                {{ $t('countryInfo.visa.officialLink') }} <Icon name="external" :size="12" />
              </a>
            </li>
          </ul>
          <p class="text-xs text-muted">
            {{ $t('countryInfo.visa.disclaimer') }}
            <template v-if="visaDateText"> {{ $t('countryInfo.visa.source', { date: visaDateText }) }}</template>
          </p>
        </dd>
        <dd v-else class="flex flex-col gap-2 rounded-xl bg-gray-50 p-3 sm:flex-row sm:items-center">
          <span class="flex-1">
            <span class="block text-sm font-bold text-ink">{{ $t('countryInfo.visa.noPassportTitle') }}</span>
            <span class="block text-xs text-muted">{{ $t('countryInfo.visa.noPassportText') }}</span>
          </span>
          <RouterLink :to="{ path: '/settings', hash: '#passport' }" class="btn btn-secondary btn-sm shrink-0">{{ $t('countryInfo.visa.noPassportCta') }}</RouterLink>
        </dd>
      </div>

      <div v-if="info.esimUrl" class="sm:col-span-2">
        <dt class="sr-only">{{ $t('countryInfo.esimHint') }}</dt>
        <dd class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <PartnerLink :href="info.esimUrl" icon="globe">{{ $t('countryInfo.esim', { country: info.name }) }}</PartnerLink>
          <span class="text-xs text-muted">{{ $t('countryInfo.esimHint') }}</span>
        </dd>
      </div>
    </dl>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import PartnerLink from '../ui/PartnerLink.vue'
import { localeTag } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { parseDateOnly, parseTimestamp } from '@/utils/date'
import { advisoryDotClass, advisoryLevelClass, isAdvisoryLevel } from '@/utils/advisory'
import { regionName, visaTone } from '@/utils/passports'

const props = defineProps({
  /** CountryInfoDto uit GET /trips/{id}/country-info. */
  info: { type: Object, required: true },
  initiallyOpen: { type: Boolean, default: false },
})

const { t } = useI18n()
const open = ref(props.initiallyOpen)

const EMERGENCY_ORDER = ['general', 'police', 'ambulance', 'fire', 'tourist']
const emergency = computed(() => Object.entries(props.info.emergency || {})
  .sort(([a], [b]) => EMERGENCY_ORDER.indexOf(a) - EMERGENCY_ORDER.indexOf(b)))

// Reisadviesniveau (FCDO); onbekende of ontbrekende niveaus tonen geen label, de link blijft wel.
const hasLevel = computed(() => isAdvisoryLevel(props.info.advisoryLevel))
const levelText = computed(() => (hasLevel.value ? t(`countryInfo.advisoryLevels.${props.info.advisoryLevel}`) : ''))
const levelClass = computed(() => advisoryLevelClass(props.info.advisoryLevel))
const dotClass = computed(() => advisoryDotClass(props.info.advisoryLevel))
const updatedText = computed(() => {
  const d = parseTimestamp(props.info.advisoryUpdatedAtUtc)
  return d ? d.toLocaleDateString(localeTag(), { day: 'numeric', month: 'long', year: 'numeric' }) : ''
})

// Inreiseisen: één regel per paspoort; onbekende (toekomstige) regels laten we weg i.p.v. een kale sleutel te tonen.
const auth = useAuthStore()
const visa = computed(() => (props.info.visa || [])
  .filter((v) => visaTone(v.requirement))
  .map((v) => ({
    ...v,
    label: t(`countryInfo.visa.requirements.${v.requirement}`),
    levelClass: advisoryLevelClass(visaTone(v.requirement)),
    dotClass: advisoryDotClass(visaTone(v.requirement)),
  })))
// Alleen ingelogde kijkers kunnen een paspoort instellen; `visa` ontbreekt bij een oudere API.
const showPassportCta = computed(() => auth.isAuthenticated && Array.isArray(props.info.visa) && props.info.visa.length === 0)
const passportName = (code) => regionName(code, localeTag())
const visaDateText = computed(() => {
  const d = parseDateOnly(props.info.visa?.[0]?.datasetDate)
  return d ? d.toLocaleDateString(localeTag(), { month: 'long', year: 'numeric' }) : ''
})

const plugText = computed(() => t('countryInfo.plugTypes', { types: (props.info.plugs || []).join(', ') }))

const rateText = computed(() => {
  const { rateToBase, currency, baseCurrency } = props.info
  if (rateToBase == null || currency === baseCurrency) return currency === baseCurrency ? currency : ''
  const rate = new Intl.NumberFormat(localeTag(), { maximumSignificantDigits: 4 }).format(rateToBase)
  return t('countryInfo.rate', { from: currency, rate, to: baseCurrency })
})

/** Taalnamen in de taal van de app ("th" → "Thai"); onbekende codes blijven als code staan. */
const languages = computed(() => {
  let names
  try {
    names = new Intl.DisplayNames([localeTag()], { type: 'language' })
  } catch {
    names = null
  }
  return (props.info.languages || []).map((code) => names?.of(code) || code).join(', ')
})
</script>
