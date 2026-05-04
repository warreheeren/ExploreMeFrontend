<template>
  <div class="max-w-6xl mx-auto">
    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
    </div>

    <!-- Not found -->
    <div v-else-if="!trip" class="text-center py-16">
      <p class="text-gray-400">Reis niet gevonden</p>
      <RouterLink to="/trips" class="text-sm font-semibold text-primary-600 hover:text-primary-700 mt-2 inline-block hover:underline">Terug naar reizen</RouterLink>
    </div>

    <template v-else>
      <!-- Back link -->
      <RouterLink to="/trips" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition mb-4">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        Alle reizen
      </RouterLink>

      <!-- Hero -->
      <div class="relative rounded-3xl overflow-hidden mb-8">
        <div class="h-[420px] bg-gradient-to-br from-gray-200 to-gray-300">
          <img
            v-if="trip.coverImageUrl"
            :src="trip.coverImageUrl"
            :alt="trip.title"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/0"></div>

        <!-- Floating user badge top-left -->
        <div class="absolute top-5 left-5 flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-md ring-1 ring-white/20 rounded-full">
          <img v-if="trip.profilePhotoUrl" :src="trip.profilePhotoUrl" class="w-6 h-6 rounded-full object-cover ring-1 ring-white/40"/>
          <RouterLink :to="`/u/${trip.userName}`" class="text-xs font-medium text-white hover:underline">
            {{ trip.displayName }}
          </RouterLink>
        </div>

        <!-- Action buttons top-right -->
        <div class="absolute top-5 right-5 flex items-center gap-2 flex-wrap justify-end max-w-[80%]">
          <RouterLink
            v-if="isOwner"
            :to="`/trips/${trip.id}/edit`"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-900 rounded-full text-xs font-semibold transition shadow hover:bg-gray-50"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Bewerken
          </RouterLink>
          <button
            v-if="isOwner"
            @click="onDeleteTrip"
            :disabled="deleting"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/90 backdrop-blur-md ring-1 ring-red-400 text-white rounded-full text-xs font-semibold transition shadow hover:bg-red-500 disabled:opacity-60"
            title="Reis verwijderen"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/>
            </svg>
            {{ deleting ? 'Bezig...' : 'Verwijder' }}
          </button>
          <button
            v-if="auth.isAuthenticated && !isOwner"
            @click="onCloneTrip"
            :disabled="cloning"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md ring-1 ring-white/30 rounded-full text-xs font-semibold text-white transition shadow hover:bg-white/25 disabled:opacity-60"
            title="Plan een soortgelijke reis"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            {{ cloning ? 'Bezig...' : 'Plan soortgelijke reis' }}
          </button>

          <button
            v-if="auth.isAuthenticated"
            @click="onToggleBookmark"
            :disabled="bookmarking"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-md ring-1 rounded-full text-xs font-semibold transition shadow"
            :class="trip.bookmarkedByMe
              ? 'bg-yellow-400 text-gray-900 ring-yellow-300 hover:bg-yellow-300'
              : 'bg-white/15 text-white ring-white/30 hover:bg-white/25'"
          >
            <svg class="w-4 h-4" :fill="trip.bookmarkedByMe ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            {{ trip.bookmarkedByMe ? 'Opgeslagen' : 'Bewaar' }}
            <span v-if="trip.bookmarkCount > 0" class="opacity-70">· {{ trip.bookmarkCount }}</span>
          </button>
        </div>

        <div class="absolute bottom-0 left-0 right-0 p-8">
          <div class="flex items-center gap-2 mb-3 flex-wrap">
            <span class="px-3 py-1 bg-white text-gray-900 rounded-full text-xs font-bold shadow">
              {{ trip.country }}
            </span>
            <span class="px-3 py-1 bg-white/15 backdrop-blur-md ring-1 ring-white/20 rounded-full text-xs font-medium text-white">
              {{ formatDateRange(trip.startDate, trip.endDate) }}
            </span>
            <span class="px-3 py-1 bg-white/15 backdrop-blur-md ring-1 ring-white/20 rounded-full text-xs font-medium text-white">
              {{ tripDays }} dagen
            </span>
          </div>
          <h1 class="text-3xl md:text-5xl font-bold text-white tracking-tight drop-shadow leading-tight">{{ trip.title }}</h1>
          <p v-if="trip.description" class="text-sm md:text-base text-white/85 leading-relaxed mt-3 max-w-3xl">{{ trip.description }}</p>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div class="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100">
          <div class="flex items-center gap-2 text-blue-600 mb-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
            <span class="text-xs font-medium uppercase tracking-wide">Route</span>
          </div>
          <div class="text-2xl font-bold text-gray-900">{{ waypoints.length }}</div>
          <div class="text-xs text-gray-500">waypoints</div>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100">
          <div class="flex items-center gap-2 text-purple-600 mb-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>
            <span class="text-xs font-medium uppercase tracking-wide">Hotels</span>
          </div>
          <div class="text-2xl font-bold text-gray-900">{{ hotels.length }}</div>
          <div class="text-xs text-gray-500">{{ totalNights }} nachten</div>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100">
          <div class="flex items-center gap-2 text-orange-600 mb-1">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            <span class="text-xs font-medium uppercase tracking-wide">Foodspots</span>
          </div>
          <div class="text-2xl font-bold text-gray-900">{{ foodspots.length }}</div>
          <div class="text-xs text-gray-500" v-if="avgFoodRating">{{ avgFoodRating }}/5 gem. rating</div>
          <div class="text-xs text-gray-500" v-else>restaurants</div>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100">
          <div class="flex items-center gap-2 text-emerald-600 mb-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>
            <span class="text-xs font-medium uppercase tracking-wide">Verblijf</span>
          </div>
          <div class="text-2xl font-bold text-gray-900">€{{ totalAccommodationCost.toLocaleString('nl-NL') }}</div>
          <div class="text-xs text-gray-500">totale hotelkosten</div>
        </div>
      </div>

      <!-- Beste Hotel — featured showcase -->
      <section v-if="topHotel" class="mb-10">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">🏆</span>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Beste hotel van de reis</h2>
            <p class="text-xs text-gray-400">Ons favoriete verblijf — luxe met de beste ligging</p>
          </div>
        </div>

        <div
          class="relative bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition cursor-pointer"
          @click="focusStop(topHotel)"
        >
          <div class="grid md:grid-cols-2">
            <!-- Image side -->
            <div class="h-64 md:h-full md:min-h-[280px] relative overflow-hidden">
              <img v-if="topHotel.imageUrl" :src="topHotel.imageUrl" class="w-full h-full object-cover"/>
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-20 h-20 text-white/40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>
              </div>
              <span class="absolute top-4 left-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-yellow-400 text-gray-900 px-2.5 py-1 rounded-full shadow">
                ⭐ #1 Aanrader
              </span>
            </div>
            <!-- Info side -->
            <div class="p-6 md:p-8 text-white relative">
              <div class="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full pointer-events-none"></div>
              <div class="relative">
                <h3 class="text-2xl md:text-3xl font-bold leading-tight">{{ topHotel.name }}</h3>
                <p v-if="topHotel.address" class="text-sm text-white/85 mt-1">📍 {{ topHotel.address }}</p>
                <p v-if="topHotel.description" class="text-sm text-white/90 mt-3 leading-relaxed">{{ topHotel.description }}</p>

                <div v-if="topHotel.checkInDate && topHotel.checkOutDate" class="inline-flex items-center gap-1 mt-4 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                  {{ formatDate(topHotel.checkInDate) }} — {{ formatDate(topHotel.checkOutDate) }} • {{ nightsFor(topHotel) }} nachten
                </div>

                <div class="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs text-white/70 uppercase tracking-wide">Per nacht</div>
                    <div class="text-2xl font-bold">€{{ topHotel.pricePerNight }}</div>
                  </div>
                  <div v-if="nightsFor(topHotel)">
                    <div class="text-xs text-white/70 uppercase tracking-wide">Totaal verblijf</div>
                    <div class="text-2xl font-bold">€{{ (topHotel.pricePerNight * nightsFor(topHotel)).toLocaleString('nl-NL') }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Beste Foodspots — top 3 with rating -->
      <section v-if="bestFoodspots.length" class="mb-10">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">🍽️</span>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Beste foodspots met rating</h2>
            <p class="text-xs text-gray-400">Top {{ bestFoodspots.length }} hoogst beoordeelde plekken om te eten</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="(stop, idx) in bestFoodspots"
            :key="stop.id"
            class="relative bg-white rounded-3xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden ring-1 ring-gray-100"
            :class="{ 'ring-2 ring-orange-500': selectedStopId === stop.id }"
            @click="focusStop(stop)"
          >
            <!-- Podium badge -->
            <div class="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg font-bold text-xs"
                 :class="idx === 0 ? 'bg-yellow-400 text-gray-900' : idx === 1 ? 'bg-gray-200 text-gray-800' : 'bg-amber-700 text-white'">
              <span>{{ idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉' }}</span>
              <span>#{{ idx + 1 }}</span>
            </div>

            <!-- Image -->
            <div class="h-44 bg-gradient-to-br from-orange-100 to-orange-50 overflow-hidden relative">
              <img v-if="stop.imageUrl" :src="stop.imageUrl" class="w-full h-full object-cover"/>
              <div v-else class="w-full h-full flex items-center justify-center text-orange-300">
                <svg class="w-14 h-14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 11l18-5v12L3 14v-3z"/></svg>
              </div>
              <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent"></div>
              <!-- Rating big overlay -->
              <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div class="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow">
                  <span class="text-yellow-500 text-sm">★</span>
                  <span class="text-sm font-bold text-gray-900">{{ stop.rating }}.0</span>
                  <span class="text-xs text-gray-500">/ 5</span>
                </div>
                <span v-if="stop.priceLevel" class="bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 text-sm font-bold text-gray-700 shadow">{{ '€'.repeat(stop.priceLevel) }}</span>
              </div>
            </div>

            <!-- Body -->
            <div class="p-5">
              <h3 class="text-lg font-bold text-gray-900 leading-tight">{{ stop.name }}</h3>
              <span v-if="stop.cuisineType" class="inline-block mt-1 px-2.5 py-0.5 bg-orange-50 text-orange-700 rounded-full text-[11px] font-medium">
                {{ stop.cuisineType }}
              </span>
              <p v-if="stop.description" class="text-sm text-gray-600 mt-3 line-clamp-3 leading-relaxed">{{ stop.description }}</p>
              <p v-if="stop.address" class="text-[11px] text-gray-400 mt-3 truncate">📍 {{ stop.address }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- View toggle -->
      <div class="flex items-center gap-2 mb-6">
        <button
          v-for="opt in viewOptions"
          :key="opt.id"
          @click="viewMode = opt.id"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition ring-1"
          :class="viewMode === opt.id
            ? 'bg-gray-900 text-white ring-gray-900'
            : 'bg-white text-gray-600 ring-gray-200 hover:ring-gray-400'"
        >
          <span>{{ opt.icon }}</span>
          {{ opt.label }}
        </button>
      </div>

      <!-- Day-by-day itinerary view -->
      <section v-if="viewMode === 'days' && itineraryDays.length" class="mb-10">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Dag-voor-dag schema</h2>
            <p class="text-xs text-gray-400">{{ itineraryDays.length }} dagen · {{ tripDays }} totaal</p>
          </div>
        </div>

        <div class="space-y-5">
          <div
            v-for="day in itineraryDays"
            :key="day.dayNumber"
            class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden"
          >
            <!-- Day header -->
            <div class="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
              <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex flex-col items-center justify-center leading-none">
                <span class="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Dag</span>
                <span class="text-base font-bold text-gray-900">{{ day.dayNumber }}</span>
              </div>
              <div class="flex-1">
                <p class="text-sm font-bold text-gray-900">{{ formatFullDate(day.date) }}</p>
                <p class="text-xs text-gray-500">{{ day.stops.length }} {{ day.stops.length === 1 ? 'activiteit' : 'activiteiten' }}</p>
              </div>
            </div>

            <!-- Stops on this day -->
            <div class="divide-y divide-gray-50">
              <div
                v-for="stop in day.stops"
                :key="stop.id"
                @click="focusStop(stop)"
                class="flex items-start gap-3 p-4 hover:bg-gray-50 transition cursor-pointer"
                :class="{ 'bg-yellow-50/50': selectedStopId === stop.id }"
              >
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
                  :class="{
                    'bg-blue-100 text-blue-600': stop.type === 'Waypoint',
                    'bg-purple-100 text-purple-600': stop.type === 'Accommodation',
                    'bg-orange-100 text-orange-600': stop.type === 'FoodSpot',
                    'bg-emerald-100 text-emerald-600': stop.type === 'Activity'
                  }"
                >
                  {{ stop.type === 'Accommodation' ? '🏨' : stop.type === 'FoodSpot' ? '🍽️' : stop.type === 'Activity' ? '⭐' : '📍' }}
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-bold text-gray-900">{{ stop.name }}</h4>
                  <p v-if="stop.description" class="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{{ stop.description }}</p>
                  <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span v-if="stop.type === 'Accommodation' && stop.pricePerNight" class="text-[11px] font-semibold text-purple-700">€{{ stop.pricePerNight }}/nacht</span>
                    <span v-if="stop.type === 'FoodSpot' && stop.rating" class="text-[11px] text-yellow-600 font-semibold">{{ '★'.repeat(stop.rating) }}</span>
                    <span v-if="stop.type === 'FoodSpot' && stop.cuisineType" class="text-[11px] text-gray-500">{{ stop.cuisineType }}</span>
                    <span v-if="stop.type === 'Activity' && stop.duration" class="text-[11px] text-emerald-700 font-medium">⏱ {{ stop.duration }}</span>
                    <span v-if="stop.type === 'Activity' && stop.cost" class="text-[11px] font-semibold text-emerald-700">€{{ stop.cost }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Standard sections only show in 'overview' mode -->
      <template v-if="viewMode === 'overview'">

      <!-- Map + Route -->
      <section class="mb-10">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
          </div>
          <div class="flex-1">
            <h2 class="text-lg font-bold text-gray-900">De route</h2>
            <p class="text-xs text-gray-400">Klik een waypoint om in te zoomen op de kaart</p>
          </div>
          <!-- Legend -->
          <div class="hidden md:flex items-center gap-3 text-xs">
            <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Route</span>
            <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Hotel</span>
            <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Food</span>
            <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Activiteit</span>
          </div>
        </div>

        <div class="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-gray-100">
          <div class="relative">
            <div ref="mapContainer" class="h-[520px] w-full"></div>
          </div>

          <!-- Waypoint chips strip -->
          <div v-if="waypoints.length" class="border-t border-gray-100 p-3 bg-gray-50/50">
            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                v-for="(stop, idx) in waypoints"
                :key="stop.id"
                class="shrink-0 flex items-center gap-2 px-3 py-2 bg-white rounded-full ring-1 transition text-sm"
                :class="selectedStopId === stop.id
                  ? 'ring-blue-500 bg-blue-50 text-blue-700 font-semibold'
                  : 'ring-gray-200 hover:ring-gray-400 text-gray-700'"
                @click="focusStop(stop)"
              >
                <span class="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">{{ idx + 1 }}</span>
                <span class="whitespace-nowrap">{{ stop.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Waypoints timeline -->
      <section v-if="waypoints.length" class="mb-10">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Stops onderweg</h2>
            <p class="text-xs text-gray-400">{{ waypoints.length }} bestemmingen in volgorde</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="(stop, idx) in waypoints"
            :key="stop.id"
            class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 hover:shadow-md transition cursor-pointer overflow-hidden flex"
            :class="{ 'ring-2 ring-blue-500': selectedStopId === stop.id }"
            @click="focusStop(stop)"
          >
            <div class="w-28 h-auto shrink-0 bg-gradient-to-br from-blue-100 to-blue-50 relative">
              <img v-if="stop.imageUrl" :src="stop.imageUrl" class="w-full h-full object-cover"/>
              <div class="absolute top-2 left-2 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white shadow">
                {{ idx + 1 }}
              </div>
            </div>
            <div class="flex-1 p-4 min-w-0">
              <h3 class="text-base font-bold text-gray-900 truncate">{{ stop.name }}</h3>
              <p v-if="stop.description" class="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{{ stop.description }}</p>
              <p v-if="stop.address" class="text-[11px] text-gray-400 mt-2 truncate">{{ stop.address }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Hotels (Accommodation) -->
      <section v-if="hotels.length" class="mb-10">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>
          </div>
          <div class="flex-1">
            <h2 class="text-lg font-bold text-gray-900">Overnachtingen</h2>
            <p class="text-xs text-gray-400">{{ hotels.length }} hotels • {{ totalNights }} nachten • €{{ totalAccommodationCost.toLocaleString('nl-NL') }} totaal</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="stop in hotels"
            :key="stop.id"
            class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 hover:shadow-md transition overflow-hidden cursor-pointer flex"
            :class="{ 'ring-2 ring-purple-500': selectedStopId === stop.id }"
            @click="focusStop(stop)"
          >
            <div class="w-32 shrink-0 bg-gradient-to-br from-purple-100 to-purple-50 overflow-hidden">
              <img v-if="stop.imageUrl" :src="stop.imageUrl" class="w-full h-full object-cover"/>
              <div v-else class="w-full h-full flex items-center justify-center text-purple-300">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>
              </div>
            </div>
            <div class="flex-1 p-4 min-w-0 flex flex-col">
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-base font-bold text-gray-900 leading-tight">{{ stop.name }}</h3>
                <span v-if="topHotel && topHotel.id === stop.id" class="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Top</span>
              </div>
              <p v-if="stop.address" class="text-xs text-gray-500 mt-1 truncate">{{ stop.address }}</p>
              <div v-if="stop.checkInDate && stop.checkOutDate" class="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[11px] font-medium self-start">
                {{ formatDate(stop.checkInDate) }} — {{ formatDate(stop.checkOutDate) }}
              </div>
              <div class="flex-1"></div>
              <div v-if="stop.pricePerNight" class="flex items-baseline justify-between mt-3 pt-3 border-t border-gray-100">
                <div>
                  <span class="text-lg font-bold text-gray-900">€{{ stop.pricePerNight }}</span>
                  <span class="text-xs text-gray-400 ml-0.5">/nacht</span>
                </div>
                <div v-if="nightsFor(stop)" class="text-right">
                  <div class="text-[11px] text-gray-400">{{ nightsFor(stop) }} nachten</div>
                  <div class="text-sm font-bold text-purple-600">€{{ (stop.pricePerNight * nightsFor(stop)).toLocaleString('nl-NL') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Foodspots -->
      <section v-if="foodspots.length" class="mb-10">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Beste foodspots</h2>
            <p class="text-xs text-gray-400">{{ foodspots.length }} restaurants • gesorteerd op rating</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="stop in sortedFoodspots"
            :key="stop.id"
            class="relative bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 hover:shadow-md transition overflow-hidden cursor-pointer"
            :class="{ 'ring-2 ring-orange-500': selectedStopId === stop.id }"
            @click="focusStop(stop)"
          >
            <span v-if="topFood && topFood.id === stop.id" class="absolute top-3 left-3 z-10 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-yellow-400 text-gray-900 px-2 py-1 rounded-full shadow">
              ⭐ Top pick
            </span>
            <div class="h-36 bg-gradient-to-br from-orange-100 to-orange-50 overflow-hidden">
              <img v-if="stop.imageUrl" :src="stop.imageUrl" class="w-full h-full object-cover"/>
              <div v-else class="w-full h-full flex items-center justify-center text-orange-300">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 11l18-5v12L3 14v-3z"/><path stroke-linecap="round" stroke-linejoin="round" d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>
              </div>
            </div>
            <div class="p-4">
              <div class="flex items-start justify-between gap-2 mb-2">
                <h3 class="text-base font-bold text-gray-900 leading-tight">{{ stop.name }}</h3>
                <span v-if="stop.priceLevel" class="text-sm font-bold text-gray-400 shrink-0">{{ '€'.repeat(stop.priceLevel) }}</span>
              </div>
              <div v-if="stop.rating" class="flex items-center gap-1 mb-2">
                <span v-for="i in 5" :key="i" class="text-sm" :class="i <= stop.rating ? 'text-yellow-400' : 'text-gray-200'">★</span>
                <span class="text-xs font-semibold text-gray-700 ml-1">{{ stop.rating }}.0</span>
              </div>
              <span v-if="stop.cuisineType" class="inline-block px-2.5 py-0.5 bg-orange-50 text-orange-700 rounded-full text-[11px] font-medium">
                {{ stop.cuisineType }}
              </span>
              <p v-if="stop.description" class="text-xs text-gray-500 mt-2 line-clamp-2">{{ stop.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Activities -->
      <section v-if="activities.length" class="mb-10">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Activiteiten</h2>
            <p class="text-xs text-gray-400">{{ activities.length }} dingen om te doen</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="stop in activities"
            :key="stop.id"
            class="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 hover:shadow-md transition overflow-hidden cursor-pointer"
            :class="{ 'ring-2 ring-emerald-500': selectedStopId === stop.id }"
            @click="focusStop(stop)"
          >
            <div class="h-32 bg-gradient-to-br from-emerald-100 to-emerald-50 overflow-hidden">
              <img v-if="stop.imageUrl" :src="stop.imageUrl" class="w-full h-full object-cover"/>
              <div v-else class="w-full h-full flex items-center justify-center text-emerald-300">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
            </div>
            <div class="p-4">
              <h3 class="text-base font-bold text-gray-900 leading-tight">{{ stop.name }}</h3>
              <div class="flex items-center gap-2 mt-2 flex-wrap">
                <span v-if="stop.duration" class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-medium">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  {{ stop.duration }}
                </span>
                <span v-if="stop.cost" class="text-sm font-bold text-gray-900">€{{ stop.cost }}</span>
                <span v-else class="text-xs font-semibold text-emerald-600">Gratis</span>
              </div>
              <p v-if="stop.description" class="text-xs text-gray-500 mt-2 line-clamp-2">{{ stop.description }}</p>
            </div>
          </div>
        </div>
      </section>
      </template>
    </template>

    <!-- Delete confirmation dialog -->
    <ConfirmDialog
      v-model="confirmDeleteOpen"
      variant="danger"
      title="Reis verwijderen?"
      :message="trip ? `Je staat op het punt &quot;${trip.title}&quot; permanent te verwijderen.` : ''"
      warning="Deze actie kan niet ongedaan worden gemaakt."
      confirm-label="Ja, verwijder"
      loading-label="Verwijderen..."
      :loading="deleting"
      @confirm="confirmDeleteTrip"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import * as tripsApi from '@/api/tripsApi'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const trip = ref(null)
const loading = ref(true)
const bookmarking = ref(false)
const cloning = ref(false)
const deleting = ref(false)

const isOwner = computed(() => trip.value && auth.userName && auth.userName === trip.value.userName)

const confirmDeleteOpen = ref(false)

function onDeleteTrip() {
  if (!trip.value || deleting.value) return
  confirmDeleteOpen.value = true
}

async function confirmDeleteTrip() {
  if (!trip.value || deleting.value) return
  deleting.value = true
  try {
    await tripsApi.deleteTrip(trip.value.id)
    confirmDeleteOpen.value = false
    router.push('/trips')
  } catch (e) {
    console.error('Delete trip failed', e)
    deleting.value = false
  }
}

async function onCloneTrip() {
  if (!trip.value || cloning.value) return
  cloning.value = true
  try {
    const cloned = await tripsApi.cloneTrip(trip.value.id)
    // Direct naar de edit-pagina zodat de gebruiker meteen kan aanpassen
    router.push(`/trips/${cloned.id}/edit`)
  } catch (e) {
    console.error('Clone trip failed', e)
    alert('Reis klonen mislukt')
  } finally {
    cloning.value = false
  }
}

async function onToggleBookmark() {
  if (!trip.value || bookmarking.value) return
  bookmarking.value = true
  try {
    const status = await tripsApi.toggleBookmark(trip.value.id)
    trip.value.bookmarkedByMe = status.bookmarkedByMe
    trip.value.bookmarkCount = status.bookmarkCount
  } catch (e) {
    console.error('Bookmark toggle failed', e)
  } finally {
    bookmarking.value = false
  }
}
const selectedStopId = ref(null)
const mapContainer = ref(null)
let map = null
const markers = {}

onMounted(async () => {
  try {
    trip.value = await tripsApi.getTripById(route.params.id)
  } catch (e) {
    console.error('Failed to load trip', e)
  } finally {
    loading.value = false
  }

  await nextTick()
  if (trip.value && mapContainer.value) initMap()
})

onUnmounted(() => {
  if (map) { map.remove(); map = null }
})

const tripDays = computed(() => {
  if (!trip.value) return 0
  const ms = new Date(trip.value.endDate) - new Date(trip.value.startDate)
  return Math.max(1, Math.ceil(ms / 86400000))
})

const waypoints = computed(() => (trip.value?.stops || [])
  .filter(s => s.type === 'Waypoint')
  .sort((a, b) => a.orderIndex - b.orderIndex))
const hotels = computed(() => (trip.value?.stops || []).filter(s => s.type === 'Accommodation'))
const foodspots = computed(() => (trip.value?.stops || []).filter(s => s.type === 'FoodSpot'))
const activities = computed(() => (trip.value?.stops || []).filter(s => s.type === 'Activity'))

const sortedFoodspots = computed(() => [...foodspots.value].sort((a, b) => (b.rating || 0) - (a.rating || 0)))
const bestFoodspots = computed(() => sortedFoodspots.value.filter(f => f.rating).slice(0, 3))

const viewMode = ref('overview')
const viewOptions = [
  { id: 'overview', label: 'Overzicht', icon: '🗺️' },
  { id: 'days', label: 'Dag voor dag', icon: '📅' },
]

const itineraryDays = computed(() => {
  if (!trip.value) return []
  const start = new Date(trip.value.startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(trip.value.endDate)
  end.setHours(0, 0, 0, 0)

  const days = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push({ dayNumber: days.length + 1, date: new Date(d), stops: [] })
  }

  const stops = [...(trip.value.stops || [])].sort((a, b) => a.orderIndex - b.orderIndex)
  const totalStops = stops.length
  const totalDays = days.length || 1

  stops.forEach((stop, idx) => {
    let targetDay
    if (stop.type === 'Accommodation' && stop.checkInDate) {
      const ci = new Date(stop.checkInDate); ci.setHours(0, 0, 0, 0)
      targetDay = days.find(d => d.date.getTime() === ci.getTime())
    }
    if (!targetDay) {
      const dayIdx = Math.min(totalDays - 1, Math.floor((idx / totalStops) * totalDays))
      targetDay = days[dayIdx]
    }
    if (targetDay) targetDay.stops.push(stop)
  })

  return days.filter(d => d.stops.length > 0)
})

function formatFullDate(d) {
  return new Date(d).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}

function nightsFor(stop) {
  if (!stop?.checkInDate || !stop?.checkOutDate) return 0
  const ms = new Date(stop.checkOutDate) - new Date(stop.checkInDate)
  return Math.max(1, Math.round(ms / 86400000))
}

const totalNights = computed(() => hotels.value.reduce((sum, h) => sum + nightsFor(h), 0))
const totalAccommodationCost = computed(() => hotels.value.reduce((sum, h) => sum + (h.pricePerNight || 0) * nightsFor(h), 0))

const avgFoodRating = computed(() => {
  const rated = foodspots.value.filter(f => f.rating)
  if (!rated.length) return null
  return (rated.reduce((s, f) => s + f.rating, 0) / rated.length).toFixed(1)
})

const topHotel = computed(() => {
  if (!hotels.value.length) return null
  return [...hotels.value].sort((a, b) => (b.pricePerNight || 0) - (a.pricePerNight || 0))[0]
})

const topFood = computed(() => {
  if (!foodspots.value.length) return null
  return [...foodspots.value].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
})

const topActivity = computed(() => {
  if (!activities.value.length) return null
  return [...activities.value].sort((a, b) => (b.cost || 0) - (a.cost || 0))[0]
})

function formatDateRange(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const opts = { day: 'numeric', month: 'short' }
  return `${s.toLocaleDateString('nl-NL', opts)} - ${e.toLocaleDateString('nl-NL', { ...opts, year: 'numeric' })}`
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function markerColor(type) {
  switch (type) {
    case 'Waypoint': return '#3B82F6'
    case 'Accommodation': return '#8B5CF6'
    case 'FoodSpot': return '#F97316'
    case 'Activity': return '#10B981'
    default: return '#6B7280'
  }
}

function createIcon(type, label, isLarge = false) {
  const color = markerColor(type)
  const w = isLarge ? 36 : 28
  const h = isLarge ? 46 : 36
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 28 36">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="13" r="7.5" fill="white"/>
    <text x="14" y="16.5" text-anchor="middle" font-size="${isLarge ? 11 : 10}" font-weight="bold" fill="${color}" font-family="Arial">${label}</text>
  </svg>`
  return L.divIcon({
    html: svg,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
    className: ''
  })
}

function initMap() {
  const stops = trip.value.stops
  if (!stops.length) return

  map = L.map(mapContainer.value, {
    scrollWheelZoom: true,
    zoomControl: true
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map)

  // Route only through waypoints (sorted)
  const orderedWaypoints = stops
    .filter(s => s.type === 'Waypoint')
    .sort((a, b) => a.orderIndex - b.orderIndex)
  const routeCoords = orderedWaypoints.map(s => [s.latitude, s.longitude])

  if (routeCoords.length >= 2) {
    L.polyline(routeCoords, {
      color: '#ffffff',
      weight: 7,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map)

    L.polyline(routeCoords, {
      color: '#3B82F6',
      weight: 4,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '6, 8'
    }).addTo(map)
  }

  // Markers — waypoints get sequential numbers, others get symbols
  stops.forEach((stop) => {
    let label
    let isLarge = false
    if (stop.type === 'Waypoint') {
      const idx = orderedWaypoints.findIndex(w => w.id === stop.id)
      label = (idx + 1).toString()
      isLarge = true
    } else if (stop.type === 'Accommodation') label = '☽'
    else if (stop.type === 'FoodSpot') label = '★'
    else if (stop.type === 'Activity') label = '▶'
    else label = '•'

    const icon = createIcon(stop.type, label, isLarge)
    const marker = L.marker([stop.latitude, stop.longitude], { icon }).addTo(map)

    let popupContent = `<div style="font-family: system-ui; min-width: 160px; padding: 2px;">
      <strong style="font-size: 13px; color: #111;">${stop.name}</strong>`
    if (stop.description) popupContent += `<br><span style="font-size: 11px; color: #666;">${stop.description.substring(0, 100)}${stop.description.length > 100 ? '...' : ''}</span>`
    if (stop.rating) popupContent += `<br><span style="color: #F59E0B;">${'★'.repeat(stop.rating)}${'☆'.repeat(5 - stop.rating)}</span>`
    if (stop.cuisineType) popupContent += ` <span style="font-size: 11px; color: #888;">${stop.cuisineType}</span>`
    if (stop.priceLevel) popupContent += ` <span style="font-size: 11px; font-weight: bold;">${'€'.repeat(stop.priceLevel)}</span>`
    if (stop.pricePerNight) popupContent += `<br><span style="font-size: 11px; font-weight: 600; color: #8B5CF6;">€${stop.pricePerNight}/nacht</span>`
    if (stop.cost) popupContent += `<br><span style="font-size: 11px; font-weight: 600; color: #10B981;">€${stop.cost}</span>`
    popupContent += `</div>`

    marker.bindPopup(popupContent)
    markers[stop.id] = marker
  })

  const allCoords = stops.map(s => [s.latitude, s.longitude])
  if (allCoords.length === 1) {
    map.setView(allCoords[0], 12)
  } else {
    map.fitBounds(allCoords, { padding: [40, 40] })
  }

  setTimeout(() => map && map.invalidateSize(), 100)
}

function focusStop(stop) {
  selectedStopId.value = stop.id
  if (map && markers[stop.id]) {
    map.flyTo([stop.latitude, stop.longitude], 13, { duration: 0.8 })
    markers[stop.id].openPopup()
    mapContainer.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
  border-radius: 3px;
}
</style>
