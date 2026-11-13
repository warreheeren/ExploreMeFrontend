<template>
  <div>
    <PageHeader :eyebrow="$t('challenges.eyebrow')" :title="$t('challenges.title')" :subtitle="$t('challenges.subtitle')" />

    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
      <div v-for="i in 4" :key="i" class="skeleton h-56 rounded-2xl" />
    </div>
    <EmptyState v-else-if="!challenges.length" icon="badge" :title="$t('challenges.empty')" />
    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChallengeCard
          v-for="c in challenges"
          :key="c.key"
          :challenge="c"
          :busy="busyKey === c.key"
          @join="join"
          @leave="leave"
          @leaderboard="openLeaderboard"
        />
      </div>
      <p class="mt-4 text-xs font-semibold text-muted">{{ $t('challenges.countsHint') }}</p>
    </template>

    <LeaderboardModal v-model="leaderboardOpen" :challenge="leaderboardFor" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ChallengeCard from '@/components/challenges/ChallengeCard.vue'
import LeaderboardModal from '@/components/challenges/LeaderboardModal.vue'
import * as challengesApi from '@/api/challengesApi'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'
import { sortChallenges } from '@/utils/socialExtras'

const { t } = useI18n()
const toast = useToastStore()
const confirm = useConfirm()

const challenges = ref([])
const loading = ref(true)
const busyKey = ref(null)
const leaderboardOpen = ref(false)
const leaderboardFor = ref(null)

async function load() {
  try {
    challenges.value = sortChallenges(await challengesApi.getChallenges())
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

function replace(updated) {
  challenges.value = challenges.value.map((c) => (c.key === updated.key ? updated : c))
}

async function join(challenge) {
  busyKey.value = challenge.key
  try {
    replace(await challengesApi.joinChallenge(challenge.key))
    toast.success(t('challenges.joinedToast', { name: t(`challenges.items.${challenge.key}.name`) }))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busyKey.value = null
  }
}

async function leave(challenge) {
  if (!(await confirm({ title: t('challenges.leaveTitle'), message: t('challenges.leaveMessage'), confirmLabel: t('challenges.leave') }))) return
  busyKey.value = challenge.key
  try {
    await challengesApi.leaveChallenge(challenge.key)
    replace({ ...challenge, joined: false, participantCount: Math.max(0, challenge.participantCount - 1) })
    toast.success(t('challenges.leftToast'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busyKey.value = null
  }
}

function openLeaderboard(challenge) {
  leaderboardFor.value = challenge
  leaderboardOpen.value = true
}

onMounted(load)
</script>
