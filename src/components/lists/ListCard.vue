<template>
  <RouterLink :to="`/lists/${list.id}`" class="card group block overflow-hidden transition hover:border-line-strong">
    <div class="grid aspect-[16/9] grid-cols-2 grid-rows-2 gap-0.5 bg-gray-100">
      <template v-if="images.length">
        <img
          v-for="(src, i) in images"
          :key="src"
          :src="thumbUrl(src)"
          alt=""
          loading="lazy"
          class="h-full w-full object-cover"
          :class="images.length === 1 ? 'col-span-2 row-span-2' : images.length === 2 ? 'row-span-2' : images.length === 3 && i === 0 ? 'row-span-2' : ''"
        />
      </template>
      <span v-else class="col-span-2 row-span-2 flex items-center justify-center text-muted"><Icon name="list" :size="28" /></span>
    </div>
    <div class="p-4">
      <p class="flex items-center gap-2">
        <span class="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink group-hover:underline">{{ list.name }}</span>
        <Icon v-if="!list.isPublic" name="lock" :size="14" class="text-muted" :aria-label="$t('common.private')" />
      </p>
      <p v-if="list.description" class="mt-0.5 line-clamp-2 text-sm text-body">{{ list.description }}</p>
      <p class="mt-1.5 text-xs font-semibold text-muted">
        {{ $t('lists.places', { n: list.itemCount }) }}
        <template v-if="showOwner"> · {{ list.ownerDisplayName }}</template>
      </p>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { thumbUrl } from '@/utils/media'

const props = defineProps({
  list: { type: Object, required: true },
  showOwner: { type: Boolean, default: false },
})

const images = computed(() => (props.list.previewImageUrls || []).slice(0, 4))
</script>
