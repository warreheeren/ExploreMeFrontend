<template>
  <div>
    <div v-if="loading" class="space-y-4"><div class="skeleton h-24 rounded-2xl" /><div class="skeleton h-80 rounded-2xl" /></div>

    <EmptyState v-else-if="!list" icon="list" :title="$t('lists.notFoundTitle')" :text="$t('lists.notFoundText')">
      <RouterLink to="/lists" class="btn btn-secondary btn-sm">{{ $t('lists.toLists') }}</RouterLink>
    </EmptyState>

    <template v-else>
      <PageHeader :title="list.name" :subtitle="list.description || ''" :back-to="list.isOwner ? '/lists' : `/u/${list.ownerUserName}?tab=lijsten`" :back-label="list.isOwner ? $t('lists.title') : list.ownerDisplayName">
        <template #actions>
          <span class="chip chip-muted"><Icon :name="list.isPublic ? 'globe' : 'lock'" :size="13" /> {{ list.isPublic ? $t('common.public') : $t('common.private') }}</span>
          <template v-if="list.isOwner">
            <button type="button" class="btn btn-secondary btn-sm" @click="formOpen = true"><Icon name="edit" :size="14" /> {{ $t('common.edit') }}</button>
            <button type="button" class="btn btn-danger-ghost btn-sm" @click="remove"><Icon name="trash" :size="14" /> {{ $t('common.delete') }}</button>
          </template>
          <button v-else-if="list.isPublic" type="button" class="btn btn-secondary btn-sm" @click="copyLink"><Icon name="link" :size="14" /> {{ $t('lists.copyLink') }}</button>
        </template>
      </PageHeader>

      <p class="-mt-3 mb-5 flex items-center gap-2 text-sm text-muted">
        <RouterLink :to="`/u/${list.ownerUserName}`" class="inline-flex items-center gap-2 font-semibold hover:text-ink">
          <Avatar :src="list.ownerProfilePhotoUrl" :name="list.ownerDisplayName" size="xs" /> {{ list.ownerDisplayName }}
        </RouterLink>
        · {{ $t('lists.places', { n: list.items.length }) }}
      </p>

      <EmptyState v-if="!list.items.length" icon="pin" :title="$t('lists.noItemsTitle')" :text="$t('lists.noItemsText')">
        <RouterLink to="/discover" class="btn btn-secondary btn-sm">{{ $t('lists.toDiscover') }}</RouterLink>
      </EmptyState>

      <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <ul class="order-2 space-y-3 lg:order-1">
          <li v-for="item in list.items" :key="item.stopId" class="card flex gap-3 p-3 transition" :class="selectedId === item.stopId ? 'border-accent-700 ring-2 ring-accent-100' : ''">
            <button type="button" class="h-20 w-20 shrink-0 overflow-hidden rounded-xl" :class="item.imageUrl ? 'bg-gray-100' : stopTypeMeta(item.type).soft" :aria-label="$t('lists.showOnMap', { name: item.name })" @click="selectedId = item.stopId">
              <img v-if="item.imageUrl" :src="thumbUrl(item.imageUrl)" alt="" class="h-full w-full object-cover" loading="lazy" />
              <span v-else class="flex h-full w-full items-center justify-center"><Icon :name="stopTypeMeta(item.type).icon" :size="22" /></span>
            </button>
            <div class="min-w-0 flex-1">
              <p class="flex items-start gap-2">
                <RouterLink :to="`/places/${item.stopId}`" class="min-w-0 flex-1 text-sm font-extrabold text-ink hover:underline">{{ item.name }}</RouterLink>
                <button v-if="list.isOwner" type="button" class="btn-icon btn-icon-sm -mr-1 -mt-1 hover:text-red-600" :aria-label="$t('lists.removeItem', { name: item.name })" @click="removeItem(item)">
                  <Icon name="x" :size="15" />
                </button>
              </p>
              <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-muted">
                <span class="inline-flex items-center gap-1" :class="stopTypeMeta(item.type).chip.split(' ').find((c) => c.startsWith('text-'))"><Icon :name="stopTypeMeta(item.type).icon" :size="12" /> {{ stopTypeMeta(item.type).singular }}</span>
                <StarRating v-if="item.rating" :model-value="item.rating" size="xs" />
                <span v-if="item.priceLevel" class="text-body">{{ '€'.repeat(item.priceLevel) }}</span>
                <span v-if="item.cuisineType">{{ item.cuisineType }}</span>
              </p>
              <p v-if="item.address" class="mt-0.5 truncate text-xs text-muted">{{ item.address }}</p>
              <p class="mt-1 text-xs text-muted">
                {{ $t('lists.fromTrip') }} <RouterLink :to="`/trips/${item.tripId}`" class="link">{{ item.tripTitle }}</RouterLink>
                <template v-if="item.country"> · {{ item.country }}</template>
              </p>
              <p v-if="item.note" class="mt-1 text-sm text-body">“{{ item.note }}”</p>
            </div>
          </li>
        </ul>
        <div class="order-1 lg:order-2">
          <div class="card overflow-hidden lg:sticky lg:top-24">
            <TripMap :stops="mapStops" :selected-stop-id="selectedId" :show-route="false" :numbered="false" height-class="h-[280px] sm:h-[360px] lg:h-[calc(100vh-9rem)]" @select="(s) => (selectedId = s.id)" />
          </div>
        </div>
      </div>

      <ListFormDialog v-model="formOpen" :list="list" @saved="onSaved" />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import StarRating from '@/components/StarRating.vue'
import TripMap from '@/components/trip/TripMap.vue'
import ListFormDialog from '@/components/lists/ListFormDialog.vue'
import * as listsApi from '@/api/listsApi'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { errorMessage } from '@/utils/errors'
import { thumbUrl } from '@/utils/media'
import { stopTypeMeta } from '@/utils/stopTypes'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const list = ref(null)
const loading = ref(true)
const selectedId = ref(null)
const formOpen = ref(false)

const mapStops = computed(() => (list.value?.items || []).map((i, idx) => ({
  id: i.stopId, name: i.name, address: i.address, latitude: i.latitude, longitude: i.longitude, type: i.type, orderIndex: idx,
})))

async function load() {
  loading.value = true
  try {
    list.value = await listsApi.getList(route.params.id)
    document.title = `${list.value.name} · ExploreMe`
  } catch {
    list.value = null
  } finally {
    loading.value = false
  }
}

async function removeItem(item) {
  try {
    await listsApi.removeFromList(list.value.id, item.stopId)
    list.value.items = list.value.items.filter((i) => i.stopId !== item.stopId)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function remove() {
  const ok = await confirm({ title: t('lists.deleteTitle'), message: t('lists.deleteText', { name: list.value.name }), confirmLabel: t('common.delete'), variant: 'danger' })
  if (!ok) return
  try {
    await listsApi.deleteList(list.value.id)
    toast.success(t('lists.deleted'))
    router.replace('/lists')
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

function onSaved(saved) {
  Object.assign(list.value, { name: saved.name, description: saved.description, isPublic: saved.isPublic })
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.success(t('common.copied'))
  } catch {
    toast.error(t('common.somethingWrong'))
  }
}

watch(() => route.params.id, (id, prev) => { if (id && id !== prev) load() })
onMounted(load)
</script>
