<template>
  <UForm :state="formState" @submit="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <UFormField label="服务名称(唯一标识符)" name="name" required>
        <UInput
          v-model="formState.name"
          placeholder="例如: my-mcp-server"
          :disabled="submitting || isEditMode"
          size="lg"
          class="w-full"
        />
        <template #help>
          <span class="text-xs text-gray-500">创建后不可修改</span>
        </template>
      </UFormField>

      <UFormField label="显示名称" name="displayName">
        <UInput
          v-model="formState.displayName"
          placeholder="例如: 我的 MCP 服务"
          :disabled="submitting"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField label="文档链接" name="docUrl">
        <UInput
          v-model="formState.docUrl"
          type="url"
          placeholder="https://example.com/docs"
          :disabled="submitting"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UCheckbox
        v-model="formState.enabled"
        label="启用此 MCP 服务"
        :disabled="submitting"
      />
    </div>

    <!-- MCP 配置（TOML） -->
    <div class="space-y-3">
      <h3 class="text-lg font-semibold">MCP 配置 (TOML)</h3>
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
    formError.value = '服务名称不能为空'
    return
  }
  if (!mcpToml.value.trim()) {
    formError.value = '请填写 MCP TOML 配置'
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
      title: isEditMode.value ? '更新成功' : '创建成功',
      description: `MCP 服务 "${formState.displayName || formState.name}" 已${isEditMode.value ? '更新' : '创建'}`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    emit('close')
  } catch (error: any) {
    formError.value = error.message || '操作失败'
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
