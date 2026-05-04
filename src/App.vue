<template>
  <div class="min-h-screen bg-[#FAFAFA] flex flex-col">

    <!-- Mobile pull-to-refresh indicator (verbergt op desktop, maar de spinner
         tijdens refresh is wél zichtbaar zodat een desktop-klik op het home-icoon
         visueel feedback geeft) -->
    <div
      v-if="auth.isAuthenticated"
      class="fixed top-0 left-0 right-0 flex justify-center pointer-events-none z-[55]"
      :class="ptrDistance > 4 && !ptrRefreshing ? 'md:hidden' : ''"
      :style="{
        transform: `translateY(${Math.max(0, (ptrRefreshing ? 56 : ptrDistance) - 32)}px)`,
        opacity: ptrDistance > 4 || ptrRefreshing ? 1 : 0,
        transition: ptrAnimating ? 'transform 0.25s ease, opacity 0.2s ease' : 'opacity 0.2s ease'
      }"
    >
      <div class="mt-2 w-10 h-10 rounded-full bg-white shadow-lg ring-1 ring-gray-100 flex items-center justify-center">
        <svg
          class="w-5 h-5 text-gray-700 transition-transform"
          :class="{ 'animate-spin': ptrRefreshing }"
          :style="{ transform: ptrRefreshing ? '' : `rotate(${Math.min(180, ptrDistance * 2.5)}deg)` }"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path v-if="!ptrRefreshing" stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          <circle v-else cx="12" cy="12" r="9" stroke-dasharray="40" stroke-linecap="round"/>
        </svg>
      </div>
    </div>


    <!-- Navbar -->
    <header
      class="sticky top-0 z-50 bg-white border-b border-gray-200 transition-transform duration-300 will-change-transform"
      :class="navHidden ? '-translate-y-full md:translate-y-0' : 'translate-y-0'"
    >
      <div class="mx-auto max-w-4xl flex items-center justify-between px-4 h-14">

        <!-- Brand -->
        <RouterLink to="/" class="flex items-center gap-2 group shrink-0">
          <svg class="w-7 h-7" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="#1a1a1a" stroke-width="2"/>
            <path d="M8 16c0-5 3-9 8-9s8 4 8 9-3 9-8 9" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            <circle cx="16" cy="16" r="2.5" fill="#0d9488"/>
            <line x1="16" y1="8" x2="16" y2="6" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="16" y1="26" x2="16" y2="24" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="8" y1="16" x2="6" y2="16" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="26" y1="16" x2="24" y2="16" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="text-base font-bold text-gray-900 tracking-tight">ExploreMe</span>
        </RouterLink>

        <!-- Search bar (desktop only) -->
        <div v-if="auth.isAuthenticated" class="relative mx-4 flex-1 max-w-xs hidden md:block">
          <input
            v-model="searchQuery"
            @input="onSearchInput"
            @focus="showSearch = true"
            @blur="hideSearchDelayed"
            type="text"
            placeholder="Zoeken..."
            class="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 rounded-lg border border-transparent focus:border-primary-500 focus:bg-white focus:outline-none transition"
          />
          <svg class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <!-- Search results dropdown -->
          <div
            v-if="showSearch && searchResults.length > 0"
            class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
          >
            <button
              v-for="user in searchResults"
              :key="user.userName"
              @mousedown.prevent="goToProfile(user.userName)"
              class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left"
            >
              <img
                v-if="user.profilePhotoUrl"
                :src="user.profilePhotoUrl"
                class="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div v-else class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                {{ user.displayName?.[0]?.toUpperCase() || '?' }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ user.userName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ user.displayName }}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex items-center gap-1 shrink-0">
          <template v-if="auth.isAuthenticated">
            <!-- Mobile-only: search button -->
            <button
              @click="showMobileSearch = true"
              class="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
              aria-label="Zoeken"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
              </svg>
            </button>

            <RouterLink
              to="/"
              @click="onHomeNavClick"
              class="hidden md:inline-flex p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
              :class="{ 'text-primary-600': $route.name === 'home' }"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/>
              </svg>
            </RouterLink>

            <!-- Trips -->
            <RouterLink
              to="/trips"
              class="hidden md:inline-flex p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
              :class="{ 'text-primary-600': $route.name?.startsWith('trip') }"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
              </svg>
            </RouterLink>

            <!-- Messages -->
            <RouterLink
              to="/messages"
              class="hidden md:inline-flex p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition relative"
              :class="{ 'text-primary-600': $route.name?.startsWith('message') }"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              <span
                v-if="unreadMessages > 0"
                class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1"
              >
                {{ unreadMessages > 99 ? '99+' : unreadMessages }}
              </span>
            </RouterLink>

            <!-- Notifications bell -->
            <div ref="notifWrapperRef" class="relative">
              <button
                @click="toggleNotifications"
                class="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition relative"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <span
                  v-if="notifStore.unreadCount > 0"
                  class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1"
                >
                  {{ notifStore.unreadCount > 99 ? '99+' : notifStore.unreadCount }}
                </span>
              </button>

              <!-- Notifications dropdown -->
              <div
                v-if="showNotifications"
                class="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
              >
                <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span class="text-sm font-semibold text-gray-900">Meldingen</span>
                  <button
                    v-if="notifStore.unreadCount > 0"
                    @click="notifStore.markAllRead()"
                    class="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Alles gelezen
                  </button>
                </div>
                <div class="max-h-80 overflow-y-auto">
                  <div v-if="notifStore.loading" class="p-4 text-center text-sm text-gray-400">Laden...</div>
                  <div v-else-if="notifStore.items.length === 0" class="p-4 text-center text-sm text-gray-400">Geen meldingen</div>
                  <button
                    v-for="n in notifStore.items"
                    :key="n.id"
                    @click="onNotificationClick(n)"
                    class="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                    :class="{ 'bg-primary-50/50': !n.isRead }"
                  >
                    <img
                      v-if="n.actorProfilePhotoUrl"
                      :src="n.actorProfilePhotoUrl"
                      class="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                    />
                    <div v-else class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">
                      {{ n.actorDisplayName?.[0]?.toUpperCase() || '?' }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm text-gray-900">
                        <span class="font-semibold">{{ n.actorUserName }}</span>
                        {{ n.type === 'like' ? ' vond je bericht leuk' : n.type === 'follow' ? ' is je gaan volgen' : ' reageerde op je bericht' }}
                      </p>
                      <p v-if="n.postCaption" class="text-xs text-gray-500 truncate mt-0.5">{{ n.postCaption }}</p>
                      <p class="text-xs text-gray-400 mt-0.5">{{ timeAgo(n.createdAtUtc) }}</p>
                    </div>
                    <div v-if="!n.isRead" class="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-2"></div>
                  </button>
                </div>
              </div>
            </div>

            <RouterLink
              :to="`/u/${auth.userName}`"
              class="hidden md:inline-flex p-1"
            >
              <img
                v-if="auth.profilePhotoUrl"
                :src="auth.profilePhotoUrl"
                class="w-7 h-7 rounded-full object-cover ring-2 ring-transparent hover:ring-gray-300 transition"
                :class="{ 'ring-gray-900': $route.name === 'profile' && $route.params.username === auth.userName }"
              />
              <div
                v-else
                class="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 ring-2 ring-transparent hover:ring-gray-300 transition"
                :class="{ 'ring-gray-900': $route.name === 'profile' && $route.params.username === auth.userName }"
              >
                {{ auth.displayName?.[0]?.toUpperCase() }}
              </div>
            </RouterLink>

            <!-- Settings gear (desktop) -->
            <button
              @click="showSettings = true"
              class="hidden md:inline-flex ml-3 p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>

            <!-- Hamburger (mobile) -->
            <button
              @click="showMobileMenu = true"
              class="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
              aria-label="Menu"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </template>

          <template v-else>
            <RouterLink to="/login" class="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition">
              Inloggen
            </RouterLink>
            <RouterLink to="/register" class="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition">
              Registreren
            </RouterLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Content -->
    <main
      class="mx-auto w-full px-4 py-6 flex-1"
      :class="[
        ['home', 'profile'].includes($route.name) ? 'max-w-7xl' : 'max-w-4xl',
        auth.isAuthenticated ? 'pb-24 md:pb-6' : ''
      ]"
    >
      <RouterView />
    </main>

    <!-- Mobile bottom nav -->
    <nav
      v-if="auth.isAuthenticated"
      class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
    >
      <div class="flex items-stretch justify-around h-14">
        <RouterLink
          to="/"
          @click="onHomeNavClick"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 transition"
          :class="$route.name === 'home' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900'"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/>
          </svg>
          <span class="text-[10px] font-medium">Home</span>
        </RouterLink>

        <RouterLink
          to="/trips"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 transition"
          :class="$route.name?.startsWith('trip') ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900'"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
          </svg>
          <span class="text-[10px] font-medium">Reizen</span>
        </RouterLink>

        <!-- Center FAB: opent action-sheet (post of reis) -->
        <button
          type="button"
          @click="showCreateSheet = true"
          class="flex-1 flex flex-col items-center justify-center -mt-4"
          aria-label="Nieuw item maken"
        >
          <span class="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
          </span>
        </button>

        <RouterLink
          to="/messages"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 transition relative"
          :class="$route.name?.startsWith('message') ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900'"
        >
          <span class="relative">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <span
              v-if="unreadMessages > 0"
              class="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full px-1"
            >
              {{ unreadMessages > 9 ? '9+' : unreadMessages }}
            </span>
          </span>
          <span class="text-[10px] font-medium">Berichten</span>
        </RouterLink>

        <RouterLink
          :to="`/u/${auth.userName}`"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 transition"
          :class="$route.name === 'profile' && $route.params.username === auth.userName ? 'text-primary-600' : 'text-gray-500 hover:text-gray-900'"
        >
          <img
            v-if="auth.profilePhotoUrl"
            :src="auth.profilePhotoUrl"
            class="w-6 h-6 rounded-full object-cover ring-2"
            :class="$route.name === 'profile' && $route.params.username === auth.userName ? 'ring-primary-600' : 'ring-transparent'"
          />
          <div
            v-else
            class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 ring-2"
            :class="$route.name === 'profile' && $route.params.username === auth.userName ? 'ring-primary-600' : 'ring-transparent'"
          >
            {{ auth.displayName?.[0]?.toUpperCase() }}
          </div>
          <span class="text-[10px] font-medium">Profiel</span>
        </RouterLink>
      </div>
    </nav>

    <!-- Footer — verborgen op mobile (bottom-nav neemt die rol over) -->
    <footer class="hidden md:block mt-12 bg-white border-t border-gray-200">
      <div class="mx-auto max-w-4xl px-4 py-10">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <!-- Brand -->
          <div class="col-span-2 md:col-span-1">
            <RouterLink to="/" class="flex items-center gap-2">
              <svg class="w-7 h-7" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="15" stroke="#1a1a1a" stroke-width="2"/>
                <path d="M8 16c0-5 3-9 8-9s8 4 8 9-3 9-8 9" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round" fill="none"/>
                <circle cx="16" cy="16" r="2.5" fill="#0d9488"/>
                <line x1="16" y1="8" x2="16" y2="6" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="16" y1="26" x2="16" y2="24" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="8" y1="16" x2="6" y2="16" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="26" y1="16" x2="24" y2="16" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span class="text-base font-bold text-gray-900 tracking-tight">ExploreMe</span>
            </RouterLink>
            <p class="text-xs text-gray-500 mt-3 leading-relaxed">
              Deel je avonturen, plan je volgende reis en ontdek de wereld door de ogen van anderen.
            </p>
          </div>

          <!-- Verkennen -->
          <div>
            <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Verkennen</h3>
            <ul class="space-y-2 text-sm">
              <li><RouterLink to="/" class="text-gray-500 hover:text-gray-900 transition">Tijdlijn</RouterLink></li>
              <li><RouterLink to="/trips" class="text-gray-500 hover:text-gray-900 transition">Reizen</RouterLink></li>
              <li v-if="auth.isAuthenticated"><RouterLink to="/trips/new" class="text-gray-500 hover:text-gray-900 transition">Nieuwe reis</RouterLink></li>
              <li v-if="auth.isAuthenticated"><RouterLink :to="`/u/${auth.userName}`" class="text-gray-500 hover:text-gray-900 transition">Mijn profiel</RouterLink></li>
            </ul>
          </div>

          <!-- Community -->
          <div>
            <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Community</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="text-gray-500 hover:text-gray-900 transition">Reisgidsen</a></li>
              <li><a href="#" class="text-gray-500 hover:text-gray-900 transition">Bestemmingen</a></li>
              <li><a href="#" class="text-gray-500 hover:text-gray-900 transition">Tips & tricks</a></li>
              <li><a href="#" class="text-gray-500 hover:text-gray-900 transition">Help & support</a></li>
            </ul>
          </div>

          <!-- Volg ons -->
          <div>
            <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Volg ons</h3>
            <div class="flex gap-2">
              <a href="#" aria-label="Instagram" class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-900 hover:text-white text-gray-600 flex items-center justify-center transition">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="#" aria-label="X" class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-900 hover:text-white text-gray-600 flex items-center justify-center transition">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" aria-label="TikTok" class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-900 hover:text-white text-gray-600 flex items-center justify-center transition">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/></svg>
              </a>
              <a href="#" aria-label="GitHub" class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-900 hover:text-white text-gray-600 flex items-center justify-center transition">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.69-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.45.11-3.03 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.18-1.49 3.14-1.18 3.14-1.18.62 1.58.23 2.74.11 3.03.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.8.56 4.56-1.52 7.85-5.83 7.85-10.91C23.5 5.65 18.35.5 12 .5z"/></svg>
              </a>
            </div>
            <p class="text-xs text-gray-400 mt-4">
              Vragen of feedback?<br/>
              <a href="mailto:hi@exploreme.travel" class="text-gray-700 hover:text-gray-900 font-medium">hi@exploreme.travel</a>
            </p>
          </div>
        </div>

        <!-- Bottom bar -->
        <div class="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p class="text-xs text-gray-400">© {{ new Date().getFullYear() }} ExploreMe — Made with ☕ &amp; ✈️ for fellow travellers</p>
          <div class="flex items-center gap-4 text-xs">
            <a href="#" class="text-gray-400 hover:text-gray-700 transition">Privacy</a>
            <a href="#" class="text-gray-400 hover:text-gray-700 transition">Voorwaarden</a>
            <a href="#" class="text-gray-400 hover:text-gray-700 transition">Cookies</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- Settings slide-out drawer -->
    <Teleport to="body">
      <Transition name="settings-backdrop">
        <div
          v-if="showSettings"
          class="fixed inset-0 bg-black/30 z-[60]"
          @click="showSettings = false"
        />
      </Transition>

      <Transition name="settings-drawer">
        <div
          v-if="showSettings"
          class="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
        >
          <!-- Drawer header -->
          <div class="flex items-center justify-between px-5 h-14 border-b border-gray-200 shrink-0">
            <h2 class="text-base font-bold text-gray-900">Instellingen</h2>
            <button
              @click="showSettings = false"
              class="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-900"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Drawer content -->
          <div class="flex-1 overflow-y-auto p-5 space-y-5">

            <!-- Profile edit -->
            <div class="bg-white border border-gray-200 rounded-xl p-5">
              <h3 class="text-sm font-bold text-gray-900 mb-4">Profiel bewerken</h3>

              <form @submit.prevent="onSaveProfile" class="space-y-4">
                <!-- Profile photo upload -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 mb-2">Profielfoto</label>
                  <div class="flex items-center gap-4">
                    <img
                      v-if="settingsPreviewUrl || settingsForm.profileImgUrl"
                      :src="settingsPreviewUrl || settingsForm.profileImgUrl"
                      class="w-16 h-16 rounded-full object-cover shrink-0"
                    />
                    <div v-else class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-400 shrink-0">
                      {{ auth.displayName?.[0]?.toUpperCase() || '?' }}
                    </div>

                    <div class="flex flex-col gap-1.5">
                      <label class="px-4 py-2 text-sm font-semibold text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition inline-block text-center">
                        Foto kiezen
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          class="hidden"
                          @change="onSettingsFileSelected"
                        />
                      </label>
                      <span v-if="settingsUploadError" class="text-xs text-red-500">{{ settingsUploadError }}</span>
                      <span v-if="settingsUploading" class="text-xs text-gray-400">Uploaden...</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-500 mb-1">Weergavenaam</label>
                  <input
                    v-model.trim="settingsForm.displayName"
                    class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-500 mb-1">Bio</label>
                  <textarea
                    v-model.trim="settingsForm.bio"
                    rows="3"
                    class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-primary-500 transition"
                    placeholder="Vertel iets over jezelf..."
                  />
                </div>

                <div class="flex items-center gap-3">
                  <button
                    type="submit"
                    :disabled="settingsSaving"
                    class="px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition"
                  >
                    {{ settingsSaving ? 'Opslaan...' : 'Opslaan' }}
                  </button>
                  <span v-if="settingsSaved" class="text-sm text-green-600 font-medium">Opgeslagen</span>
                </div>

                <p v-if="settingsError" class="text-xs text-red-500">{{ settingsError }}</p>
              </form>
            </div>

            <!-- Account section -->
            <div class="bg-white border border-gray-200 rounded-xl p-5">
              <h3 class="text-sm font-bold text-gray-900 mb-3">Account</h3>
              <button
                @click="onSettingsLogout"
                class="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Mobile menu drawer -->
    <Teleport to="body">
      <Transition name="settings-backdrop">
        <div
          v-if="showMobileMenu"
          class="md:hidden fixed inset-0 bg-black/30 z-[60]"
          @click="showMobileMenu = false"
        />
      </Transition>

      <Transition name="mobile-menu">
        <div
          v-if="showMobileMenu"
          class="md:hidden fixed top-0 right-0 h-full w-[85%] max-w-xs bg-white shadow-2xl z-[70] flex flex-col"
        >
          <!-- Header with profile -->
          <div class="px-5 py-4 border-b border-gray-200 flex items-center gap-3 shrink-0">
            <RouterLink :to="`/u/${auth.userName}`" @click="showMobileMenu = false" class="flex items-center gap-3 flex-1 min-w-0">
              <img
                v-if="auth.profilePhotoUrl"
                :src="auth.profilePhotoUrl"
                class="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <div v-else class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                {{ auth.displayName?.[0]?.toUpperCase() || '?' }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-gray-900 truncate">{{ auth.displayName }}</p>
                <p class="text-xs text-gray-400 truncate">@{{ auth.userName }}</p>
              </div>
            </RouterLink>
            <button
              @click="showMobileMenu = false"
              class="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
              aria-label="Sluit menu"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Nav links -->
          <nav class="flex-1 overflow-y-auto py-2">
            <RouterLink
              :to="`/u/${auth.userName}`"
              @click="showMobileMenu = false"
              class="flex items-center gap-3 px-5 py-3 text-sm text-gray-800 hover:bg-gray-50 transition"
            >
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Mijn profiel
            </RouterLink>
            <RouterLink
              to="/trips/new"
              @click="showMobileMenu = false"
              class="flex items-center gap-3 px-5 py-3 text-sm text-gray-800 hover:bg-gray-50 transition"
            >
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Nieuwe reis plannen
            </RouterLink>
            <button
              @click="openSettingsFromMenu"
              class="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-800 hover:bg-gray-50 transition text-left"
            >
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Instellingen
            </button>

            <div class="my-2 border-t border-gray-100"></div>

            <a href="#" class="flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 transition">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
              </svg>
              Help & support
            </a>
            <a href="#" class="flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 transition">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 5.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-.34-.02-.673-.057-1.003z"/>
              </svg>
              Privacy
            </a>
          </nav>

          <!-- Logout footer -->
          <div class="border-t border-gray-200 p-4 shrink-0">
            <button
              @click="onMobileLogout"
              class="w-full px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Uitloggen
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Mobile create action-sheet (Post of Reis) -->
    <Teleport to="body">
      <Transition name="settings-backdrop">
        <div
          v-if="showCreateSheet"
          class="md:hidden fixed inset-0 bg-black/40 z-[75]"
          @click="showCreateSheet = false"
        />
      </Transition>
      <Transition name="create-sheet">
        <div
          v-if="showCreateSheet"
          class="md:hidden fixed bottom-0 inset-x-0 z-[80] bg-white rounded-t-3xl shadow-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <div class="flex justify-center pt-2.5 pb-1">
            <span class="w-10 h-1 rounded-full bg-gray-300"></span>
          </div>
          <div class="px-5 pt-3 pb-2">
            <h3 class="text-base font-bold text-gray-900">Wat wil je delen?</h3>
            <p class="text-xs text-gray-500 mt-0.5">Kies wat je wilt aanmaken</p>
          </div>
          <div class="p-3 space-y-2">
            <button
              type="button"
              @click="onCreatePostFromSheet"
              class="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition text-left"
            >
              <span class="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 text-white flex items-center justify-center shadow">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-900">Nieuwe post</p>
                <p class="text-xs text-gray-500">Deel een foto of update met je volgers</p>
              </div>
            </button>
            <RouterLink
              to="/trips/new"
              @click="showCreateSheet = false"
              class="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 transition text-left"
            >
              <span class="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
                </svg>
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-900">Nieuwe reis</p>
                <p class="text-xs text-gray-500">Plan een reis met stops, hotels en activiteiten</p>
              </div>
            </RouterLink>
          </div>
          <div class="px-3 pb-4">
            <button
              type="button"
              @click="showCreateSheet = false"
              class="w-full py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition"
            >
              Annuleren
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Mobile search overlay -->
    <Teleport to="body">
      <Transition name="settings-backdrop">
        <div
          v-if="showMobileSearch"
          class="md:hidden fixed inset-0 bg-white z-[80] flex flex-col"
        >
          <div class="flex items-center gap-2 px-3 h-14 border-b border-gray-200 shrink-0">
            <button
              @click="closeMobileSearch"
              class="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              aria-label="Terug"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="relative flex-1">
              <input
                ref="mobileSearchInputRef"
                v-model="searchQuery"
                @input="onSearchInput"
                type="text"
                placeholder="Zoeken..."
                class="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-300 transition"
              />
              <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
              </svg>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto">
            <div v-if="!searchQuery" class="p-8 text-center text-sm text-gray-400">Begin met typen om reizigers te vinden</div>
            <div v-else-if="searchResults.length === 0" class="p-8 text-center text-sm text-gray-400">Geen gebruikers gevonden</div>
            <button
              v-for="user in searchResults"
              :key="user.userName"
              @click="goToProfileMobile(user.userName)"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-50"
            >
              <img
                v-if="user.profilePhotoUrl"
                :src="user.profilePhotoUrl"
                class="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <div v-else class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                {{ user.displayName?.[0]?.toUpperCase() || '?' }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ user.userName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ user.displayName }}</p>
              </div>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import * as followApi from '@/api/followApi'
import * as usersApi from '@/api/userApi'
import * as uploadApi from '@/api/uploadApi'
import * as messagesApi from '@/api/messagesApi'

const auth = useAuthStore()
const notifStore = useNotificationsStore()
const router = useRouter()

const showNotifications = ref(false)
const notifWrapperRef = ref(null)
const showSettings = ref(false)
const showMobileMenu = ref(false)
const showMobileSearch = ref(false)
const showCreateSheet = ref(false)
const mobileSearchInputRef = ref(null)
const unreadMessages = ref(0)
const navHidden = ref(false)
let lastScrollY = 0

// Pull-to-refresh state (mobile only)
const ptrDistance = ref(0)
const ptrRefreshing = ref(false)
const ptrAnimating = ref(false)
let ptrStartY = 0
let ptrTracking = false
const PTR_THRESHOLD = 70
let messagesPollInterval = null
const searchQuery = ref('')
const searchResults = ref([])
const showSearch = ref(false)
let searchTimeout = null

// Settings drawer state
const settingsForm = reactive({ displayName: '', bio: '', profileImgUrl: '' })
const settingsSaving = ref(false)
const settingsSaved = ref(false)
const settingsError = ref('')
const settingsUploading = ref(false)
const settingsUploadError = ref('')
const settingsPreviewUrl = ref('')

async function refreshUnreadMessages() {
  if (!auth.isAuthenticated) { unreadMessages.value = 0; return }
  try {
    unreadMessages.value = await messagesApi.getUnreadCount()
  } catch { /* ignore */ }
}

function startMessagesPoll() {
  refreshUnreadMessages()
  if (messagesPollInterval) clearInterval(messagesPollInterval)
  messagesPollInterval = setInterval(refreshUnreadMessages, 15000)
}

function stopMessagesPoll() {
  if (messagesPollInterval) { clearInterval(messagesPollInterval); messagesPollInterval = null }
}

function isMobile() {
  return window.matchMedia('(max-width: 767px)').matches
}

function onTouchStart(e) {
  if (!isMobile() || ptrRefreshing.value) return
  if (window.scrollY > 0) { ptrTracking = false; return }
  if (e.touches.length !== 1) return
  ptrStartY = e.touches[0].clientY
  ptrTracking = true
  ptrAnimating.value = false
}

function onTouchMove(e) {
  if (!ptrTracking || ptrRefreshing.value) return
  if (window.scrollY > 0) {
    ptrTracking = false
    if (ptrDistance.value > 0) {
      ptrAnimating.value = true
      ptrDistance.value = 0
    }
    return
  }
  const dy = e.touches[0].clientY - ptrStartY
  if (dy > 0) {
    ptrDistance.value = Math.min(140, dy * 0.5)
    if (e.cancelable && ptrDistance.value > 4) e.preventDefault()
  } else if (ptrDistance.value > 0) {
    ptrDistance.value = 0
  }
}

function onTouchEnd() {
  if (!ptrTracking) return
  ptrTracking = false
  if (ptrRefreshing.value) return
  ptrAnimating.value = true
  if (ptrDistance.value >= PTR_THRESHOLD) {
    triggerRefresh()
  } else {
    ptrDistance.value = 0
  }
}

async function triggerRefresh() {
  ptrRefreshing.value = true
  ptrDistance.value = 56
  window.dispatchEvent(new CustomEvent('app-refresh'))
  setTimeout(() => {
    ptrRefreshing.value = false
    ptrAnimating.value = true
    ptrDistance.value = 0
    setTimeout(() => { ptrAnimating.value = false }, 300)
  }, 1000)
}

function onHomeNavClick(e) {
  // Wanneer al op home: scroll naar boven + trigger refresh i.p.v. routenavigatie
  if (router.currentRoute.value.name === 'home') {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    triggerRefresh()
  }
}

function handleScroll() {
  // Auto-hide nav on mobile: hide on scroll down past 80px, show on scroll up.
  // Desktop is unaffected (translate is suppressed via md:translate-y-0 class).
  const y = window.scrollY
  if (y < 80) {
    navHidden.value = false
  } else if (y > lastScrollY + 8) {
    navHidden.value = true
  } else if (y < lastScrollY - 4) {
    navHidden.value = false
  }
  lastScrollY = y
}

onMounted(() => {
  if (auth.isAuthenticated) {
    if (!auth.profilePhotoUrl) auth.loadProfile()
    notifStore.startPolling()
    startMessagesPoll()
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('touchcancel', onTouchEnd, { passive: true })
})

onUnmounted(() => {
  notifStore.stopPolling()
  stopMessagesPoll()
  document.removeEventListener('mousedown', handleNotifClickOutside)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('touchcancel', onTouchEnd)
})

function onCreatePostFromSheet() {
  showCreateSheet.value = false
  if (router.currentRoute.value.name !== 'home') {
    router.push('/').then(() => {
      window.dispatchEvent(new CustomEvent('focus-create-post'))
    })
  } else {
    window.dispatchEvent(new CustomEvent('focus-create-post'))
  }
}

watch(() => auth.isAuthenticated, (val) => {
  if (val) { notifStore.startPolling(); startMessagesPoll() }
  else { notifStore.stopPolling(); stopMessagesPoll() }
})

// Refresh unread on navigation (so bubble updates after viewing)
watch(() => router.currentRoute.value.fullPath, () => {
  if (auth.isAuthenticated) refreshUnreadMessages()
})

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    notifStore.fetchNotifications()
    if (notifStore.unreadCount > 0) notifStore.markAllRead()
  }
}

function handleNotifClickOutside(e) {
  if (!showNotifications.value) return
  if (notifWrapperRef.value && !notifWrapperRef.value.contains(e.target)) {
    showNotifications.value = false
  }
}

watch(showNotifications, (val) => {
  if (val) document.addEventListener('mousedown', handleNotifClickOutside)
  else document.removeEventListener('mousedown', handleNotifClickOutside)
})

function onNotificationClick(n) {
  showNotifications.value = false
  router.push(`/u/${n.actorUserName}`)
}

function onSearchInput() {
  clearTimeout(searchTimeout)
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    try {
      searchResults.value = await followApi.searchUsers(searchQuery.value.trim(), 8)
    } catch {
      searchResults.value = []
    }
  }, 300)
}

function goToProfile(userName) {
  searchQuery.value = ''
  searchResults.value = []
  showSearch.value = false
  router.push(`/u/${userName}`)
}

function hideSearchDelayed() {
  setTimeout(() => { showSearch.value = false }, 200)
}

function closeMobileSearch() {
  showMobileSearch.value = false
  searchQuery.value = ''
  searchResults.value = []
}

function goToProfileMobile(userName) {
  closeMobileSearch()
  router.push(`/u/${userName}`)
}

function openSettingsFromMenu() {
  showMobileMenu.value = false
  showSettings.value = true
}

function onMobileLogout() {
  showMobileMenu.value = false
  auth.logout()
  router.push({ name: 'login' })
}

watch(showMobileSearch, (val) => {
  if (val) nextTick(() => mobileSearchInputRef.value?.focus())
})

watch(() => router.currentRoute.value.fullPath, () => {
  showMobileMenu.value = false
  showMobileSearch.value = false
  showCreateSheet.value = false
})

// Settings drawer functions
async function loadSettingsProfile() {
  if (!auth.userName) return
  try {
    const profile = await usersApi.getProfile(auth.userName)
    settingsForm.displayName = profile.displayName || ''
    settingsForm.bio = profile.bio || ''
    settingsForm.profileImgUrl = profile.profilePhotoUrl || ''
    settingsPreviewUrl.value = ''
    settingsError.value = ''
    settingsSaved.value = false
  } catch {
    // ignore
  }
}

watch(showSettings, (val) => {
  if (val) loadSettingsProfile()
})

async function onSettingsFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  settingsUploadError.value = ''
  settingsPreviewUrl.value = URL.createObjectURL(file)
  settingsUploading.value = true
  try {
    const url = await uploadApi.uploadImage(file)
    settingsForm.profileImgUrl = url
  } catch (err) {
    settingsUploadError.value = err?.response?.data?.message || 'Upload mislukt'
    settingsPreviewUrl.value = ''
  } finally {
    settingsUploading.value = false
  }
}

async function onSaveProfile() {
  settingsError.value = ''
  settingsSaving.value = true
  settingsSaved.value = false
  try {
    const result = await usersApi.updateProfile({
      displayName: settingsForm.displayName || null,
      bio: settingsForm.bio,
      profileImgUrl: settingsForm.profileImgUrl || null
    })
    auth.displayName = result.displayName
    auth.profilePhotoUrl = result.profilePhotoUrl || null
    localStorage.setItem('displayName', result.displayName)
    if (result.profilePhotoUrl) localStorage.setItem('profilePhotoUrl', result.profilePhotoUrl)
    settingsSaved.value = true
    setTimeout(() => { settingsSaved.value = false }, 3000)
  } catch (e) {
    settingsError.value = e?.response?.data?.title || e?.response?.data?.message || 'Opslaan mislukt'
  } finally {
    settingsSaving.value = false
  }
}

function onSettingsLogout() {
  showSettings.value = false
  auth.logout()
  router.push({ name: 'login' })
}

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'zojuist'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}u`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.settings-backdrop-enter-active,
.settings-backdrop-leave-active {
  transition: opacity 0.25s ease;
}
.settings-backdrop-enter-from,
.settings-backdrop-leave-to {
  opacity: 0;
}

.settings-drawer-enter-active,
.settings-drawer-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.settings-drawer-enter-from,
.settings-drawer-leave-to {
  transform: translateX(100%);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  transform: translateX(100%);
}

.create-sheet-enter-active,
.create-sheet-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.create-sheet-enter-from,
.create-sheet-leave-to {
  transform: translateY(100%);
}
</style>
