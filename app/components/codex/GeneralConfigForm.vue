<template>
  <UForm class="space-y-6" @submit.prevent>
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">通用配置 (TOML)</h3>

      <SharedCodeEditor
        v-model="tomlText"
        language="toml"
        height="300px"
        :validate="false"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { useCodexStore } from '~/stores/codex'

interface Props {
  initialValue?: string
}
const props = defineProps<Props>()

const store = useCodexStore()
const toast = useToast()

const tomlText = ref<string>(props.initialValue ?? '')

const submit = async () => {
  await store.updateGeneralConfig(tomlText.value)
  toast.add({
    title: '保存成功',
    description: '通用配置已更新',
    color: 'success',
    icon: 'i-heroicons-check-circle',
  })
}

defineExpose({
  submit,
  isSubmitting: () => store.loading,
  hasCodeError: () => false,
})
</script>

