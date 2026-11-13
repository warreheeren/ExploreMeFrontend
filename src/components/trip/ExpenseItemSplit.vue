<template>
  <section class="rounded-xl border border-line">
    <button type="button" class="flex w-full items-center gap-2 px-3 py-2.5 text-left" :aria-expanded="open" aria-controls="exp-split-body" @click="open = !open">
      <Icon name="list" :size="16" class="text-muted" />
      <span class="flex-1 text-sm font-bold text-ink">{{ $t('budget.split.title') }}</span>
      <span class="text-xs font-semibold text-muted">{{ items.length ? $t('budget.split.itemCount', items.length) : $t('budget.split.equal') }}</span>
      <Icon :name="open ? 'chevron-up' : 'chevron-down'" :size="16" class="text-muted" />
    </button>

    <div v-if="open" id="exp-split-body" class="space-y-3 border-t border-line p-3">
      <p class="hint mt-0">{{ $t('budget.split.intro') }}</p>

      <!-- Voorstel uit de OCR van het kasticket -->
      <div v-if="suggestedItems?.length" class="flex flex-wrap items-center gap-2 rounded-xl bg-accent-50 p-3 text-sm" role="status">
        <p class="min-w-0 flex-1 font-semibold text-ink">{{ $t('budget.split.ocrFound', suggestedItems.length) }}</p>
        <button type="button" class="btn btn-primary btn-sm" @click="applySuggestion">{{ $t('budget.split.ocrApply') }}</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="emit('dismissSuggestion')">{{ $t('tripExtras.receipt.ignore') }}</button>
      </div>

      <ul v-if="items.length" class="space-y-2">
        <li v-for="(item, i) in items" :key="item.key" class="rounded-xl bg-gray-50 p-2.5">
          <div class="flex items-center gap-2">
            <input
              class="input h-9 min-w-0 flex-1"
              :value="item.description"
              maxlength="120"
              :placeholder="$t('budget.split.itemPlaceholder')"
              :aria-label="$t('budget.split.itemDescription', { n: i + 1 })"
              @input="patch(i, { description: $event.target.value })"
            />
            <input
              class="input h-9 w-24 tabular-nums"
              type="number"
              min="0.01"
              step="0.01"
              inputmode="decimal"
              :value="item.amount"
              :aria-label="$t('budget.split.itemAmount', { n: i + 1 })"
              @input="patch(i, { amount: $event.target.value === '' ? null : Number($event.target.value) })"
            />
            <button type="button" class="btn-icon btn-icon-sm hover:text-red-600" :aria-label="$t('budget.split.removeItem', { n: i + 1 })" @click="removeItem(i)">
              <Icon name="trash" :size="15" />
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5" role="group" :aria-label="$t('budget.split.whoShares', { item: item.description || i + 1 })">
            <PersonToggle
              v-for="p in participants"
              :key="p.userName"
              :person="p"
              :pressed="item.userNames.includes(p.userName)"
              @toggle="toggleItemUser(i, p.userName)"
            />
          </div>
        </li>
      </ul>

      <button type="button" class="btn btn-secondary btn-sm" :disabled="items.length >= 50" @click="addItem">
        <Icon name="plus" :size="14" /> {{ $t('budget.split.addItem') }}
      </button>

      <!-- De rest: wie deelt mee in wat niet in de items zit -->
      <div v-if="items.length" class="border-t border-line pt-3">
        <p class="text-xs font-bold text-muted">{{ $t('budget.split.restWho', { amount: fmt(summary.rest) }) }}</p>
        <div class="mt-2 flex flex-wrap gap-1.5" role="group" :aria-label="$t('budget.split.restLabel')">
          <PersonToggle
            v-for="p in participants"
            :key="p.userName"
            :person="p"
            :pressed="restSet.has(p.userName)"
            @toggle="toggleRestUser(p.userName)"
          />
        </div>
      </div>

      <p v-if="items.length" class="text-sm" :class="summary.over ? 'font-semibold text-red-600' : 'text-body'" aria-live="polite">
        {{ summaryText }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import PersonToggle from './PersonToggle.vue'
import { formatCurrency } from '@/utils/date'
import { summarizeItemSplit } from '@/utils/budget'

const props = defineProps({
  /** [{ key, description, amount, userNames }] */
  items: { type: Array, default: () => [] },
  /** Wie meedeelt in de rest; null = iedereen. */
  rest: { type: Array, default: null },
  /** Deelnemers van het budget: [{ userName, displayName, profilePhotoUrl }]. */
  participants: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'EUR' },
  /** Artikelregels uit de OCR van het kasticket, nog niet overgenomen. */
  suggestedItems: { type: Array, default: null },
})
const emit = defineEmits(['update:items', 'update:rest', 'dismissSuggestion'])

const { t } = useI18n()
const open = ref(props.items.length > 0 || !!props.suggestedItems?.length)
watch(() => props.suggestedItems?.length, (n) => { if (n) open.value = true })

let nextKey = 0
const newKey = () => `item-${Date.now()}-${nextKey++}`
const everyone = () => props.participants.map((p) => p.userName)

const fmt = (v) => formatCurrency(v, /^[A-Z]{3}$/.test(props.currency) ? props.currency : 'EUR')

const summary = computed(() => summarizeItemSplit(props.items, props.total))
const restSet = computed(() => new Set(props.rest ?? everyone()))

/** "Emma €23,40 · Lucas €17,10 · rest €4,00 gelijk verdeeld" */
const summaryText = computed(() => {
  if (summary.value.over) return t('budget.split.over', { items: fmt(summary.value.itemsTotal), total: fmt(props.total || 0) })
  const parts = props.participants
    .filter((p) => summary.value.perUser[p.userName])
    .map((p) => `${p.displayName} ${fmt(summary.value.perUser[p.userName])}`)
  if (summary.value.rest > 0) parts.push(t('budget.split.restEqual', { amount: fmt(summary.value.rest) }))
  return parts.join(' · ')
})

function patch(index, changes) {
  emit('update:items', props.items.map((item, i) => (i === index ? { ...item, ...changes } : item)))
}

function addItem() {
  emit('update:items', [...props.items, { key: newKey(), description: '', amount: null, userNames: everyone() }])
}

function removeItem(index) {
  emit('update:items', props.items.filter((_, i) => i !== index))
}

/** Een item zonder deelnemers is ongeldig: de laatste kan niet uit. */
function toggleItemUser(index, userName) {
  const current = props.items[index].userNames
  if (current.includes(userName) && current.length === 1) return
  const next = current.includes(userName) ? current.filter((u) => u !== userName) : [...current, userName]
  patch(index, { userNames: next })
}

function toggleRestUser(userName) {
  const set = new Set(restSet.value)
  if (set.has(userName)) {
    if (set.size === 1) return
    set.delete(userName)
  } else {
    set.add(userName)
  }
  // Iedereen geselecteerd = null, zodat een later toegevoegde reisgenoot ook meedeelt.
  emit('update:rest', set.size === props.participants.length ? null : everyone().filter((u) => set.has(u)))
}

/** Neemt de OCR-regels over (iedereen deelt standaard mee) en vervangt lege items. */
function applySuggestion() {
  const kept = props.items.filter((i) => i.description || i.amount)
  const added = props.suggestedItems.map((s) => ({ key: newKey(), description: s.description, amount: s.amount, userNames: everyone() }))
  emit('update:items', [...kept, ...added].slice(0, 50))
  emit('dismissSuggestion')
}
</script>
