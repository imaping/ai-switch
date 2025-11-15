<template>
  <NForm class="space-y-6" @submit.prevent>
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">{{ t('claude.generalConfigForm.title') }}</h3>

      <SharedCodeEditor
        v-model="jsonText"
        language="json"
        height="300px"
        @error="handleCodeError"
      />

      <NAlert
        v-if="codeError"
        type="error"
        :show-icon="true"
      >
        {{ codeError }}
      </NAlert>
    </div>
  </NForm>
</template>

<script setup lang="ts">
import {
  NAlert,
  NForm,
  useMessage
} from 'naive-ui'
import { useClaudeStore } from '~/stores/claude'
import TOML from "@iarna/toml";

const { t } = useI18n()

interface Props {
  initialValue?: Record<string, unknown>
}
const props = defineProps<Props>()

const store = useClaudeStore()
const message = useMessage()

const codeError = ref<string | null>(null)
const jsonText = ref<string>(
  JSON.stringify(props.initialValue ?? {}, null, 2)
)

const handleCodeError = (err: string | null) => {
  codeError.value = err
}

const submit = async () => {
  if (codeError.value) return
  let content: Record<string, unknown>
  try {
    content = JSON.parse(jsonText.value)
  } catch (e: any) {
    codeError.value = e?.message || t('claude.generalConfigForm.jsonParseError')
    return
  }

  await store.updateGeneralConfig(content)
  message.success(t('claude.generalConfigForm.configUpdated'))
}

defineExpose({
  submit,
  isSubmitting: () => store.loading,
  hasCodeError: () => Boolean(codeError.value),
})
</script>

