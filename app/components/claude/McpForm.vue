<template>
  <NForm :model="formState" @submit.prevent="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <NFormItem :label="t('claude.mcpForm.serviceNameLabel')" path="name" :required="true">
        <NInput
          v-model:value="formState.name"
          :placeholder="t('claude.mcpForm.serviceNamePlaceholder')"
          :disabled="submitting || isEditMode"
          size="large"
          class="w-full"
        />
        <template #help>
          <span class="text-xs text-gray-500">{{ t('claude.mcpForm.serviceNameHelp') }}</span>
        </template>
      </NFormItem>

      <NFormItem :label="t('claude.mcpForm.displayNameLabel')" path="displayName">
        <NInput
          v-model:value="formState.displayName"
          :placeholder="t('claude.mcpForm.displayNamePlaceholder')"
          :disabled="submitting"
          size="large"
          class="w-full"
        />
      </NFormItem>

      <NFormItem :label="t('claude.mcpForm.docUrlLabel')" path="docUrl">
        <NInput
          v-model:value="formState.docUrl"
          :placeholder="t('claude.mcpForm.docUrlPlaceholder')"
          :disabled="submitting"
          size="large"
          class="w-full"
        />
      </NFormItem>

      <NCheckbox
        v-model:checked="formState.enabled"
        :label="t('claude.mcpForm.enableService')"
        :disabled="submitting"
      />
    </div>

    <!-- MCP 配置 -->
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">{{ t('claude.mcpForm.mcpConfigTitle') }}</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('claude.mcpForm.mcpConfigDesc') }}
      </p>

      <SharedCodeEditor
        v-model="mcpConfigJson"
        language="json"
        height="300px"
        @error="handleCodeError"
      />
    </div>

    <!-- 错误提示 -->
    <NAlert
      v-if="formError || codeError"
      type="error"
      :show-icon="true"
    >
      {{ formError || codeError }}
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
import type { ClaudeMcpRecord } from '#shared/types/claude'

const { t } = useI18n()

interface Props {
  initialValue?: ClaudeMcpRecord
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

import { useClaudeStore } from '~/stores/claude'
const { upsertMcpServer } = useClaudeStore()
const message = useMessage()

const isEditMode = computed(() => Boolean(props.initialValue))

// 表单状态初始化函数
const initFormState = () => ({
  name: props.initialValue?.name || '',
  displayName: props.initialValue?.displayName || '',
  docUrl: props.initialValue?.docUrl || '',
  enabled: props.initialValue?.enabled ?? true,
})

// 表单状态
const formState = reactive(initFormState())

// MCP 配置
const defaultMcpConfig = {
  command: 'npx',
  args: [],
  env: {},
}

const mcpConfigJson = ref(
  JSON.stringify(props.initialValue?.config || defaultMcpConfig, null, 2)
)

const submitting = ref(false)
const formError = ref<string>()
const codeError = ref<string | null>(null)

// 监听 initialValue 变化，重新初始化表单状态
watch(() => props.initialValue, (newValue) => {
  if (newValue) {
    Object.assign(formState, initFormState())
    // 同时更新 mcpConfigJson
    mcpConfigJson.value = JSON.stringify(
      newValue.config || defaultMcpConfig,
      null,
      2
    )
  }
}, { deep: true, immediate: false })

const handleCodeError = (error: string | null) => {
  codeError.value = error
}

const handleSubmit = async () => {
  formError.value = undefined

  if (codeError.value) {
    formError.value = t('claude.mcpForm.fixMcpJsonError')
    return
  }

  if (!formState.name.trim()) {
    formError.value = t('claude.mcpForm.serviceNameRequired')
    return
  }

  try {
    submitting.value = true

    // 解析 MCP config
    const config = JSON.parse(mcpConfigJson.value)

    const payload: any = {
      name: formState.name,
      displayName: formState.displayName || undefined,
      docUrl: formState.docUrl || undefined,
      enabled: formState.enabled,
      config,
    }

    if (isEditMode.value) {
      payload.id = props.initialValue!.id
    }

    await upsertMcpServer(payload)

    const name = formState.displayName || formState.name
    message.success(
      isEditMode.value
        ? t('claude.mcpForm.mcpUpdated', { name })
        : t('claude.mcpForm.mcpCreated', { name })
    )

    emit('close')
  }
  catch (error: any) {
    formError.value = error.message || t('claude.form.operationFailed')
  }
  finally {
    submitting.value = false
  }
}

// 暴露方法给父级弹窗 footer 调用，保持与 EnvironmentForm 一致
defineExpose({
  submit: () => handleSubmit(),
  submitting,
  isSubmitting: () => submitting.value,
  hasCodeError: () => Boolean(codeError.value),
  isEdit: () => isEditMode.value,
})
</script>
