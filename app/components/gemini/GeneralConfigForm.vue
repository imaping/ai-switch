<template>
  <NForm class="space-y-6" @submit.prevent>
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">{{ t('gemini.generalConfigForm.title') }}</h3>

      <SharedCodeEditor
        v-model="envText"
        language="text"
        height="300px"
        :validate="false"
      />
    </div>
  </NForm>
</template>

<script setup lang="ts">
import { NForm, useMessage } from 'naive-ui'
import { useGeminiStore } from '~/stores/gemini'

const { t } = useI18n()

interface Props {
  initialValue?: string
}
const props = defineProps<Props>()

const store = useGeminiStore()
const message = useMessage()

const envText = ref<string>(props.initialValue ?? '')

// 监听 initialValue 变化，更新表单内容
watch(
  () => props.initialValue,
  (newValue) => {
    if (newValue !== undefined) {
      envText.value = newValue
    }
  },
  { immediate: false },
)

const submit = async () => {
  await store.updateGeneralConfig(envText.value)
  message.success(t('gemini.generalConfigForm.configUpdated'))
}

defineExpose({
  submit,
  isSubmitting: () => false,
  hasCodeError: () => false,
})
</script>

