<template>
  <section id="vragen" class="scroll-mt-24">
    <div class="mb-3">
      <h2 class="card-title">{{ $t('placeqa.title') }}</h2>
      <p class="text-sm text-muted">{{ $t('placeqa.subtitle') }}</p>
    </div>

    <form class="card card-pad mb-4 space-y-2" @submit.prevent="ask">
      <label for="place-ask" class="label">{{ $t('placeqa.askLabel') }}</label>
      <textarea id="place-ask" v-model="newQuestion" rows="2" maxlength="500" class="textarea" :placeholder="$t('placeqa.askPlaceholder')" />
      <div class="flex justify-end">
        <button type="submit" class="btn btn-dark btn-sm" :disabled="!newQuestion.trim() || asking">{{ $t('placeqa.ask') }}</button>
      </div>
    </form>

    <div v-if="loading" class="space-y-3"><div v-for="i in 2" :key="i" class="skeleton h-28 rounded-2xl" /></div>
    <p v-else-if="loadError" class="text-sm text-muted">{{ $t('placeqa.loadError') }}</p>
    <EmptyState v-else-if="!questions.length" icon="chat" :title="$t('placeqa.empty')" bare />

    <ul v-else class="space-y-4">
      <li v-for="q in questions" :key="q.id" class="card p-4">
        <div class="flex items-start gap-3">
          <RouterLink :to="`/u/${q.userName}`"><Avatar :src="q.profilePhotoUrl" :name="q.displayName" size="sm" /></RouterLink>
          <div class="min-w-0 flex-1">
            <p class="text-xs text-muted">
              <RouterLink :to="`/u/${q.userName}`" class="font-extrabold text-ink hover:underline">{{ q.displayName }}</RouterLink> · {{ timeAgo(q.createdAtUtc) }}
            </p>
            <p class="mt-0.5 whitespace-pre-line text-[15px] font-bold leading-snug text-ink">{{ q.text }}</p>
          </div>
          <button v-if="q.isMine" type="button" class="btn-icon btn-icon-sm" :aria-label="$t('common.delete')" @click="removeQuestion(q)"><Icon name="trash" :size="15" /></button>
          <button v-else type="button" class="btn-icon btn-icon-sm" :aria-label="$t('placeqa.report')" @click="openReport('placeQuestion', q.id)"><Icon name="flag" :size="15" /></button>
        </div>

        <p class="mt-3 text-xs font-bold text-muted">{{ q.answers.length ? $t('placeqa.answers', q.answers.length) : $t('placeqa.noAnswers') }}</p>
        <ul v-if="q.answers.length" class="mt-2 space-y-3 border-l-2 border-line pl-3">
          <li v-for="a in q.answers" :key="a.id">
            <div class="flex items-start gap-2.5">
              <RouterLink :to="`/u/${a.userName}`"><Avatar :src="a.profilePhotoUrl" :name="a.displayName" size="xs" /></RouterLink>
              <div class="min-w-0 flex-1">
                <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <RouterLink :to="`/u/${a.userName}`" class="font-extrabold text-ink hover:underline">{{ a.displayName }}</RouterLink>
                  <span v-if="a.hasVisited" class="chip chip-accent h-5 px-2 text-[10px]" :title="$t('placeqa.visitedHint')"><Icon name="check" :size="11" /> {{ $t('placeqa.visited') }}</span>
                  <span>{{ timeAgo(a.createdAtUtc) }}</span>
                </p>
                <p class="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-body">{{ a.text }}</p>
                <div class="mt-1 flex items-center gap-1">
                  <button
                    type="button"
                    class="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-bold transition"
                    :class="a.markedHelpfulByMe ? 'bg-accent-50 text-accent-800' : 'text-muted hover:bg-gray-100 hover:text-ink'"
                    :aria-pressed="a.markedHelpfulByMe"
                    :aria-label="$t('placeqa.helpfulAria')"
                    :disabled="a.isMine"
                    @click="toggleHelpful(q, a)"
                  >
                    <Icon name="star" :size="13" :filled="a.markedHelpfulByMe" />
                    {{ a.helpfulCount ? $t('placeqa.helpfulCount', { n: a.helpfulCount }) : $t('placeqa.helpful') }}
                  </button>
                  <button v-if="a.isMine" type="button" class="btn-icon btn-icon-sm" :aria-label="$t('common.delete')" @click="removeAnswer(q, a)"><Icon name="trash" :size="14" /></button>
                  <button v-else type="button" class="btn-icon btn-icon-sm" :aria-label="$t('placeqa.report')" @click="openReport('placeAnswer', a.id)"><Icon name="flag" :size="14" /></button>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <form v-if="answering === q.id" class="mt-3 space-y-2" @submit.prevent="answer(q)">
          <label :for="`answer-${q.id}`" class="sr-only">{{ $t('placeqa.answerLabel') }}</label>
          <textarea :id="`answer-${q.id}`" v-model="answerText" rows="2" maxlength="1000" class="textarea" :placeholder="$t('placeqa.answerPlaceholder')" />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost btn-sm" @click="answering = null">{{ $t('common.cancel') }}</button>
            <button type="submit" class="btn btn-dark btn-sm" :disabled="!answerText.trim() || sending">{{ $t('placeqa.answer') }}</button>
          </div>
        </form>
        <button v-else type="button" class="btn btn-secondary btn-sm mt-3" @click="startAnswer(q)"><Icon name="reply" :size="14" /> {{ $t('placeqa.answerCta') }}</button>
      </li>
    </ul>

    <ReportDialog v-if="reportTarget" v-model="reportOpen" :target-type="reportTarget.type" :target-id="reportTarget.id" />
  </section>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ReportDialog from '@/components/ReportDialog.vue'
import * as qaApi from '@/api/placeQuestionsApi'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { timeAgo } from '@/utils/date'
import { errorMessage } from '@/utils/errors'

const props = defineProps({
  stopId: { type: String, required: true },
})

const { t } = useI18n()
const route = useRoute()
const toast = useToastStore()
const confirm = useConfirm()

const questions = ref([])
const loading = ref(true)
const loadError = ref(false)
const newQuestion = ref('')
const asking = ref(false)
const answering = ref(null)
const answerText = ref('')
const sending = ref(false)
const reportOpen = ref(false)
const reportTarget = ref(null)

/** Zelfde volgorde als de API: meeste nuttig-stemmen, dan "was er", dan oudste eerst. */
function sortAnswers(answers) {
  return [...answers].sort((a, b) => b.helpfulCount - a.helpfulCount || Number(b.hasVisited) - Number(a.hasVisited) || String(a.createdAtUtc).localeCompare(String(b.createdAtUtc)))
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    questions.value = await qaApi.getQuestions(props.stopId)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
  // Vanuit een melding (…#vragen) meteen naar dit blok scrollen.
  if (route.hash === '#vragen') nextTick(() => document.getElementById('vragen')?.scrollIntoView({ behavior: 'smooth' }))
}

async function ask() {
  asking.value = true
  try {
    const q = await qaApi.askQuestion(props.stopId, newQuestion.value.trim())
    questions.value = [q, ...questions.value]
    newQuestion.value = ''
    toast.success(t('placeqa.asked'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    asking.value = false
  }
}

function startAnswer(q) {
  answering.value = q.id
  answerText.value = ''
}

async function answer(q) {
  sending.value = true
  try {
    const a = await qaApi.answerQuestion(q.id, answerText.value.trim())
    q.answers = sortAnswers([...q.answers, a])
    answering.value = null
    answerText.value = ''
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    sending.value = false
  }
}

async function toggleHelpful(q, a) {
  try {
    const res = await qaApi.toggleHelpful(a.id)
    a.markedHelpfulByMe = res.helpful
    a.helpfulCount = res.helpfulCount
    q.answers = sortAnswers(q.answers)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function removeQuestion(q) {
  if (!(await confirm({ title: t('placeqa.deleteQuestionTitle'), message: t('placeqa.deleteQuestionMessage'), variant: 'danger', confirmLabel: t('common.delete') }))) return
  try {
    await qaApi.deleteQuestion(q.id)
    questions.value = questions.value.filter((x) => x.id !== q.id)
    toast.success(t('placeqa.deleted'))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function removeAnswer(q, a) {
  if (!(await confirm({ title: t('placeqa.deleteAnswerTitle'), message: t('placeqa.deleteAnswerMessage'), variant: 'danger', confirmLabel: t('common.delete') }))) return
  try {
    await qaApi.deleteAnswer(a.id)
    q.answers = q.answers.filter((x) => x.id !== a.id)
    toast.success(t('placeqa.deleted'))
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

function openReport(type, id) {
  reportTarget.value = { type, id }
  reportOpen.value = true
}

watch(() => props.stopId, load, { immediate: true })
</script>
