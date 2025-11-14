<template>
  <UForm :state="formState" @submit="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <UFormField :label="t('codex.mcpForm.serviceNameLabel')" name="name" required>
        <UInput
          v-model="formState.name"
          :placeholder="t('codex.mcpForm.serviceNamePlaceholder')"
          :disabled="submitting || isEditMode"
          size="lg"
          class="w-full"
        />
        <template #help>
          <span class="text-xs text-gray-500">{{ t('codex.mcpForm.serviceNameHelp') }}</span>
        </template>
      </UFormField>

      <UFormField :label="t('codex.mcpForm.displayNameLabel')" name="displayName">
        <UInput
          v-model="formState.displayName"
          :placeholder="t('codex.mcpForm.displayNamePlaceholder')"
          :disabled="submitting"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('codex.mcpForm.docUrlLabel')" name="docUrl">
        <UInput
          v-model="formState.docUrl"
          type="url"
          :placeholder="t('codex.mcpForm.docUrlPlaceholder')"
          :disabled="submitting"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UCheckbox
        v-model="formState.enabled"
        :label="t('codex.mcpForm.enableService')"
        :disabled="submitting"
      />
    </div>

    <!-- MCP 配置（TOML） -->
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">{{ t('codex.mcpForm.mcpConfigTitle') }} (TOML)</h3>
      <SharedCodeEditor
        v-model="mcpToml"
        language="toml"
        height="300px"
        :validate="false"
      />
    </div>

    <!-- 错误提示 -->
    <UAlert
      v-if="formError"
      color="red"
      variant="soft"
      :title="formError"
      icon="i-heroicons-exclamation-circle"
    />

    <!-- 操作按钮移至父级 UModal.footer -->
  </UForm>
</template>

<script setup lang="ts">
import type { CodexMcpRecord } from '#shared/types/codex'
import { useCodexStore } from '~/stores/codex'

interface Props { initialValue?: CodexMcpRecord }
const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { upsertMcpServer } = useCodexStore()
const toast = useToast()

const isEditMode = computed(() => Boolean(props.initialValue))

const formState = reactive({
  name: props.initialValue?.name || '',
  displayName: props.initialValue?.displayName || '',
  docUrl: props.initialValue?.docUrl || '',
  enabled: props.initialValue?.enabled ?? true,
})

const mcpToml = ref<string>(props.initialValue?.tomlConfig || '')

const submitting = ref(false)
const formError = ref<string>()

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

    toast.add({
      title: isEditMode.value ? t('codex.form.updateSuccess') : t('codex.form.createSuccess'),
      description: isEditMode.value
        ? t('codex.mcpForm.mcpUpdated', { name: formState.displayName || formState.name })
        : t('codex.mcpForm.mcpCreated', { name: formState.displayName || formState.name }),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    emit('close')
  } catch (error: any) {
    formError.value = error.message || t('codex.form.operationFailed')
  } finally {
    submitting.value = false
  }
}

// 暴露方法给父级 UModal 调用，保持与 EnvironmentForm 一致
defineExpose({
  submit: () => handleSubmit(),
  submitting,
  isSubmitting: () => submitting.value,
  hasCodeError: () => false,
  isEdit: () => isEditMode.value,
})
</script>
