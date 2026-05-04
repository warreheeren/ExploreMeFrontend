<template>
  <RouterLink
    :to="`/trips/${trip.id}`"
    class="block bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden hover:shadow-md transition group"
  >
    <div class="relative h-40 bg-gray-100 overflow-hidden">
      <img
        v-if="trip.coverImageUrl"
        :src="trip.coverImageUrl"
        :alt="trip.title"
        class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
        </svg>
      </div>
      <div class="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-semibold text-gray-700">
        {{ trip.country }}
      </div>
      <div class="absolute top-3 right-3 px-2.5 py-1 bg-black/50 backdrop-blur rounded-full text-xs font-medium text-white">
        {{ trip.stopCount }} stops
      </div>
    </div>
    <div class="p-4">
      <h2 class="text-base font-bold text-gray-900 group-hover:text-gray-700 transition">{{ trip.title }}</h2>
      <p class="text-xs text-gray-400 mt-1">{{ formatTripDates(trip.startDate, trip.endDate) }}</p>
    </div>
  </RouterLink>
</template>

<script setup>
defineProps({
  trip: { type: Object, required: true }
})

function formatTripDates(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const opts = { day: 'numeric', month: 'short' }
  return `${s.toLocaleDateString('nl-NL', opts)} - ${e.toLocaleDateString('nl-NL', { ...opts, year: 'numeric' })}`
}
</script>
