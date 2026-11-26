<template>
  <div>
    <!-- Laden -->
    <div v-if="loading" class="space-y-5" aria-busy="true">
      <div class="card overflow-hidden">
        <div class="skeleton h-72 rounded-none" />
        <div class="space-y-3 p-6"><div class="skeleton h-3 w-40" /><div class="skeleton h-8 w-2/3" /><div class="skeleton h-3 w-1/2" /></div>
      </div>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4"><div v-for="i in 4" :key="i" class="skeleton h-24 rounded-2xl" /></div>
    </div>

    <EmptyState v-else-if="!trip" icon="map" :title="$t('trip.notFound.title')" :text="$t('trip.notFound.text')">
      <RouterLink to="/trips" class="btn btn-secondary btn-sm">{{ $t('trip.notFound.action') }}</RouterLink>
    </EmptyState>

    <template v-else>
      <RouterLink to="/trips" class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <Icon name="chevron-left" :size="16" /> {{ $t('trip.allTrips') }}
      </RouterLink>

      <TripHero :trip="trip">
        <template #actions>
          <!-- Eén hoofdactie voor deelnemers: de groep bij elkaar krijgen, daarna de groepschat. -->
          <button v-if="trip.isOwner && isAlone" type="button" class="btn btn-dark btn-sm" @click="inviteLinkOpen = true"><Icon name="users" :size="16" /> {{ $t('overview.invite') }}</button>
          <RouterLink v-else-if="trip.canEdit" :to="`/messages/trip/${trip.id}`" class="btn btn-dark btn-sm">
            <Icon name="chat" :size="16" /> {{ $t('planning.tabs.chat') }}
            <span v-if="overview?.chatUnread" class="badge">{{ overview.chatUnread > 99 ? '99+' : overview.chatUnread }}</span>
          </RouterLink>
          <RouterLink v-if="showToday" :to="`/trips/${trip.id}/today`" class="btn btn-secondary btn-sm"><Icon name="sun" :size="16" /> {{ $t('today.button') }}</RouterLink>
          <!-- Likes en bewaren horen bij ontdekken (features.discover). -->
          <button
            v-if="features.discover"
            type="button"
            class="btn btn-secondary btn-sm"
            :class="trip.likedByMe ? 'border-accent-700 text-accent-700' : ''"
            :aria-pressed="trip.likedByMe"
            @click="toggleLike"
          >
            <Icon name="heart" :size="16" :filled="trip.likedByMe" /> {{ trip.likeCount }}
          </button>
          <button
            v-if="features.discover"
            type="button"
            class="btn btn-secondary btn-sm"
            :class="trip.bookmarkedByMe ? 'border-accent-700 text-accent-700' : ''"
            :aria-pressed="trip.bookmarkedByMe"
            @click="toggleBookmark"
          >
            <Icon name="bookmark" :size="16" :filled="trip.bookmarkedByMe" /> {{ trip.bookmarkedByMe ? $t('trip.actions.saved') : $t('trip.actions.save') }}
          </button>
          <button type="button" class="btn btn-secondary btn-sm" @click="shareOpen = true"><Icon name="share" :size="16" /> {{ $t('trip.actions.share') }}</button>
          <TripAssistant :trip="trip" />

          <div v-click-outside="() => (menuOpen = false)" class="relative">
            <button type="button" class="btn-icon btn-icon-sm border border-line-strong bg-surface" :aria-label="$t('trip.actions.more')" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
              <Icon name="more" :size="18" />
            </button>
            <div v-if="menuOpen" class="menu right-0 top-full mt-2 w-64" role="menu">
              <!-- De chat is de hoofdknop, behalve zolang "Uitnodigen" daar staat. -->
              <RouterLink v-if="trip.isOwner && isAlone" :to="`/messages/trip/${trip.id}`" class="menu-item" role="menuitem"><Icon name="chat" :size="16" /> {{ $t('planning.chat.open') }}</RouterLink>
              <RouterLink v-if="recapMode !== 'none'" :to="`/trips/${trip.id}/recap`" class="menu-item" role="menuitem"><Icon name="sparkle" :size="16" /> {{ $t(recapMode === 'finished' ? 'tripExtras.recap.open' : 'tripExtras.recap.openSoFar') }}</RouterLink>
              <OfflineTripButton :trip="trip" variant="menu" />
              <div class="menu-sep" />
              <RouterLink v-if="trip.canEdit" :to="`/trips/${trip.id}/edit`" class="menu-item" role="menuitem"><Icon name="edit" :size="16" /> {{ $t('trip.actions.edit') }}</RouterLink>
              <button v-if="trip.canEdit && aiStatus.enabled" type="button" class="menu-item" role="menuitem" @click="openBookingImport"><Icon name="sparkle" :size="16" /> {{ $t('bookingImport.open') }}</button>
              <RouterLink :to="`/trips/${trip.id}/print`" class="menu-item" role="menuitem"><Icon name="printer" :size="16" /> {{ $t('trip.actions.print') }}</RouterLink>
              <RouterLink :to="`/trips/${trip.id}/photobook`" class="menu-item" role="menuitem"><Icon name="book" :size="16" /> {{ $t('photobook.open') }}</RouterLink>
              <button type="button" class="menu-item" role="menuitem" @click="exportIcs"><Icon name="calendar" :size="16" /> {{ $t('trip.actions.ics') }}</button>
              <button type="button" class="menu-item" role="menuitem" @click="cloneTrip"><Icon name="copy" :size="16" /> {{ $t('tripExtras.copy.action') }}</button>
              <div class="menu-sep" />
              <button v-if="isCollaborator" type="button" class="menu-item" role="menuitem" @click="leaveTrip"><Icon name="logout" :size="16" /> {{ $t('trip.actions.leave') }}</button>
              <button v-if="!trip.isOwner" type="button" class="menu-item" role="menuitem" @click="openReport"><Icon name="flag" :size="16" /> {{ $t('trip.actions.report') }}</button>
              <button v-if="trip.isOwner" type="button" class="menu-item menu-item-danger" role="menuitem" @click="deleteTrip"><Icon name="trash" :size="16" /> {{ $t('trip.actions.delete') }}</button>
            </div>
          </div>
        </template>
      </TripHero>


      <!-- Tabs -->
      <!-- Vijf hoofdtabs; de onderdelen van de actieve groep staan er als chips onder (?tab= blijft het onderdeel). -->
      <div class="sticky top-16 z-30 -mx-4 mt-4 bg-ground/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <nav class="tabs" :aria-label="$t('trip.tabs.aria')" role="tablist">
          <button
            v-for="g in groups"
            :key="g.id"
            type="button"
            role="tab"
            class="tab flex-1 justify-center sm:flex-none sm:justify-start"
            :class="activeGroup?.id === g.id ? 'tab-active' : ''"
            :aria-selected="activeGroup?.id === g.id"
            @click="setGroup(g)"
          >
            <Icon :name="g.icon" :size="16" class="hidden sm:block" /> {{ g.label }}
            <span v-if="g.count" class="text-xs font-bold text-muted">{{ g.count }}</span>
            <span v-if="g.waiting" class="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-50 px-1 text-[11px] font-extrabold text-rating-text ring-1 ring-inset ring-amber-200" :aria-label="$t('overview.waitingBadge', g.waiting)">{{ g.waiting }}</span>
          </button>
        </nav>
        <div v-if="activeGroup && activeGroup.items.length > 1" ref="tabsRef" class="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-none" role="tablist" :aria-label="activeGroup.label">
          <button
            v-for="t in activeGroup.items"
            :key="t.id"
            type="button"
            role="tab"
            class="chip-toggle h-8 shrink-0"
            :class="tab === t.id ? 'chip-toggle-active' : ''"
            :aria-selected="tab === t.id"
            @click="setTab(t.id)"
          >
            <Icon :name="t.icon" :size="14" /> {{ t.label }}
            <span v-if="t.count" class="font-bold opacity-70">{{ t.count }}</span>
          </button>
        </div>
      </div>

      <div class="mt-4">
        <!-- Overzicht voor deelnemers. v-show: het onderdeel blijft geladen, want het voedt de bolletjes op de tabs en de chatknop. -->
        <TripGroupOverview
          v-if="trip.canEdit"
          v-show="tab === 'start'"
          ref="overviewRef"
          :trip="trip"
          @open-tab="setTab"
          @invite-link="inviteLinkOpen = true"
          @loaded="overview = $event"
        >
          <template #crew>
            <TripCrewCard :trip="trip" @invite-link="inviteLinkOpen = true" @invite="inviteOpen = true" @remove="removeCollaborator" />
          </template>
        </TripGroupOverview>

        <!-- De route begint met de cijfers en het weer (v-show: het weer voedt ook het dagschema). -->
        <div v-show="tab === 'overzicht'" class="mb-5 space-y-5">
          <!-- Deelnemers zien de reisgenoten op het tabblad Overzicht; kijkers hier, bij de route. -->
          <TripCrewCard v-if="!trip.canEdit && trip.collaborators.length" :trip="trip" />

          <TripStats :trip="trip" :route="tripRoute" show-footprint :footprint="footprint" :footprint-loading="footprintLoading" :footprint-failed="footprintFailed" />

          <WeatherStrip v-if="trip.stops.length" :trip-id="trip.id" :version="stopsVersion" @loaded="onWeatherLoaded" />
        </div>

        <!-- Overzicht & dagschema delen één kaart (blijft gemount) -->
        <div v-show="tab === 'overzicht' || tab === 'dagschema'" class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <div class="order-2 min-w-0 lg:order-1">
            <EmptyState v-if="!trip.stops.length" icon="pin" :title="$t('trip.noStops.title')" :text="trip.canEdit ? $t('trip.noStops.textEditor') : $t('trip.noStops.text')">
              <RouterLink v-if="trip.canEdit" :to="`/trips/${trip.id}/edit`" class="btn btn-secondary btn-sm">{{ $t('trip.noStops.action') }}</RouterLink>
            </EmptyState>
            <template v-else-if="tab === 'overzicht'">
              <!-- Fase 3: verblijven checken (bovenaan bij een gekopieerde reis of ?stays=1) -->
              <StaysCard v-if="staysFirst" :trip="trip" copied class="mb-4" @updated="load({ silent: true })" />
              <RouteSummary v-if="trip.stops.length > 1" :route="tripRoute" :trip-stops="trip.stops" :trip="trip" class="mb-4" />
              <StaysCard v-if="!staysFirst" :trip="trip" class="mb-4" @updated="load({ silent: true })" />
              <!-- Fase 4: "Wat te doen" per stop (via StopActions) -->
              <StopGroups :stops="trip.stops" :selected-stop-id="selectedStopId" :show-added-by="trip.collaborators.length > 0" actions :trip-id="trip.id" :can-edit="trip.canEdit" :trip-start-date="trip.startDate" :trip-end-date="trip.endDate" :base-currency="trip.baseCurrency || 'EUR'" @select="selectStop" @save="saveStop" @stops-added="load({ silent: true })" />
            </template>
            <!-- Fase 4: feestdagen als chip per dag + "Wat te doen" per stop -->
            <ItineraryDays v-else :trip="trip" :selected-stop-id="selectedStopId" :legs="legsByStop" :timezones="timezonesByDay" :holidays="holidays" actions @select="selectStop" @save="saveStop" @stops-added="load({ silent: true })" />
            <!-- Fase 6 (GPX-import): tracks op de kaart beheren -->
            <TrackList
              v-if="tab === 'overzicht' && (trip.canEdit || tracks.length)"
              :trip-id="trip.id"
              :tracks="tracks"
              :can-import="trip.canEdit"
              class="mt-4"
              @imported="onTracksImported"
              @renamed="upsertTrack"
              @deleted="removeTrack"
              @select="(tr) => tripMapRef?.focusTrack(tr)"
            />
          </div>
          <div class="order-1 lg:order-2">
            <LiveTrackingBanner :trip-id="trip.id" class="mb-3" />
            <div class="card overflow-hidden lg:sticky lg:top-44">
              <TripMap ref="tripMapRef" :stops="trip.stops" :selected-stop-id="selectedStopId" :route-geometry="tripRoute?.source === 'osrm' ? tripRoute.geometry : null" :route-segments="tripRoute?.segments || null" :live-locations="liveLocations" :tracks="tracks" height-class="h-[300px] sm:h-[380px] lg:h-[calc(100vh-17rem)]" @select="selectStop" />
              <RouteReplay v-if="trip.stops.length > 1" :trip="trip" :map="tripMapRef" :route-geometry="tripRoute?.source === 'osrm' ? tripRoute.geometry : null" />
              <div class="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs font-semibold text-muted">
                <span v-for="t in STOP_TYPE_ORDER" :key="t" class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" :class="stopTypeMeta(t).dot" /> {{ stopTypeMeta(t).singular }}</span>
              </div>
            </div>
          </div>
        </div>

        <TripBudget v-if="tab === 'budget' && trip.canEdit" :trip-id="trip.id" :owner-user-name="trip.userName" :trip-title="trip.title" />

        <TripChecklist v-if="tab === 'paklijst' && trip.canEdit" :trip-id="trip.id" :participants="participants" />

        <div v-if="tab === 'stemmen' && trip.canEdit" class="space-y-5">
          <div class="mx-auto max-w-2xl">
            <DatePoll :trip-id="trip.id" :start-date="trip.startDate" :end-date="trip.endDate" @decided="load({ silent: true })" />
          </div>
          <TripPolls :trip-id="trip.id" />
        </div>

        <TripAttachments v-if="tab === 'documenten' && trip.canEdit" :trip-id="trip.id" :stops="trip.stops" />

        <div v-if="tab === 'dagboek'" class="space-y-5">
          <TripJournal :trip="trip" :can-write="trip.canEdit" @tracks-imported="onTracksImported" />
          <!-- Tijdcapsules zijn altijd privé voor de deelnemers. -->
          <TimeCapsules v-if="trip.canEdit && features.timeCapsules" :trip="trip" class="mx-auto max-w-2xl" />
        </div>

        <TripAlbum v-if="tab === 'album'" :trip="trip" />

        <TripCountryInfo v-if="tab === 'praktisch'" :trip-id="trip.id" :version="`${trip.country}|${stopsVersion}|${trip.baseCurrency}`" />
        <!-- Fase 4: feestdagen tijdens de reis -->
        <TripHolidays v-if="tab === 'praktisch'" :holidays="holidays" :loading="holidaysLoading" :failed="holidaysFailed" class="mt-6" />

        <div v-if="tab === 'posts'" class="mx-auto max-w-2xl space-y-5">
          <PostComposer :preset-trip-id="trip.id" :preset-trip-title="trip.title" :placeholder="$t('trip.posts.placeholder')" @created="(p) => posts.unshift(p)" />
          <div v-if="postsLoading" class="space-y-3"><div v-for="i in 2" :key="i" class="skeleton h-48 rounded-2xl" /></div>
          <EmptyState v-else-if="!posts.length" icon="image" :title="$t('trip.posts.emptyTitle')" :text="$t('trip.posts.emptyText')" />
          <PostCard v-for="p in posts" :key="p.id" :post="p" @deleted="(id) => (posts = posts.filter((x) => x.id !== id))" />
        </div>

        <section v-if="tab === 'reacties'" class="card card-pad mx-auto max-w-2xl sm:p-6">
          <h2 class="card-title mb-4">{{ $t('trip.comments.title') }}</h2>
          <CommentThread
            :api="commentApi"
            translate-kind="tripComment"
            :moderator-user-name="trip.userName"
            :placeholder="$t('trip.comments.placeholder')"
            :empty-text="$t('trip.comments.empty')"
            @count="trip.commentCount = Math.max(0, trip.commentCount + $event)"
          />
        </section>
      </div>

      <UserSearchModal
        v-model="inviteOpen"
        :title="$t('trip.crew.inviteTitle')"
        :subtitle="$t('trip.crew.inviteSubtitle')"
        :action-label="$t('trip.crew.invite')"
        :exclude="[trip.userName, ...trip.collaborators.map((c) => c.userName)]"
        :busy-user-name="invitingUserName"
        @select="invite"
      />
      <InviteLinkDialog v-if="trip.isOwner" v-model="inviteLinkOpen" :trip="trip" />
      <ShareTripDialog v-model="shareOpen" :trip="trip" @updated="(token) => (trip.shareToken = token)" />
      <ReportDialog v-model="reportOpen" target-type="trip" :target-id="trip.id" />
      <SaveToListDialog v-if="features.lists" v-model="saveOpen" :stop="savingStop" />
      <CopyTripDialog v-model="copyOpen" :trip="trip" />
      <BookingImportDialog v-if="trip.canEdit && aiStatus.enabled" v-model="bookingImportOpen" :trip="trip" @imported="load({ silent: true })" />
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import TripHero from '@/components/trip/TripHero.vue'
import TripStats from '@/components/trip/TripStats.vue'
import TripMap from '@/components/trip/TripMap.vue'
// Fase 10 (native app): live locatie op de achtergrond stoppen
import LiveTrackingBanner from '@/components/trip/LiveTrackingBanner.vue'
import { publicWebOrigin } from '@/services/native'
import StopGroups from '@/components/trip/StopGroups.vue'
import ItineraryDays from '@/components/trip/ItineraryDays.vue'
import TripBudget from '@/components/trip/TripBudget.vue'
import TripChecklist from '@/components/trip/TripChecklist.vue'
import PostCard from '@/components/PostCard.vue'
import PostComposer from '@/components/PostComposer.vue'
import CommentThread from '@/components/comments/CommentThread.vue'
import UserSearchModal from '@/components/UserSearchModal.vue'
import ShareTripDialog from '@/components/ShareTripDialog.vue'
import InviteLinkDialog from '@/components/trip/InviteLinkDialog.vue'
import TripGroupOverview from '@/components/trip/TripGroupOverview.vue'
import TripCrewCard from '@/components/trip/TripCrewCard.vue'
import { actionCountByGroup } from '@/utils/tripOverview'
import { nudgeGuestSave } from '@/composables/useGuestSave'
import ReportDialog from '@/components/ReportDialog.vue'
import SaveToListDialog from '@/components/lists/SaveToListDialog.vue'
import WeatherStrip from '@/components/trip/WeatherStrip.vue'
import RouteSummary from '@/components/trip/RouteSummary.vue'
import TripPolls from '@/components/trip/TripPolls.vue'
import DatePoll from '@/components/trip/DatePoll.vue'
import TripAttachments from '@/components/trip/TripAttachments.vue'
import TripJournal from '@/components/trip/TripJournal.vue'
// Fase 6 (GPX-import)
import TrackList from '@/components/trip/TrackList.vue'
import { useTripTracks } from '@/composables/useTripTracks'
import TimeCapsules from '@/components/trip/TimeCapsules.vue'
import TripAlbum from '@/components/trip/TripAlbum.vue'
import TripCountryInfo from '@/components/trip/TripCountryInfo.vue'
import TripAssistant from '@/components/ai/TripAssistant.vue'
import CopyTripDialog from '@/components/trip/CopyTripDialog.vue'
import BookingImportDialog from '@/components/trip/BookingImportDialog.vue'
import StaysCard from '@/components/trip/StaysCard.vue'
// Fase 4 (wat te doen, feestdagen)
import TripHolidays from '@/components/trip/TripHolidays.vue'
import { getHolidays } from '@/api/stopDiscoverApi'
import { useAiStatus } from '@/composables/useAiStatus'
import RouteReplay from '@/components/trip/RouteReplay.vue'
import OfflineTripButton from '@/components/trip/OfflineTripButton.vue'
import { recapState } from '@/utils/recap'
import { features } from '@/config/features'
import { isTripRunning } from '@/utils/today'
import { useI18n } from 'vue-i18n'
import * as tripsApi from '@/api/tripsApi'
import * as storiesApi from '@/api/storiesApi'
import * as collaboratorsApi from '@/api/tripCollaboratorsApi'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { confirm } from '@/composables/useConfirm'
import { errorMessage } from '@/utils/errors'
import { buildTripIcs, downloadTextFile, safeFileName } from '@/utils/ics'
import { daysUntil, toDateInput } from '@/utils/date'
import { STOP_TYPE_ORDER, stopTypeMeta } from '@/utils/stopTypes'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()
const { t } = useI18n()

const trip = ref(null)
const loading = ref(true)
const selectedStopId = ref(null)
const menuOpen = ref(false)
const inviteOpen = ref(false)
const inviteLinkOpen = ref(false)
// Gegevens van het tabblad Overzicht (acties, chat); gevuld door TripGroupOverview.
const overview = ref(null)
const overviewRef = ref(null)
const invitingUserName = ref('')
const shareOpen = ref(false)
const reportOpen = ref(false)
const posts = ref([])
const postsLoading = ref(false)
let postsLoadedFor = null
const saveOpen = ref(false)
const savingStop = ref(null)
// Sjabloon, terugblik en route-replay
const copyOpen = ref(false)
const tripMapRef = ref(null)
// Fase 6 (GPX-import): tracks op de reiskaart (overzicht) en importeren vanuit overzicht of dagboek.
const { tracks, upsert: upsertTrack, remove: removeTrack } = useTripTracks(() => trip.value?.id)
function onTracksImported({ tracks: imported }) {
  for (const track of imported) upsertTrack(track)
}
const recapMode = computed(() => recapState(trip.value))
// Vandaag-modus: alleen voor deelnemers tijdens de reis.
const showToday = computed(() => !!trip.value?.canEdit && isTripRunning(trip.value))
// Boekingen importeren via AI: alleen voor deelnemers en wanneer de AI-assistent aan staat.
const { status: aiStatus, load: loadAiStatus } = useAiStatus()
const bookingImportOpen = ref(false)
function openBookingImport() {
  menuOpen.value = false
  bookingImportOpen.value = true
}
// Fase 3: "Verblijven checken" staat bovenaan bij een kopie (remix) of na het kopiëren (?stays=1).
// TripDto heeft geen kale CopiedFromTripId, wel `copiedFrom` (alleen als de bron nog zichtbaar is).
const staysFirst = computed(() => !!(trip.value?.copiedFrom || trip.value?.copiedFromTripId) || route.query.stays === '1')

// ---------- route & weer ----------
const tripRoute = ref(null)

/** Verandert wanneer stops of datums wijzigen; weer en route laden dan opnieuw. */
const stopsVersion = computed(() => trip.value
  ? `${trip.value.startDate}|${trip.value.endDate}|${trip.value.stops.map((s) => `${s.id}:${s.latitude},${s.longitude}`).join(';')}`
  : '')
/** Route en CO₂ hangen ook af van de vervoerswijze per stop en het aantal reizigers in de auto. */
const routeVersion = computed(() => trip.value
  ? `${stopsVersion.value}|${trip.value.stops.map((s) => s.arrivalMode).join(',')}|${trip.value.travellersInCar}`
  : '')

// ---------- Fase 4: feestdagen (dagschema + praktisch) ----------
// Zelfde afhankelijkheden als de landeninfo: land, stops en datums. Niet kritiek: bij een fout geen chips.
const holidays = ref([])
const holidaysLoading = ref(false)
const holidaysFailed = ref(false)
let holidaysRequest = 0
async function loadHolidays() {
  if (!trip.value) return
  const request = ++holidaysRequest
  holidaysLoading.value = true
  holidaysFailed.value = false
  try {
    const data = await getHolidays(trip.value.id)
    if (request === holidaysRequest) holidays.value = data
  } catch {
    if (request === holidaysRequest) {
      holidays.value = []
      holidaysFailed.value = true
    }
  } finally {
    if (request === holidaysRequest) holidaysLoading.value = false
  }
}
watch(() => (trip.value ? `${trip.value.id}|${trip.value.country}|${stopsVersion.value}` : ''), (key) => {
  if (key) loadHolidays()
}, { immediate: true })

const legsByStop = computed(() => {
  if (!tripRoute.value || !trip.value) return null
  const ordered = [...trip.value.stops].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  const map = {}
  for (const leg of tripRoute.value.legs) {
    const to = ordered[leg.toIndex]
    if (to) map[to.id] = leg
  }
  return map
})

/** IANA-tijdzone per reisdag ('YYYY-MM-DD' → zone), uit het weer; voor de zonstijden per stop. */
const timezonesByDay = ref({})
function onWeatherLoaded(weather) {
  timezonesByDay.value = Object.fromEntries(
    (weather?.days || []).filter((d) => d.timezone).map((d) => [toDateInput(d.date), d.timezone])
  )
}

async function loadRoute() {
  if (!trip.value || trip.value.stops.length < 2) {
    tripRoute.value = null
    footprint.value = null
    return
  }
  loadFootprint()
  try {
    tripRoute.value = await tripsApi.getRoute(trip.value.id)
  } catch {
    tripRoute.value = null
  }
}

// ---------- CO₂ ----------
const footprint = ref(null)
const footprintLoading = ref(false)
const footprintFailed = ref(false)
let footprintRequest = 0

async function loadFootprint() {
  const request = ++footprintRequest
  footprintLoading.value = true
  footprintFailed.value = false
  try {
    const data = await tripsApi.getFootprint(trip.value.id)
    if (request === footprintRequest) footprint.value = data
  } catch {
    if (request === footprintRequest) {
      footprint.value = null
      footprintFailed.value = true
    }
  } finally {
    if (request === footprintRequest) footprintLoading.value = false
  }
}

function saveStop(stop) {
  savingStop.value = stop
  saveOpen.value = true
}

const acceptedCollaborators = computed(() => (trip.value?.collaborators || []).filter((c) => c.status === 'Accepted'))
const pendingCollaborators = computed(() => (trip.value?.collaborators || []).filter((c) => c.status === 'Pending'))
const isCollaborator = computed(() => acceptedCollaborators.value.some((c) => c.userName === auth.userName))
/** Nog niemand anders in de reis: dan is uitnodigen de belangrijkste stap. */
const isAlone = computed(() => acceptedCollaborators.value.length === 0)
const participants = computed(() => (trip.value
  ? [{ userName: trip.value.userName, displayName: trip.value.displayName }, ...acceptedCollaborators.value.map((c) => ({ userName: c.userName, displayName: c.displayName }))]
  : []))

const tabs = computed(() => {
  if (!trip.value) return []
  const list = []
  // Alleen deelnemers hebben een overzicht van de groep; kijkers beginnen bij de route.
  if (trip.value.canEdit) list.push({ id: 'start', label: t('trip.groups.overview'), icon: 'home' })
  list.push({ id: 'overzicht', label: t('trip.tabs.overview'), icon: 'map' })
  list.push({ id: 'dagschema', label: t('trip.tabs.itinerary'), icon: 'calendar' })
  if (trip.value.canEdit) {
    list.push({ id: 'budget', label: t('trip.tabs.budget'), icon: 'wallet' })
    list.push({ id: 'paklijst', label: t('trip.tabs.checklist'), icon: 'checklist' })
    list.push({ id: 'stemmen', label: t('planning.tabs.polls'), icon: 'vote' })
    list.push({ id: 'documenten', label: t('planning.tabs.files'), icon: 'paperclip' })
  }
  list.push({ id: 'dagboek', label: t('planning.tabs.journal'), icon: 'book' })
  list.push({ id: 'album', label: t('album.tab'), icon: 'camera' })
  list.push({ id: 'praktisch', label: t('countryInfo.tab'), icon: 'globe' })
  // Posts horen bij de tijdlijn, publieke reacties bij ontdekken; zonder die vlag vallen de tabs weg.
  if (features.feed) list.push({ id: 'posts', label: t('trip.tabs.posts'), icon: 'image' })
  if (features.discover) list.push({ id: 'reacties', label: t('trip.tabs.comments'), icon: 'chat', count: trip.value.commentCount || null })
  return list
})

// Deelnemers openen de reis op het overzicht van de groep, kijkers op de route.
const defaultTab = computed(() => (trip.value?.canEdit ? 'start' : 'overzicht'))
const tab = computed(() => {
  const requested = typeof route.query.tab === 'string' ? route.query.tab : defaultTab.value
  return tabs.value.some((t) => t.id === requested) ? requested : defaultTab.value
})

function setTab(id) {
  router.replace({ query: { ...route.query, tab: id === defaultTab.value ? undefined : id } })
}

// De onderdelen (?tab=-id's ongewijzigd) in vijf groepen rond de groepsreis. Een groep zonder zichtbare onderdelen
// valt weg: kijkers zien alleen Plannen en Herinneringen.
const TAB_GROUPS = [
  { id: 'start', icon: 'home', labelKey: 'trip.groups.overview', tabs: ['start'] },
  { id: 'plan', icon: 'map', labelKey: 'trip.groups.plan', tabs: ['overzicht', 'dagschema', 'praktisch'] },
  { id: 'regelen', icon: 'checklist', labelKey: 'trip.groups.arrange', tabs: ['stemmen', 'paklijst', 'documenten'] },
  { id: 'geld', icon: 'wallet', labelKey: 'trip.groups.money', tabs: ['budget'] },
  { id: 'herinneringen', icon: 'camera', labelKey: 'trip.groups.memories', tabs: ['dagboek', 'album', 'posts', 'reacties'] },
]
/** Wat er per hoofdtab op jou wacht (stemmingen en taken bij Regelen, betaalverzoeken bij Geld). */
const waitingByGroup = computed(() => actionCountByGroup(overview.value?.item?.actions, TAB_GROUPS))
const groups = computed(() => TAB_GROUPS
  .map((g) => {
    const items = tabs.value.filter((x) => g.tabs.includes(x.id))
    return { id: g.id, icon: g.icon, label: t(g.labelKey), items, count: items.reduce((n, x) => n + (x.count || 0), 0) || null, waiting: waitingByGroup.value[g.id] || 0 }
  })
  .filter((g) => g.items.length))

// Na een stem, betaling of afgevinkte taak klopt het overzicht niet meer: bij elke wissel van tab verversen.
watch(tab, () => overviewRef.value?.reload())
const activeGroup = computed(() => groups.value.find((g) => g.items.some((x) => x.id === tab.value)) || groups.value[0] || null)

// Terug naar een groep = terug naar het onderdeel waar je daar het laatst was.
const lastTabOfGroup = {}
function setGroup(group) {
  if (group.id === activeGroup.value?.id) return
  const remembered = lastTabOfGroup[group.id]
  setTab(group.items.some((x) => x.id === remembered) ? remembered : group.items[0].id)
}

const commentApi = {
  list: () => tripsApi.getTripComments(trip.value.id),
  add: (text, parentId) => tripsApi.addTripComment(trip.value.id, text, parentId),
  update: (id, text) => tripsApi.updateTripComment(id, text),
  remove: (id) => tripsApi.deleteTripComment(id),
}

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    trip.value = await tripsApi.getTripById(route.params.id)
    document.title = `${trip.value.title} · ExploreMe`
    loadLive()
    // Net aangemaakt via het korte formulier (?invite=1): de volgende stap is de link delen.
    if (route.query.invite && trip.value.isOwner) {
      inviteLinkOpen.value = true
      router.replace({ query: { ...route.query, invite: undefined } })
    }
    // Gast na afloop van de reis: nu wil je je foto's en herinneringen houden.
    if (!silent && trip.value.canEdit && daysUntil(trip.value.endDate) < 0) nudgeGuestSave('tripEnded')
  } catch {
    if (!silent) trip.value = null
  } finally {
    loading.value = false
  }
}

// Live posities van reisgenoten (stories met locatie) op de kaart; niet kritiek, dus fouten stil negeren.
const liveLocations = ref([])
async function loadLive() {
  try {
    liveLocations.value = await storiesApi.getLiveLocations(route.params.id)
  } catch {
    liveLocations.value = []
  }
}

async function loadPosts() {
  if (!trip.value || postsLoadedFor === trip.value.id) return
  postsLoading.value = true
  try {
    posts.value = await tripsApi.getTripPosts(trip.value.id)
    postsLoadedFor = trip.value.id
  } catch {
    posts.value = []
  } finally {
    postsLoading.value = false
  }
}

function selectStop(stop) {
  selectedStopId.value = stop.id
}

// ---------- acties ----------
async function toggleLike() {
  const current = trip.value
  current.likedByMe = !current.likedByMe
  current.likeCount += current.likedByMe ? 1 : -1
  try {
    const res = await tripsApi.toggleTripLike(current.id)
    current.likedByMe = res.likedByMe
    current.likeCount = res.likeCount
  } catch {
    current.likedByMe = !current.likedByMe
    current.likeCount += current.likedByMe ? 1 : -1
    toast.error(t('trip.toast.failedRetry'))
  }
}

async function toggleBookmark() {
  try {
    const res = await tripsApi.toggleBookmark(trip.value.id)
    trip.value.bookmarkedByMe = res.bookmarkedByMe
    trip.value.bookmarkCount = res.bookmarkCount
    toast.success(res.bookmarkedByMe ? t('trip.toast.bookmarked') : t('trip.toast.unbookmarked'), res.bookmarkedByMe ? { action: { label: t('common.view'), to: `/u/${auth.userName}?tab=opgeslagen` } } : {})
  } catch (e) {
    toast.error(errorMessage(e, t('trip.toast.bookmarkFailed')))
  }
}

function exportIcs() {
  menuOpen.value = false
  const ics = buildTripIcs(trip.value, { url: `${publicWebOrigin()}/trips/${trip.value.id}` })
  downloadTextFile(`${safeFileName(trip.value.title)}.ics`, ics, 'text/calendar')
  toast.success(t('trip.toast.icsDownloaded'))
}

/** "Gebruik als sjabloon": dialoog met nieuwe startdatum (vervangt het oude kopiëren zonder datum). */
function cloneTrip() {
  menuOpen.value = false
  copyOpen.value = true
}

async function deleteTrip() {
  menuOpen.value = false
  const ok = await confirm({
    title: t('trip.delete.title'),
    message: t('trip.delete.message', { title: trip.value.title }),
    warning: trip.value.collaborators.length ? t('trip.delete.warning') : '',
    confirmLabel: t('common.delete'),
    variant: 'danger',
  })
  if (!ok) return
  try {
    await tripsApi.deleteTrip(trip.value.id)
    toast.success(t('trip.delete.done'))
    router.replace('/trips')
  } catch (e) {
    toast.error(errorMessage(e, t('trip.delete.failed')))
  }
}

async function leaveTrip() {
  menuOpen.value = false
  const ok = await confirm({ title: t('trip.leave.title'), message: t('trip.leave.message'), confirmLabel: t('trip.leave.confirm'), variant: 'danger' })
  if (!ok) return
  try {
    await collaboratorsApi.leaveTrip(trip.value.id)
    toast.success(t('trip.leave.done'))
    router.replace('/trips')
  } catch (e) {
    toast.error(errorMessage(e, t('trip.leave.failed')))
  }
}

function openReport() {
  menuOpen.value = false
  reportOpen.value = true
}

async function invite(user) {
  invitingUserName.value = user.userName
  try {
    await collaboratorsApi.inviteCollaborator(trip.value.id, user.userName)
    toast.success(t('trip.crew.invitedToast', { name: user.displayName }))
    inviteOpen.value = false
    await load({ silent: true })
  } catch (e) {
    toast.error(errorMessage(e, t('trip.crew.inviteFailed')))
  } finally {
    invitingUserName.value = ''
  }
}

async function removeCollaborator(c) {
  const pending = c.status === 'Pending'
  const name = c.displayName
  const ok = await confirm({
    title: pending ? t('trip.crew.revokeTitle') : t('trip.crew.removeTitle', { name }),
    message: pending ? t('trip.crew.revokeText', { name }) : t('trip.crew.removeText', { name }),
    confirmLabel: pending ? t('trip.crew.revoke') : t('common.delete'),
    variant: 'danger',
  })
  if (!ok) return
  try {
    await collaboratorsApi.removeCollaborator(trip.value.id, c.userName)
    trip.value.collaborators = trip.value.collaborators.filter((x) => x.userName !== c.userName)
    toast.success(pending ? t('trip.crew.revoked') : t('trip.crew.removed'))
  } catch (e) {
    toast.error(errorMessage(e, t('trip.crew.failed')))
  }
}

const tabsRef = ref(null)

function revealActiveTab() {
  nextTick(() => {
    const row = tabsRef.value
    const chip = row?.querySelector('.chip-toggle-active')
    if (chip) row.scrollTo({ left: Math.max(0, chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2) })
  })
}

watch(tab, (t) => {
  if (t === 'posts') loadPosts()
  if (activeGroup.value) lastTabOfGroup[activeGroup.value.id] = t
  revealActiveTab()
})
watch(trip, (t, prev) => { if (t && !prev) revealActiveTab() })
watch(routeVersion, (v, prev) => { if (v && v !== prev) loadRoute() })
watch(() => route.params.id, (id, prev) => {
  if (id && id !== prev) {
    postsLoadedFor = null
    posts.value = []
    selectedStopId.value = null
    load().then(() => { if (tab.value === 'posts') loadPosts() })
  }
})

const onRefresh = () => load({ silent: true })
onMounted(async () => {
  loadAiStatus()
  await load()
  if (tab.value === 'posts') loadPosts()
  window.addEventListener('app-refresh', onRefresh)
})
onBeforeUnmount(() => window.removeEventListener('app-refresh', onRefresh))
</script>
