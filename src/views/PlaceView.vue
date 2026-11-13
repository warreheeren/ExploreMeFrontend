<template>
  <div>
    <div v-if="loading" class="space-y-4"><div class="skeleton h-40 rounded-2xl" /><div class="grid grid-cols-2 gap-3 lg:grid-cols-4"><div v-for="i in 4" :key="i" class="skeleton h-24 rounded-2xl" /></div></div>

    <EmptyState v-else-if="!place" icon="pin" :title="$t('places.notFoundTitle')" :text="$t('places.notFoundText')">
      <RouterLink to="/discover" class="btn btn-secondary btn-sm">{{ $t('places.toDiscover') }}</RouterLink>
    </EmptyState>

    <template v-else>
      <button type="button" class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink" @click="goBack">
        <Icon name="chevron-left" :size="16" /> {{ $t('common.back') }}
      </button>

      <section class="card overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div class="p-5 sm:p-6">
            <span class="chip" :class="meta.chip"><Icon :name="meta.icon" :size="13" /> {{ meta.singular }}</span>
            <h1 class="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">{{ place.name }}</h1>
            <p v-if="place.address" class="mt-1 flex items-start gap-1.5 text-sm text-muted"><Icon name="pin" :size="15" class="mt-0.5" /> {{ place.address }}</p>
            <p v-if="place.cuisineTypes.length || place.typicalPriceLevel" class="mt-2 flex flex-wrap items-center gap-2 text-sm text-body">
              <span v-for="c in place.cuisineTypes" :key="c" class="chip chip-muted h-6">{{ c }}</span>
              <span v-if="place.typicalPriceLevel" class="font-bold">{{ '€'.repeat(place.typicalPriceLevel) }}</span>
            </p>
            <p class="mt-2 flex flex-wrap items-center gap-x-2 text-sm">
              <span class="text-xs font-bold uppercase tracking-wide text-muted">{{ $t('sun.today') }}</span>
              <SunTimes :date="today" :lat="place.latitude" :lng="place.longitude" :timezone="timezone" />
            </p>
            <div class="mt-5 flex flex-wrap gap-2">
              <button type="button" class="btn btn-dark btn-sm" @click="saveOpen = true"><Icon name="bookmark" :size="14" /> {{ $t('places.save') }}</button>
              <a :href="osmLink" target="_blank" rel="noopener" class="btn btn-secondary btn-sm"><Icon name="external" :size="14" /> {{ $t('places.openMap') }}</a>
              <RouterLink v-if="features.nearby" :to="{ name: 'nearby', query: { lat: place.latitude, lng: place.longitude, name: place.name } }" class="btn btn-secondary btn-sm"><Icon name="locate" :size="14" /> {{ $t('nearby.open') }}</RouterLink>
            </div>
          </div>
          <TripMap :stops="[mapStop]" :show-route="false" :numbered="false" height-class="h-[220px] md:h-full md:min-h-[260px]" />
        </div>
      </section>

      <!-- Wikipedia/Wikivoyage-samenvatting; rendert niets als er geen is. -->
      <PlaceSummaryCard class="mt-5" :stop-id="place.stopId" />

      <div class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="stat-tile">
          <p class="stat-value">{{ place.visitCount }}</p>
          <p class="stat-label">{{ $t('places.visits', place.visitCount) }}</p>
        </div>
        <div class="stat-tile">
          <p class="stat-value">{{ place.travellerCount }}</p>
          <p class="stat-label">{{ $t('places.travellers', place.travellerCount) }}</p>
        </div>
        <div class="stat-tile">
          <p class="stat-value flex items-center gap-1.5">
            <template v-if="place.averageRating">{{ place.averageRating.toLocaleString(localeTag()) }} <Icon name="star" :size="20" filled :stroke-width="0" class="text-rating" /></template>
            <template v-else>–</template>
          </p>
          <p class="stat-label">{{ place.ratingCount ? $t('places.ratings', place.ratingCount) : $t('places.noRatings') }}</p>
        </div>
        <div class="stat-tile">
          <p class="stat-value">{{ place.saveCount }}</p>
          <p class="stat-label">{{ $t('places.saves', place.saveCount) }}</p>
        </div>
      </div>

      <section v-if="place.photoUrls.length" class="mt-6">
        <h2 class="card-title mb-3">{{ $t('places.photos') }}</h2>
        <div class="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
          <button v-for="(src, i) in place.photoUrls" :key="src" type="button" class="aspect-square overflow-hidden rounded-xl bg-gray-100" :aria-label="$t('places.openPhoto', { n: i + 1 })" @click="lightbox = src">
            <img :src="thumbUrl(src)" alt="" class="h-full w-full object-cover transition hover:scale-105" loading="lazy" />
          </button>
        </div>
      </section>

      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section>
          <h2 class="card-title mb-3">{{ $t('places.visitsTitle') }}</h2>
          <ul class="card divide-y divide-line">
            <li v-for="v in place.visits" :key="v.stopId" class="p-4">
              <div class="flex items-center gap-3">
                <RouterLink :to="`/u/${v.userName}`"><Avatar :src="v.profilePhotoUrl" :name="v.displayName" size="sm" /></RouterLink>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm">
                    <RouterLink :to="`/u/${v.userName}`" class="font-extrabold text-ink hover:underline">{{ v.displayName }}</RouterLink>
                    <span class="text-muted"> · {{ formatDate(v.tripStartDate, { month: 'short', year: 'numeric' }) }}</span>
                  </p>
                  <RouterLink :to="`/trips/${v.tripId}`" class="block truncate text-xs font-semibold text-accent-700 hover:underline">{{ v.tripTitle }}</RouterLink>
                </div>
                <StarRating v-if="v.rating" :model-value="v.rating" size="xs" />
              </div>
              <p v-if="v.description" class="mt-2 text-sm text-body">{{ v.description }}</p>
              <p v-if="v.pricePerNight || v.cost || v.duration" class="mt-1 text-xs font-semibold text-muted">
                <template v-if="v.pricePerNight">{{ $t('places.perNight', { price: formatCurrency(v.pricePerNight) }) }}</template>
                <template v-if="v.cost">{{ formatCurrency(v.cost) }}</template>
                <template v-if="v.duration"> · {{ v.duration }}</template>
              </p>
            </li>
          </ul>
        </section>

        <section>
          <h2 class="card-title mb-3">{{ $t('places.postsTitle') }}</h2>
          <EmptyState v-if="!place.posts.length" icon="image" :title="$t('places.noPosts')" bare />
          <div class="space-y-5">
            <PostCard v-for="p in place.posts" :key="p.id" :post="p" />
          </div>
        </section>
      </div>

      <!-- Vragen en antwoorden -->
      <PlaceQuestions v-if="features.placeQa" class="mt-8" :stop-id="place.stopId" />

      <SaveToListDialog v-model="saveOpen" :stop="{ id: place.stopId, name: place.name }" />

      <Teleport to="body">
        <div v-if="lightbox" class="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4" @click="lightbox = null">
          <img :src="lightbox" alt="" class="max-h-full max-w-full rounded-xl object-contain" />
          <button type="button" class="btn-icon absolute right-4 top-4 bg-black/40 text-white hover:bg-black/60" :aria-label="$t('common.close')"><Icon name="x" :size="20" /></button>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup>
import { features } from '@/config/features'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/ui/EmptyState.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import StarRating from '@/components/StarRating.vue'
import PostCard from '@/components/PostCard.vue'
import TripMap from '@/components/trip/TripMap.vue'
import SaveToListDialog from '@/components/lists/SaveToListDialog.vue'
import PlaceQuestions from '@/components/places/PlaceQuestions.vue'
import SunTimes from '@/components/trip/SunTimes.vue'
import PlaceSummaryCard from '@/components/trip/PlaceSummaryCard.vue'
import * as placesApi from '@/api/placesApi'
import * as geoApi from '@/api/geoApi'
import { todayIn } from '@/utils/sun'
import { localeTag } from '@/i18n'
import { formatCurrency, formatDate } from '@/utils/date'
import { thumbUrl } from '@/utils/media'
import { stopTypeMeta } from '@/utils/stopTypes'

const route = useRoute()
const router = useRouter()
const place = ref(null)
const loading = ref(true)
const saveOpen = ref(false)
const lightbox = ref(null)

const meta = computed(() => stopTypeMeta(place.value?.type))
const mapStop = computed(() => ({ id: place.value.stopId, name: place.value.name, address: place.value.address, latitude: place.value.latitude, longitude: place.value.longitude, type: place.value.type, orderIndex: 0 }))
const osmLink = computed(() => `https://www.openstreetmap.org/?mlat=${place.value.latitude}&mlon=${place.value.longitude}#map=17/${place.value.latitude}/${place.value.longitude}`)

// Zonstijden van vandaag, in de lokale tijd van de plek (tijdzone via de API; zonder zone: browsertijd).
const timezone = ref(null)
const today = computed(() => todayIn(timezone.value))

async function loadTimezone(lat, lng) {
  try {
    timezone.value = (await geoApi.getTimezone(lat, lng))?.timezone || null
  } catch {
    timezone.value = null
  }
}

async function load() {
  loading.value = true
  timezone.value = null
  try {
    place.value = await placesApi.getPlace(route.params.stopId)
    document.title = `${place.value.name} · ExploreMe`
    loadTimezone(place.value.latitude, place.value.longitude)
  } catch {
    place.value = null
  } finally {
    loading.value = false
  }
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}

watch(() => route.params.stopId, (id, prev) => { if (id && id !== prev) load() })
onMounted(load)
</script>
