<template>
  <section class="card" :aria-label="$t('badges.title')">
    <header class="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
      <h3 class="card-title flex items-center gap-2"><Icon name="badge" :size="17" /> {{ $t('badges.title') }}</h3>
      <span v-if="stats" class="text-xs font-bold text-muted">{{ $t('badges.earned', { n: earnedCount, total: stats.badges.length }) }}</span>
    </header>

    <div v-if="loading" class="grid grid-cols-4 gap-2 p-4"><div v-for="i in 8" :key="i" class="skeleton aspect-square rounded-xl" /></div>
    <template v-else-if="stats">
      <dl class="grid grid-cols-3 gap-2 px-4 pb-3 text-center">
        <div class="rounded-xl bg-gray-50 p-2"><dt class="text-[11px] font-semibold text-muted">{{ $t('badges.stats.countries') }}</dt><dd class="text-base font-bold tabular-nums text-ink">{{ stats.countries }}</dd></div>
        <div class="rounded-xl bg-gray-50 p-2"><dt class="text-[11px] font-semibold text-muted">{{ $t('badges.stats.continents') }}</dt><dd class="text-base font-bold tabular-nums text-ink">{{ stats.continents }}</dd></div>
        <div class="rounded-xl bg-gray-50 p-2"><dt class="text-[11px] font-semibold text-muted">{{ $t('badges.stats.km') }}</dt><dd class="text-base font-bold tabular-nums text-ink">{{ Math.round(stats.distanceKm).toLocaleString(localeTag()) }}</dd></div>
      </dl>
      <ul class="grid grid-cols-4 gap-2 px-4 pb-4 sm:grid-cols-5 lg:grid-cols-4">
        <li v-for="b in stats.badges" :key="b.key" class="min-w-0">
          <button
            type="button"
            class="group flex w-full flex-col items-center rounded-xl p-1.5 text-center transition hover:bg-gray-50"
            :aria-label="badgeAria(b)"
            :aria-pressed="selected?.key === b.key"
            @click="selected = selected?.key === b.key ? null : b"
          >
            <span
              class="relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition"
              :class="b.earned ? 'border-accent-700 bg-accent-50 text-accent-800' : 'border-dashed border-line-strong text-muted opacity-60'"
            >
              <Icon :name="b.icon" :size="20" />
              <span v-if="b.earned && b.maxLevel > 1" class="absolute -bottom-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-700 px-1 text-[10px] font-bold text-white">{{ b.level }}</span>
            </span>
            <span class="mt-1 line-clamp-2 w-full hyphens-auto text-[10px] font-bold leading-tight text-body [overflow-wrap:anywhere]">{{ $t(`badges.items.${b.key}.name`) }}</span>
          </button>
        </li>
      </ul>
      <div v-if="selected" class="mx-4 mb-4 rounded-xl border border-line p-3">
        <p class="text-sm font-bold text-ink">{{ $t(`badges.items.${selected.key}.name`) }} <span v-if="selected.earned" class="text-accent-700">· {{ $t('badges.level', { n: selected.level, max: selected.maxLevel }) }}</span></p>
        <p class="mt-0.5 text-xs text-muted">{{ $t(`badges.items.${selected.key}.description`) }}</p>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-valuenow="selected.progress" :aria-valuemax="selected.nextTarget">
          <div class="h-full rounded-full bg-accent-700" :style="{ width: `${progressPct(selected)}%` }" />
        </div>
        <p class="mt-1 text-[11px] font-semibold text-muted">
          {{ selected.level >= selected.maxLevel ? $t('badges.maxed') : $t('badges.progress', { value: selected.progress.toLocaleString(localeTag()), target: selected.nextTarget.toLocaleString(localeTag()) }) }}
        </p>
      </div>
    </template>
    <p v-else class="px-4 pb-4 text-sm text-muted">{{ $t('badges.unavailable') }}</p>
    <RouterLink v-if="features.challenges" to="/challenges" class="flex items-center justify-between gap-2 border-t border-line px-4 py-3 text-sm font-bold text-accent-700 transition hover:bg-gray-50">
      <span class="inline-flex items-center gap-2"><Icon name="flag" :size="15" /> {{ $t('challenges.link') }}</span>
      <Icon name="chevron-right" :size="16" />
    </RouterLink>
  </section>
</template>

<script setup>
import { features } from '@/config/features'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import * as userApi from '@/api/userApi'
import { localeTag } from '@/i18n'

const props = defineProps({
  userName: { type: String, required: true },
})
const emit = defineEmits(['loaded'])

const { t } = useI18n()
const stats = ref(null)
const loading = ref(true)
const selected = ref(null)

const earnedCount = computed(() => stats.value?.badges.filter((b) => b.earned).length || 0)

function progressPct(b) {
  if (b.level >= b.maxLevel) return 100
  return Math.min(100, Math.round((b.progress / Math.max(1, b.nextTarget)) * 100))
}

function badgeAria(b) {
  const name = t(`badges.items.${b.key}.name`)
  return b.earned ? `${name}, ${t('badges.level', { n: b.level, max: b.maxLevel })}` : `${name}, ${t('badges.notEarned')}`
}

async function load() {
  loading.value = true
  selected.value = null
  try {
    stats.value = await userApi.getStats(props.userName)
    emit('loaded', stats.value)
  } catch {
    stats.value = null
  } finally {
    loading.value = false
  }
}

watch(() => props.userName, load, { immediate: true })
</script>
