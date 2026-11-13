<template>
  <div class="relative">
    <component
      :is="multiline ? 'textarea' : 'input'"
      ref="inputRef"
      :value="modelValue"
      :rows="multiline ? rows : undefined"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :aria-label="ariaLabel || placeholder"
      :class="inputClass"
      autocomplete="off"
      @input="onInput"
      @keydown="onKeydown"
      @click="detect"
      @blur="onBlur"
    />

    <ul
      v-if="open && suggestions.length"
      class="absolute left-0 z-40 mt-1 w-64 overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-pop"
      :class="dropUp ? 'bottom-full mb-1' : 'top-full'"
      role="listbox"
    >
      <li v-for="(user, i) in suggestions" :key="user.userName">
        <button
          type="button"
          role="option"
          :aria-selected="i === activeIndex"
          class="flex w-full items-center gap-2.5 px-3 py-2 text-left transition"
          :class="i === activeIndex ? 'bg-gray-50' : 'hover:bg-gray-50'"
          @mousedown.prevent="select(user)"
        >
          <Avatar :src="user.profilePhotoUrl" :name="user.displayName" size="sm" />
          <span class="min-w-0">
            <span class="block truncate text-sm font-bold text-ink">{{ user.displayName }}</span>
            <span class="block truncate text-xs text-muted">@{{ user.userName }}</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import Avatar from './ui/Avatar.vue'
import * as followApi from '@/api/followApi'
import { activeMentionQuery } from '@/utils/mentions'
import { useDebounceFn } from '@/composables/useDebounce'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
  multiline: { type: Boolean, default: false },
  rows: { type: Number, default: 2 },
  maxlength: { type: Number, default: null },
  inputClass: { type: [String, Array, Object], default: '' },
  submitOnEnter: { type: Boolean, default: false },
  dropUp: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'submit'])

const inputRef = ref(null)
const open = ref(false)
const suggestions = ref([])
const activeIndex = ref(0)
let queryStart = -1
let lastQuery = null

const search = useDebounceFn(async (q) => {
  try {
    const results = await followApi.searchUsers(q, 5)
    if (lastQuery !== q) return
    suggestions.value = results
    activeIndex.value = 0
    open.value = results.length > 0
  } catch {
    open.value = false
  }
}, 200)

function detect() {
  const el = inputRef.value
  if (!el) return
  const caret = el.selectionStart ?? el.value.length
  const before = el.value.slice(0, caret)
  const q = activeMentionQuery(before)
  if (q === null || q.length < 1) {
    open.value = false
    lastQuery = null
    return
  }
  queryStart = caret - q.length - 1
  lastQuery = q
  search(q)
}

function onInput(e) {
  emit('update:modelValue', e.target.value)
  nextTick(detect)
  if (props.multiline) autoResize()
}

function select(user) {
  const el = inputRef.value
  if (!el || queryStart < 0) return
  const caret = el.selectionStart ?? el.value.length
  const value = el.value
  const next = `${value.slice(0, queryStart)}@${user.userName} ${value.slice(caret)}`
  emit('update:modelValue', next)
  open.value = false
  lastQuery = null
  nextTick(() => {
    const pos = queryStart + user.userName.length + 2
    el.focus()
    el.setSelectionRange(pos, pos)
  })
}

function onKeydown(e) {
  if (open.value && suggestions.value.length) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      activeIndex.value = (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      select(suggestions.value[activeIndex.value])
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      open.value = false
      return
    }
  }
  if (props.submitOnEnter && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('submit')
  }
}

function onBlur() {
  setTimeout(() => { open.value = false }, 120)
}

function autoResize() {
  const el = inputRef.value
  if (!el || !props.multiline) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 240)}px`
}

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus, autoResize })
</script>
