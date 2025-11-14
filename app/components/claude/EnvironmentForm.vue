<template>
  <UForm :state="formState" @submit="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField :label="t('claude.form.titleLabel')" name="title" required>
          <UInput
            v-model="formState.title"
            :placeholder="t('claude.form.titlePlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('claude.form.homepageLabel')" name="homepage">
          <UInput
            v-model="formState.homepage"
            type="url"
            :placeholder="t('claude.form.homepagePlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField>
      </div>

      <UFormField :label="t('claude.form.descriptionLabel')" name="description">
        <UTextarea
          v-model="formState.description"
          :placeholder="t('claude.form.descriptionPlaceholder')"
          :rows="4"
          :disabled="submitting"
          class="w-full"
        />
      </UFormField>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField :label="t('claude.form.requestUrlLabel')" name="requestUrl" required>
          <UInput
            v-model="formState.requestUrl"
            :placeholder="t('claude.form.requestUrlPlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('claude.form.apiKeyLabel')" name="apiKey" required>
          <UInput
            v-model="formState.apiKey"
            type="password"
            :placeholder="t('claude.form.apiKeyPlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField>
      </div>
    </div>

    <!-- Claude Code 配置 -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">{{ t('claude.form.codeConfigTitle') }}</h3>
        <div class="flex items-center gap-3">
          <UCheckbox
            v-model="formState.writeToCommon"
            :label="t('claude.form.writeToCommon')"
            :disabled="submitting"
            size="lg"
          />
          <UButton size="xs" variant="ghost" @click="openCommonConfig">
            {{ t('claude.generalConfigManagement') }}
          </UButton>
        </div>
      </div>

      <SharedCodeEditor
        v-model="codeConfigJson"
        language="json"
        height="250px"
        @error="handleCodeError"
      />
    </div>

    <!-- 余额查询配置(可选) -->
    <UCollapsible class="flex flex-col gap-2 w-full">

      <UButton
        class="group"
        :label="t('claude.form.balanceConfigTitle')"
        color="neutral"
        variant="link"
        icon="i-lucide-chevron-down"
      :ui="{
        leadingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
      }"
    />
      <template #content>
        <div class="space-y-4 p-4">
          <UFormField :label="t('claude.form.balanceUrlLabel')" name="balanceUrl">
            <UInput
              v-model="formState.balanceUrl"
              :placeholder="t('claude.form.balanceUrlPlaceholder')"
              :disabled="submitting"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="t('claude.form.httpMethodLabel')" name="balanceMethod">
              <USelect
                v-model="formState.balanceMethod"
                :items="[
                  { label: 'GET', value: 'GET' },
                  { label: 'POST', value: 'POST' },
                ]"
                :placeholder="t('claude.form.httpMethodPlaceholder')"
                :disabled="submitting"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('claude.form.jsonPathLabel')" name="balanceJsonPath">
              <UInput
                v-model="formState.balanceJsonPath"
                :placeholder="t('claude.form.jsonPathPlaceholder')"
                :disabled="submitting"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField :label="t('claude.form.headersLabel')" name="balanceHeaders">
            <UTextarea
              v-model="formState.balanceHeaders"
              class="w-full"
              :rows="4"
              :placeholder="t('claude.form.headersPlaceholder')"
              :disabled="submitting"
            />
          </UFormField>

          <UFormField :label="t('claude.form.bodyLabel')" name="balanceBody">
            <UTextarea
              v-model="formState.balanceBody"
              :rows="4"
              :disabled="submitting"
            />
          </UFormField>

          <UFormField :label="t('claude.form.formulaLabel')" name="balanceFormula">
            <UInput
              v-model="formState.balanceFormula"
              :placeholder="t('claude.form.formulaPlaceholder')"
              :disabled="submitting"
              size="lg"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
    </UCollapsible>

    <!-- 错误提示 -->
    <UAlert
      v-if="formError || codeError"
      color="error"
      variant="soft"
      :title="formError || codeError || ''"
      icon="i-heroicons-exclamation-circle"
    />

    <!-- 操作按钮已移至父级 UModal.footer -->
  </UForm>
</template>

<script setup lang="ts">
import type { ClaudeEnvironmentRecord } from '#shared/types/claude'

const { t } = useI18n()

interface Props {
  initialValue?: ClaudeEnvironmentRecord
  treatAsNew?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  'open-general': []
  saved: [record: ClaudeEnvironmentRecord]
}>()

import { useClaudeStore } from '~/stores/claude'
const claudeStore = useClaudeStore()
const { createEnvironment, updateEnvironment } = claudeStore
const toast = useToast()

const isEditMode = computed(() => Boolean(props.initialValue && !props.treatAsNew))

// 表单状态
const formState = reactive({
  title: props.initialValue?.title || '',
  homepage: props.initialValue?.homepage || '',
  description: props.initialValue?.description || '',
  requestUrl: props.initialValue?.requestUrl || props.initialValue?.codeConfig?.env?.ANTHROPIC_BASE_URL || '',
  apiKey: props.initialValue?.apiKey || props.initialValue?.codeConfig?.env?.ANTHROPIC_AUTH_TOKEN || '',
  writeToCommon: props.initialValue?.writeToCommon || false,
  balanceUrl: props.initialValue?.balanceUrl || '',
  balanceMethod: props.initialValue?.balanceRequest?.method || 'GET',
  balanceHeaders: props.initialValue?.balanceRequest?.headers
    ? JSON.stringify(props.initialValue.balanceRequest.headers, null, 2)
    : '',
  balanceBody: props.initialValue?.balanceRequest?.body || '',
  balanceJsonPath: props.initialValue?.balanceJsonPath || '',
  balanceFormula: props.initialValue?.balanceFormula || '',
})

// Code 配置
const defaultCodeConfig = {
  env: {
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_AUTH_TOKEN: '',
  },
}

const codeConfigJson = ref(
  JSON.stringify(props.initialValue?.codeConfig || defaultCodeConfig, null, 2)
)

const submitting = ref(false)
const formError = ref<string>()
const codeError = ref<string | null>(null)

// 监听 requestUrl 和 apiKey 变化,更新 JSON
watch([() => formState.requestUrl, () => formState.apiKey], ([url, key]) => {
  try {
    const config = JSON.parse(codeConfigJson.value)
    config.env = config.env || {}
    config.env.ANTHROPIC_BASE_URL = url
    config.env.ANTHROPIC_AUTH_TOKEN = key
    codeConfigJson.value = JSON.stringify(config, null, 2)
  }
  catch {
    // 忽略 JSON 解析错误
  }
})

// 通用配置合并/剔除工具
const isPlainObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v)
const deepMergePreferSecond = (a: any, b: any): any => {
  if (Array.isArray(a) && Array.isArray(b)) return b
  if (isPlainObject(a) && isPlainObject(b)) {
    const out: Record<string, any> = {}
    // 先保留 b(当前 JSON) 的键顺序与值（遇到冲突做递归合并，b 优先）
    for (const k of Object.keys(b)) {
      if (k in a) out[k] = deepMergePreferSecond(a[k], b[k])
      else out[k] = b[k]
    }
    // 再把 a(通用配置) 中 b 不存在的键追加到后面
    for (const k of Object.keys(a)) {
      if (!(k in b)) out[k] = a[k]
    }
    return out
  }
  return b !== undefined ? b : a
}
const deepPruneEqual = (obj: any, tmpl: any): any => {
  if (Array.isArray(obj) && Array.isArray(tmpl)) {
    return JSON.stringify(obj) === JSON.stringify(tmpl) ? undefined : obj
  }
  if (isPlainObject(obj) && isPlainObject(tmpl)) {
    const out: Record<string, any> = { ...obj }
    for (const k of Object.keys(tmpl)) {
      if (!(k in out)) continue
      const pruned = deepPruneEqual(out[k], tmpl[k])
      if (pruned === undefined) delete out[k]
      else out[k] = pruned
    }
    return Object.keys(out).length === 0 ? undefined : out
  }
  return obj === tmpl ? undefined : obj
}

// 勾选/取消写入通用配置时，实时更新 JSON 编辑框展示的结果（通用优先级最低，仅填充缺失键）
watch(
  [() => formState.writeToCommon, () => claudeStore.generalConfig?.payload],
  () => {
    try {
      const current = JSON.parse(codeConfigJson.value)
      const common: any = claudeStore.generalConfig?.payload || {}
      let next = current
      if (formState.writeToCommon) {
        next = deepMergePreferSecond(common, current)
      } else if (common && Object.keys(common).length) {
        const pruned = deepPruneEqual(current, common)
        next = pruned === undefined ? {} : pruned
      }
      next.env = next.env || {}
      next.env.ANTHROPIC_BASE_URL = formState.requestUrl
      next.env.ANTHROPIC_AUTH_TOKEN = formState.apiKey
      codeConfigJson.value = JSON.stringify(next, null, 2)
    }
    catch {
      // 忽略 JSON 解析错误
    }
  }
)

const handleCodeError = (error: string | null) => {
  codeError.value = error
}

const handleSubmit = async () => {
  formError.value = undefined

  if (codeError.value) {
    formError.value = t('claude.form.fixJsonError')
    return
  }

  try {
    submitting.value = true

    // 解析 code config
    let codeConfig: any = JSON.parse(codeConfigJson.value)

    // 解析 balance headers
    let balanceHeaders: Record<string, string> | undefined
    if (formState.balanceHeaders.trim()) {
      try {
        balanceHeaders = JSON.parse(formState.balanceHeaders)
      }
      catch {
        throw new Error(t('claude.form.balanceHeadersError'))
      }
    }

    const payload: any = {
      title: formState.title,
      homepage: formState.homepage || undefined,
      description: formState.description || undefined,
      requestUrl: formState.requestUrl,
      apiKey: formState.apiKey,
      writeToCommon: formState.writeToCommon,
      codeConfig,
    }
    // 余额查询配置（与后端/类型对齐为扁平字段）
    if (formState.balanceUrl?.trim()) {
      payload.balanceUrl = formState.balanceUrl
      payload.balanceRequest = {
        method: formState.balanceMethod || undefined,
        headers: balanceHeaders,
        body: formState.balanceBody || undefined,
      }
      payload.balanceJsonPath = formState.balanceJsonPath || undefined
      payload.balanceFormula = formState.balanceFormula || undefined
    } else {
      // 若未填写 URL，则视为清除余额配置
      payload.balanceUrl = undefined
      payload.balanceRequest = undefined
      payload.balanceJsonPath = undefined
      payload.balanceFormula = undefined
    }

    let savedRecord: ClaudeEnvironmentRecord
    if (isEditMode.value) {
      savedRecord = await updateEnvironment(props.initialValue!.id, payload)
      toast.add({
        title: t('claude.form.updateSuccess'),
        description: t('claude.form.environmentUpdated', { name: formState.title }),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
    else {
      savedRecord = await createEnvironment(payload)
      toast.add({
        title: t('claude.form.createSuccess'),
        description: t('claude.form.environmentCreated', { name: formState.title }),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }

    emit('saved', savedRecord)
    emit('close')
  }
  catch (error: any) {
    formError.value = error.message || t('claude.form.operationFailed')
  }
  finally {
    submitting.value = false
  }
}

// 暴露给父组件用于页脚按钮控制
defineExpose({
  submit: () => {
    return handleSubmit()
  },
  submitting,
  codeError,
  isEditMode,
  // 兼容父组件以函数方式读取状态
  isSubmitting: () => submitting.value,
  hasCodeError: () => Boolean(codeError.value),
  isEdit: () => isEditMode.value,
})

// 打开通用配置对话框：让父组件控制弹窗开启
const openCommonConfig = () => {
  emit('open-general')
}
</script>
