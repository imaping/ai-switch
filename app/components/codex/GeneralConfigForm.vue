<template>
  <NForm class="space-y-6" @submit.prevent>
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">{{ t('codex.generalConfigForm.title') }}</h3>

      <SharedCodeEditor
        v-model="tomlText"
        language="toml"
        height="300px"
        :validate="false"
      />
    </div>
  </NForm>
</template>

<script setup lang="ts">
import {
  NForm,
  useMessage
} from 'naive-ui'
import { useCodexStore } from '~/stores/codex'

interface Props {
  initialValue?: string
}
const props = defineProps<Props>()

const { t } = useI18n()
const store = useCodexStore()
const message = useMessage()

const tomlText = ref<string>(props.initialValue ?? '')

const submit = async () => {
  await store.updateGeneralConfig(tomlText.value)
  message.success(t('codex.generalConfigForm.configUpdated'))
}

defineExpose({
  submit,
  isSubmitting: () => store.loading,
  hasCodeError: () => false,
})
</script>

