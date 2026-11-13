<template>
  <span v-if="offer" class="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
    <span v-if="result && sameLanguage" class="font-semibold text-muted">{{ $t('translate.sameLanguage') }}</span>
    <template v-else>
      <button
        type="button"
        class="inline-flex items-center gap-1 font-bold text-muted hover:text-ink disabled:opacity-60"
        :disabled="loading"
        :aria-pressed="showing"
        @click="toggle"
      >
        <Icon name="globe" :size="13" />
        {{ loading ? $t('translate.loading') : showing ? $t('translate.showOriginal') : result ? $t('translate.showTranslation') : $t('translate.translate') }}
      </button>
      <span v-if="showing && result" class="text-muted">
        {{ sourceName ? $t('translate.translatedFrom', { language: sourceName }) : $t('translate.translated') }}
      </span>
    </template>
  </span>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import { useTranslation } from '@/composables/useTranslation'
import { languageName } from '@/utils/language'

// Vertaalknop onder content. v-model = de vertaalde tekst zolang die getoond wordt, anders null;
// de ouder toont dan `vertaling ?? origineel`.
const props = defineProps({
  kind: { type: String, required: true }, // post | comment | tripComment | journal | tripDescription
  id: { type: String, required: true },
  text: { type: String, default: '' },
  modelValue: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue'])

const { locale } = useI18n()
const { offer, loading, result, showing, sameLanguage, displayText, toggle } = useTranslation(
  () => props.kind,
  () => props.id,
  () => props.text,
)

const sourceName = computed(() => languageName(result.value?.sourceLanguage, locale.value))

watch(
  () => (showing.value && result.value && !sameLanguage.value ? displayText.value : null),
  (value) => {
    if (value !== props.modelValue) emit('update:modelValue', value)
  },
  { immediate: true },
)
</script>
