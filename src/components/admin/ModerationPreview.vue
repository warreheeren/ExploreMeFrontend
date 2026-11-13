<template>
  <div class="flex items-start gap-3">
    <span v-if="target.imageUrl && target.type !== 'user'" class="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
      <img :src="thumbUrl(target.imageUrl)" alt="" class="h-full w-full object-cover" loading="lazy" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="flex flex-wrap items-center gap-2">
        <span class="chip chip-muted h-5 px-2 text-[10px] uppercase tracking-wide">{{ $t(`admin.types.${target.type}`) }}</span>
        <span v-if="target.isHidden" class="chip h-5 bg-amber-50 px-2 text-[10px] text-rating-text">{{ $t('admin.preview.hidden') }}</span>
        <span v-if="!target.exists" class="chip h-5 bg-red-50 px-2 text-[10px] text-red-700">{{ $t('admin.preview.deleted') }}</span>
      </p>
      <template v-if="target.exists">
        <p class="mt-1.5 text-sm font-bold text-ink" :class="compact ? 'line-clamp-1' : 'line-clamp-2'">{{ target.label }}</p>
        <p v-if="target.text && target.text !== target.label && !compact" class="mt-1 line-clamp-3 whitespace-pre-line text-sm text-body">{{ target.text }}</p>
        <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted">
          <RouterLink v-if="target.ownerUserName" :to="`/u/${target.ownerUserName}`" class="inline-flex items-center gap-1.5 hover:text-ink">
            <Avatar :src="target.ownerProfilePhotoUrl" :name="target.ownerDisplayName" size="xs" />
            {{ target.ownerDisplayName }} <span class="text-muted">@{{ target.ownerUserName }}</span>
          </RouterLink>
          <span v-if="target.ownerBanned" class="text-red-600">{{ $t('admin.users.banned') }}</span>
          <span v-if="target.createdAtUtc">{{ timeAgo(target.createdAtUtc) }}</span>
          <RouterLink v-if="target.link && (!target.isHidden || target.type === 'user')" :to="target.link" class="link inline-flex items-center gap-1">
            {{ $t('common.view') }} <Icon name="arrow-right" :size="12" />
          </RouterLink>
        </p>
      </template>
      <p v-else class="mt-1.5 text-sm text-muted">{{ $t('admin.preview.deletedText') }}</p>
    </div>
  </div>
</template>

<script setup>
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { thumbUrl } from '@/utils/media'
import { timeAgo } from '@/utils/date'

defineProps({
  target: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})
</script>
