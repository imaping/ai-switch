<template>
  <NForm :model="formState" @submit.prevent="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <NFormItem :label="t('codex.mcpForm.serviceNameLabel')" path="name" :required="true">
        <NInput
          v-model:value="formState.name"
          :placeholder="t('codex.mcpForm.serviceNamePlaceholder')"
          :disabled="submitting || isEditMode"
          size="large"
          class="w-full"
        />
        <template #help>
          <span class="text-xs text-gray-500">{{ t('codex.mcpForm.serviceNameHelp') }}</span>
        </template>
      </NFormItem>

      <NFormItem :label="t('codex.mcpForm.displayNameLabel')" path="displayName">
        <NInput
          v-model:value="formState.displayName"
          :placeholder="t('codex.mcpForm.displayNamePlaceholder')"
          :disabled="submitting"
          size="large"
          class="w-full"
        />
      </NFormItem>

      <NFormItem :label="t('codex.mcpForm.docUrlLabel')" path="docUrl">
        <NInput
          v-model:value="formState.docUrl"
          :placeholder="t('codex.mcpForm.docUrlPlaceholder')"
          :disabled="submitting"
          size="large"
          class="w-full"
        />
      </NFormItem>

      <NCheckbox
        v-model:checked="formState.enabled"
        :label="t('codex.mcpForm.enableService')"
        :disabled="submitting"
      />
    </div>

    <!-- MCP 配置（TOML） -->
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">
        {{ t('codex.mcpForm.mcpConfigTitle') }} (TOML)
      </h3>
      <SharedCodeEditor
        v-model="mcpToml"
        language="toml"
        height="300px"
        :validate="false"
      />
    </div>

    <!-- 错误提示 -->
    <NAlert
      v-if="formError"
      type="error"
      :show-icon="true"
    >
      {{ formError }}
    </NAlert>

    <!-- 操作按钮移至父级弹窗 footer -->
  </NForm>
</template>

<script setup lang="ts">
import {
  NAlert,
  NCheckbox,
  NForm,
  NFormItem,
  NInput,
  useMessage
} from 'naive-ui'
import type { CodexMcpRecord } from '#shared/types/codex'
import { useCodexStore } from '~/stores/codex'

interface Props { initialValue?: CodexMcpRecord }
const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { upsertMcpServer } = useCodexStore()
const message = useMessage()

const isEditMode = computed(() => Boolean(props.initialValue))

// 表单状态初始化函数
const initFormState = () => ({
  name: props.initialValue?.name || '',
  displayName: props.initialValue?.displayName || '',
  docUrl: props.initialValue?.docUrl || '',
  enabled: props.initialValue?.enabled ?? true,
})

const formState = reactive(initFormState())

const mcpToml = ref<string>(props.initialValue?.tomlConfig || '')

const submitting = ref(false)
const formError = ref<string>()

// 监听 initialValue 变化，重新初始化表单状态
watch(() => props.initialValue, (newValue) => {
  if (newValue) {
    Object.assign(formState, initFormState())
    // 同时更新 mcpToml
    mcpToml.value = newValue.tomlConfig || ''
  }
}, { deep: true, immediate: false })

const handleSubmit = async () => {
  formError.value = undefined

  if (!formState.name.trim()) {
    formError.value = t('codex.mcpForm.serviceNameRequired')
    return
  }
  if (!mcpToml.value.trim()) {
    formError.value = t('codex.mcpForm.fixMcpJsonError')
    return
  }

  try {
    submitting.value = true
    const payload: any = {
      name: formState.name,
      displayName: formState.displayName || undefined,
      docUrl: formState.docUrl || undefined,
      enabled: formState.enabled,
      tomlConfig: mcpToml.value,
    }
    if (isEditMode.value) payload.id = props.initialValue!.id

    await upsertMcpServer(payload)

    message.success(
      isEditMode.value
        ? t('codex.mcpForm.mcpUpdated', { name: formState.displayName || formState.name })
        : t('codex.mcpForm.mcpCreated', { name: formState.displayName || formState.name })
    )
    emit('close')
  } catch (error: any) {
    formError.value = error.message || t('codex.form.operationFailed')
  } finally {
    submitting.value = false
  }
}

// 暴露方法给父级弹窗调用，保持与 EnvironmentForm 一致
defineExpose({
  submit: () => handleSubmit(),
  submitting,
  isSubmitting: () => submitting.value,
  hasCodeError: () => false,
  isEdit: () => isEditMode.value,
})
</script>
