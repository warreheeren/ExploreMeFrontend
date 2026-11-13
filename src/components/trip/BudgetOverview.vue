<template>
  <section class="card card-pad">
    <h3 class="card-title mb-4">{{ $t('tripExtras.budgetChart.title') }}</h3>
    <p v-if="!segments.length" class="text-sm text-muted">{{ $t('tripExtras.budgetChart.empty') }}</p>
    <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
      <!-- Donut per categorie (in basismunt) -->
      <figure class="relative mx-auto h-44 w-44">
        <svg viewBox="0 0 42 42" class="h-full w-full -rotate-90" role="img" :aria-label="ariaSummary">
          <circle cx="21" cy="21" :r="RADIUS" fill="none" stroke="rgb(var(--c-gray-100))" :stroke-width="STROKE" />
          <circle
            v-for="s in segments"
            :key="s.key"
            cx="21"
            cy="21"
            :r="RADIUS"
            fill="none"
            :stroke="s.color"
            :stroke-width="STROKE"
            :stroke-dasharray="s.dashArray"
            :stroke-dashoffset="s.dashOffset"
          />
        </svg>
        <figcaption class="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span class="eyebrow">{{ $t('budget.spent') }}</span>
          <span class="text-lg font-extrabold tabular-nums text-ink">{{ money(budget.spentTotal) }}</span>
        </figcaption>
      </figure>
      <ul class="space-y-2">
        <li v-for="s in segments" :key="s.key" class="flex items-center gap-2.5 text-sm">
          <span class="h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate font-bold text-ink">{{ s.label }}</span>
          <span class="tabular-nums text-muted">{{ s.percent }}%</span>
          <span class="w-24 text-right font-semibold tabular-nums text-body">{{ money(s.value) }}</span>
        </li>
      </ul>
    </div>

    <!-- Uitgaven per persoon (wie schoot voor) -->
    <div v-if="people.length > 1 && budget.spentTotal > 0" class="mt-6 border-t border-line pt-4">
      <p class="eyebrow mb-3">{{ $t('tripExtras.budgetChart.perPerson') }}</p>
      <ul class="space-y-3">
        <li v-for="p in people" :key="p.userName">
          <div class="flex items-center justify-between gap-2 text-sm">
            <span class="truncate font-bold text-ink">{{ p.displayName }}</span>
            <span class="font-semibold tabular-nums text-body">{{ money(p.paid) }}</span>
          </div>
          <div class="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
            <div class="h-full rounded-full bg-accent-700" :style="{ width: `${p.width}%` }" />
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { categoryMeta, EXPENSE_CATEGORY_ORDER } from '@/utils/budget'
import { barWidths, donutSegments } from '@/utils/chart'
import { formatCurrency } from '@/utils/date'

const props = defineProps({
  /** TripBudgetDto van de API. */
  budget: { type: Object, required: true },
})

const { t } = useI18n()
const RADIUS = 15.9155 // omtrek ≈ 100, zodat dasharray-waarden percentages zijn
const STROKE = 5.5

const money = (v) => formatCurrency(v, props.budget.currency || 'EUR')

const segments = computed(() => {
  const spent = Object.fromEntries((props.budget.categories || []).map((c) => [c.category, c.spent]))
  return donutSegments(EXPENSE_CATEGORY_ORDER.map((key) => ({ key, value: spent[key] || 0, label: categoryMeta(key).label })), 100, 0.6)
})

const ariaSummary = computed(() =>
  t('tripExtras.budgetChart.aria', { list: segments.value.map((s) => `${s.label} ${s.percent}%`).join(', ') }))

const people = computed(() => {
  const list = [...(props.budget.participants || [])].sort((a, b) => b.paid - a.paid)
  const widths = barWidths(list.map((p) => p.paid))
  return list.map((p, i) => ({ ...p, width: widths[i] }))
})
</script>
