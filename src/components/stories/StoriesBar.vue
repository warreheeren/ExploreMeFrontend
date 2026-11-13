<template>
  <section :aria-label="$t('stories.barLabel')">
    <div v-if="loading" class="-mx-4 flex gap-3 overflow-hidden px-4 sm:mx-0 sm:px-0" aria-busy="true">
      <div v-for="i in 5" :key="i" class="flex w-16 shrink-0 flex-col items-center gap-1.5"><div class="skeleton h-16 w-16 rounded-full" /><div class="skeleton h-2.5 w-12" /></div>
    </div>

    <ul v-else class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
      <!-- Eigen story: toevoegen, of bekijken met een "+" om er nog een te maken -->
      <li class="w-16 shrink-0">
        <div class="relative mx-auto h-16 w-16">
          <button
            v-if="myGroup"
            type="button"
            class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-line-strong p-0.5"
            :aria-label="$t('stories.openStories', { name: $t('stories.yourStory') })"
            @click="open(myGroupIndex)"
          >
            <Avatar :src="auth.profilePhotoUrl" :name="auth.displayName" :size="56" />
          </button>
          <button v-else type="button" class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-line-strong p-0.5" :aria-label="$t('stories.addStory')" @click="createOpen = true">
            <Avatar :src="auth.profilePhotoUrl" :name="auth.displayName" :size="56" />
          </button>
          <button type="button" class="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-accent-700 text-white" :aria-label="$t('stories.addStory')" @click="createOpen = true">
            <Icon name="plus" :size="13" :stroke-width="3" />
          </button>
        </div>
        <p class="mt-1 truncate text-center text-[11px] font-bold text-body">{{ $t('stories.yourStory') }}</p>
      </li>

      <li v-for="item in others" :key="item.group.userName" class="w-16 shrink-0">
        <button
          type="button"
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 p-0.5 transition"
          :class="item.group.hasUnseen ? 'border-accent-600' : 'border-line'"
          :aria-label="`${$t('stories.openStories', { name: item.group.displayName })}${item.group.hasUnseen ? `, ${$t('stories.unseen')}` : ''}`"
          @click="open(item.index)"
        >
          <Avatar :src="item.group.profilePhotoUrl" :name="item.group.displayName" :size="56" />
        </button>
        <p class="mt-1 truncate text-center text-[11px] font-bold" :class="item.group.hasUnseen ? 'text-ink' : 'text-muted'">{{ firstName(item.group.displayName) }}</p>
      </li>
    </ul>

    <StoryViewer v-model="viewerOpen" :groups="groups" :start-group="startGroup" @seen="onSeen" @deleted="onDeleted" />
    <StoryCreateDialog v-model="createOpen" @created="load" />
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Avatar from '@/components/ui/Avatar.vue'
import Icon from '@/components/ui/Icon.vue'
import StoryViewer from './StoryViewer.vue'
import StoryCreateDialog from './StoryCreateDialog.vue'
import * as storiesApi from '@/api/storiesApi'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const groups = ref([])
const loading = ref(true)
const viewerOpen = ref(false)
const createOpen = ref(false)
const startGroup = ref(0)

const myGroupIndex = computed(() => groups.value.findIndex((g) => g.isMe))
const myGroup = computed(() => (myGroupIndex.value >= 0 ? groups.value[myGroupIndex.value] : null))
const others = computed(() => groups.value.map((group, index) => ({ group, index })).filter((x) => !x.group.isMe))

function firstName(name) {
  return String(name || '').split(' ')[0]
}

async function load() {
  try {
    groups.value = await storiesApi.getStoryFeed()
  } catch {
    groups.value = []
  } finally {
    loading.value = false
  }
}

function open(index) {
  startGroup.value = index
  viewerOpen.value = true
}

function onSeen() {
  for (const g of groups.value) g.hasUnseen = !g.isMe && g.stories.some((s) => !s.seen)
}

function onDeleted(id) {
  groups.value = groups.value
    .map((g) => ({ ...g, stories: g.stories.filter((s) => s.id !== id) }))
    .filter((g) => g.stories.length)
}

onMounted(() => {
  load()
  window.addEventListener('app-refresh', load)
})
onBeforeUnmount(() => window.removeEventListener('app-refresh', load))
defineExpose({ reload: load })
</script>
