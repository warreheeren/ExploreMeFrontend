<template>
  <Modal :model-value="modelValue" :title="list ? $t('lists.form.editTitle') : $t('lists.form.newTitle')" size="sm" @update:model-value="$emit('update:modelValue', $event)">
    <form id="list-form" class="space-y-4" @submit.prevent="submit">
      <div>
        <label for="list-name" class="label">{{ $t('lists.form.name') }}</label>
        <input id="list-name" v-model.trim="form.name" class="input" maxlength="80" :placeholder="$t('lists.namePlaceholder')" required autofocus />
      </div>
      <div>
        <label for="list-desc" class="label">{{ $t('lists.form.description') }} <span class="font-semibold text-muted">{{ $t('common.optional') }}</span></label>
        <textarea id="list-desc" v-model="form.description" rows="2" maxlength="300" class="textarea" />
      </div>
      <label class="flex items-start gap-3 rounded-2xl border border-line p-3">
        <input v-model="form.isPublic" type="checkbox" class="checkbox mt-0.5" />
        <span><span class="block text-sm font-bold text-ink">{{ $t('lists.publicLabel') }}</span><span class="text-xs text-muted">{{ $t('lists.form.publicHint') }}</span></span>
      </label>
    </form>
    <template #footer>
      <button type="button" class="btn btn-ghost" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</button>
      <button type="submit" form="list-form" class="btn btn-dark" :disabled="!form.name || saving">{{ saving ? $t('common.saving') : $t('common.save') }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import * as listsApi from '@/api/listsApi'
import { useToastStore } from '@/stores/toast'
import { errorMessage } from '@/utils/errors'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Bestaande lijst om te bewerken; leeg = nieuwe lijst. */
  list: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const toast = useToastStore()
const form = reactive({ name: '', description: '', isPublic: false })
const saving = ref(false)

watch(() => props.modelValue, (open) => {
  if (!open) return
  Object.assign(form, {
    name: props.list?.name || '',
    description: props.list?.description || '',
    isPublic: props.list?.isPublic ?? false,
  })
})

async function submit() {
  saving.value = true
  try {
    const payload = { name: form.name, description: form.description?.trim() || null, isPublic: form.isPublic }
    const saved = props.list ? await listsApi.updateList(props.list.id, payload) : await listsApi.createList(payload)
    emit('saved', saved)
    emit('update:modelValue', false)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>
