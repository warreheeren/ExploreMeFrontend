<template>
  <!-- Knop + chatpaneel "Vraag de assistent"; volledig verborgen zolang de AI-assistent uit staat. -->
  <template v-if="aiStatus.enabled">
    <button type="button" class="btn btn-secondary btn-sm" :aria-expanded="open" @click="open = true">
      <Icon name="sparkle" :size="16" /> {{ $t('ai.assistant.open') }}
    </button>

    <Teleport to="body">
      <Transition name="assistant-fade">
        <div v-if="open" class="fixed inset-0 z-[100] flex items-end justify-end bg-black/40 sm:items-stretch" @pointerdown.self="open = false">
          <section
            ref="panelRef"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            tabindex="-1"
            class="assistant-panel flex h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl border-line bg-surface shadow-pop sm:h-full sm:max-w-[420px] sm:rounded-none sm:border-l"
          >
            <header class="flex shrink-0 items-start gap-3 border-b border-line px-4 py-3.5">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700"><Icon name="sparkle" :size="18" /></span>
              <div class="min-w-0 flex-1">
                <h2 :id="titleId" class="text-base font-extrabold text-ink">{{ $t('ai.assistant.title') }}</h2>
                <p class="truncate text-xs text-muted">{{ trip.title }}</p>
              </div>
              <button v-if="messages.length" type="button" class="btn btn-ghost btn-sm" :disabled="asking" @click="clear">{{ $t('ai.assistant.clear') }}</button>
              <button type="button" class="btn-icon btn-icon-sm" :aria-label="$t('ai.assistant.close')" @click="open = false"><Icon name="x" :size="18" /></button>
            </header>

            <div ref="scrollRef" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              <div v-if="!messages.length" class="space-y-3 py-4">
                <p class="text-sm text-muted">{{ $t('ai.assistant.empty') }}</p>
                <div class="flex flex-wrap gap-2">
                  <button v-for="key in SUGGESTIONS" :key="key" type="button" class="chip-toggle" @click="ask($t(`ai.assistant.suggestions.${key}`))">
                    {{ $t(`ai.assistant.suggestions.${key}`) }}
                  </button>
                </div>
              </div>

              <div v-for="m in messages" :key="m.id" class="flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
                <div class="max-w-[85%]">
                  <p class="mb-0.5 px-1 text-[11px] font-bold text-muted" :class="m.role === 'user' ? 'text-right' : ''">
                    {{ m.role === 'user' ? $t('ai.assistant.you') : $t('ai.assistant.assistant') }}
                  </p>
                  <div
                    class="whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                    :class="m.role === 'user' ? 'rounded-br-md bg-accent-700 text-white' : m.error ? 'rounded-bl-md bg-red-50 text-red-700' : 'rounded-bl-md bg-gray-100 text-ink'"
                  >{{ m.text }}</div>
                </div>
              </div>

              <div v-if="asking" class="flex items-center gap-2 px-1 text-sm text-muted" role="status">
                <Spinner :size="16" /> {{ $t('ai.assistant.thinking') }}
              </div>
            </div>

            <form class="shrink-0 border-t border-line p-3 safe-bottom" @submit.prevent="ask()">
              <div class="flex items-end gap-2">
                <label :for="inputId" class="sr-only">{{ $t('ai.assistant.placeholder') }}</label>
                <textarea
                  :id="inputId"
                  ref="inputRef"
                  v-model="question"
                  rows="1"
                  maxlength="1000"
                  class="textarea max-h-32 min-h-[42px] flex-1 rounded-2xl py-2.5"
                  :placeholder="$t('ai.assistant.placeholder')"
                  :disabled="asking || aiStatus.remainingToday <= 0"
                  @keydown.enter.exact.prevent="ask()"
                />
                <button type="submit" class="btn btn-primary h-[42px] w-[42px] p-0" :disabled="asking || !question.trim() || aiStatus.remainingToday <= 0" :aria-label="$t('ai.assistant.send')">
                  <Icon name="send" :size="18" />
                </button>
              </div>
              <p class="mt-2 px-1 text-[11px] text-muted">
                {{ aiStatus.remainingToday > 0 ? $t('ai.remaining', aiStatus.remainingToday) : $t('ai.limitReached') }} · {{ $t('ai.assistant.privacy') }}
              </p>
            </form>
          </section>
        </div>
      </Transition>
    </Teleport>
  </template>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/ui/Icon.vue'
import Spinner from '@/components/ui/Spinner.vue'
import * as aiApi from '@/api/aiApi'
import { useAiStatus } from '@/composables/useAiStatus'
import { errorMessage } from '@/utils/errors'
import { toHistory } from '@/utils/ai'
import { lockScroll, unlockScroll } from '@/utils/scrollLock'

const SUGGESTIONS = ['pack', 'food', 'rainy']

// Gesprekken per reis blijven bewaard zolang de app open is (het paneel sluiten wist ze niet).
const conversations = new Map()
let seq = 0

const props = defineProps({
  trip: { type: Object, required: true },
})

const { t } = useI18n()
const { status: aiStatus, load: loadAiStatus, setRemaining } = useAiStatus()

const open = ref(false)
const question = ref('')
const asking = ref(false)
const messages = ref(conversations.get(props.trip.id) || [])
const panelRef = ref(null)
const scrollRef = ref(null)
const inputRef = ref(null)
const titleId = `assistant-${Math.random().toString(36).slice(2, 9)}`
const inputId = `${titleId}-input`

function remember() {
  conversations.set(props.trip.id, messages.value)
}

function scrollToEnd() {
  nextTick(() => {
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  })
}

async function ask(text = question.value) {
  const q = (text || '').trim()
  if (!q || asking.value) return
  // De geschiedenis zonder de nieuwe vraag: die gaat apart mee.
  const history = toHistory(messages.value)
  messages.value.push({ id: ++seq, role: 'user', text: q })
  question.value = ''
  asking.value = true
  scrollToEnd()
  try {
    const res = await aiApi.askTripAssistant(props.trip.id, q, history)
    messages.value.push({ id: ++seq, role: 'assistant', text: res.answer })
    setRemaining(res.remainingToday)
  } catch (e) {
    // Een mislukte vraag gaat niet mee in de geschiedenis (de server zag nooit een antwoord).
    messages.value[messages.value.length - 1].error = true
    messages.value.push({ id: ++seq, role: 'assistant', text: errorMessage(e, t('ai.assistant.failed')), error: true })
    if (e?.response?.status === 429) setRemaining(0)
  } finally {
    asking.value = false
    remember()
    scrollToEnd()
    nextTick(() => inputRef.value?.focus())
  }
}

function clear() {
  messages.value = []
  remember()
}

function onKey(e) {
  if (e.key === 'Escape') open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    lockScroll()
    document.addEventListener('keydown', onKey)
    scrollToEnd()
    nextTick(() => inputRef.value?.focus())
  } else {
    unlockScroll()
    document.removeEventListener('keydown', onKey)
  }
})

watch(() => props.trip.id, (id) => {
  messages.value = conversations.get(id) || []
})

onMounted(() => loadAiStatus())
onBeforeUnmount(() => {
  if (open.value) unlockScroll()
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.assistant-fade-enter-active,
.assistant-fade-leave-active {
  transition: opacity 0.18s ease;
}
.assistant-fade-enter-active .assistant-panel,
.assistant-fade-leave-active .assistant-panel {
  transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.assistant-fade-enter-from,
.assistant-fade-leave-to {
  opacity: 0;
}
.assistant-fade-enter-from .assistant-panel,
.assistant-fade-leave-to .assistant-panel {
  transform: translateY(24px);
}
@media (min-width: 640px) {
  .assistant-fade-enter-from .assistant-panel,
  .assistant-fade-leave-to .assistant-panel {
    transform: translateX(24px);
  }
}
</style>
