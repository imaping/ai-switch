<template>
  <UForm :state="formState" @submit="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <UFormField  :label="t('claude.mcpForm.serviceNameLabel')" name="name" required>
        <UInput
          v-model="formState.name"
          :placeholder="t('claude.mcpForm.serviceNamePlaceholder')"
          :disabled="submitting || isEditMode"
          size="lg"
          class="w-full"
        />
        <template #help>
          <span class="text-xs text-gray-500">{{ t('claude.mcpForm.serviceNameHelp') }}</span>
        </template>
      </UFormField >

      <UFormField  :label="t('claude.mcpForm.displayNameLabel')" name="displayName">
        <UInput
          v-model="formState.displayName"
          :placeholder="t('claude.mcpForm.displayNamePlaceholder')"
          :disabled="submitting"
          size="lg"
          class="w-full"
        />
      </UFormField >

      <UFormField  :label="t('claude.mcpForm.docUrlLabel')" name="docUrl">
        <UInput
          v-model="formState.docUrl"
          type="url"
          :placeholder="t('claude.mcpForm.docUrlPlaceholder')"
          :disabled="submitting"
          size="lg"
          class="w-full"
        />
      </UFormField >

      <UCheckbox
        v-model="formState.enabled"
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
    <UAlert
      v-if="formError || codeError"
      color="red"
      variant="soft"
      :title="formError || codeError || ''"
      icon="i-heroicons-exclamation-circle"
    />

    <!-- 操作按钮移至父级 UModal.footer -->
  </UForm>
</template>

<script setup lang="ts">
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
const toast = useToast()

const isEditMode = computed(() => Boolean(props.initialValue))

// 表单状态
const formState = reactive({
  name: props.initialValue?.name || '',
  displayName: props.initialValue?.displayName || '',
  docUrl: props.initialValue?.docUrl || '',
  enabled: props.initialValue?.enabled ?? true,
})

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
    toast.add({
      title: isEditMode.value ? t('claude.form.updateSuccess') : t('claude.form.createSuccess'),
      description: isEditMode.value ? t('claude.mcpForm.mcpUpdated', { name }) : t('claude.mcpForm.mcpCreated', { name }),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    emit('close')
  }
  catch (error: any) {
    formError.value = error.message || t('claude.form.operationFailed')
  }
  finally {
    submitting.value = false
  }
}

// 暴露方法给父级 UModal.footer 调用，保持与 EnvironmentForm 一致
defineExpose({
  submit: () => handleSubmit(),
  submitting,
  isSubmitting: () => submitting.value,
  hasCodeError: () => Boolean(codeError.value),
  isEdit: () => isEditMode.value,
})
</script>
