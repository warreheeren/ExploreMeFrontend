<template>
  <div>
    <PageHeader :title="$t('lists.title')" :subtitle="$t('lists.subtitle')">
      <template #actions>
        <button type="button" class="btn btn-dark btn-sm" @click="formOpen = true"><Icon name="plus" :size="14" /> {{ $t('lists.new') }}</button>
      </template>
    </PageHeader>

    <div v-if="loading" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"><div v-for="i in 3" :key="i" class="skeleton h-64 rounded-2xl" /></div>
    <EmptyState v-else-if="error" icon="alert" :title="$t('lists.loadError')" :text="error">
      <button type="button" class="btn btn-secondary btn-sm" @click="load">{{ $t('common.retry') }}</button>
    </EmptyState>
    <EmptyState v-else-if="!lists.length" icon="list" :title="$t('lists.emptyTitle')" :text="$t('lists.emptyText')">
      <button type="button" class="btn btn-primary btn-sm" @click="formOpen = true">{{ $t('lists.new') }}</button>
      <RouterLink v-if="features.discover" to="/discover" class="btn btn-secondary btn-sm">{{ $t('lists.toDiscover') }}</RouterLink>
    </EmptyState>
    <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <ListCard v-for="l in lists" :key="l.id" :list="l" />
    </div>

    <ListFormDialog v-model="formOpen" @saved="onSaved" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import ListCard from '@/components/lists/ListCard.vue'
import ListFormDialog from '@/components/lists/ListFormDialog.vue'
import * as listsApi from '@/api/listsApi'
import { errorMessage } from '@/utils/errors'
import { features } from '@/config/features'

const router = useRouter()
const lists = ref([])
const loading = ref(true)
const error = ref('')
const formOpen = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    lists.value = await listsApi.getMyLists()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

function onSaved(list) {
  router.push(`/lists/${list.id}`)
}

onMounted(load)
</script>
