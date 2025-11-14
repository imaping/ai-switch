<template>
  <UForm :state="formState" @submit="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField :label="t('codex.form.titleLabel')" name="title" required>
          <UInput
            v-model="formState.title"
            :placeholder="t('codex.form.titlePlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('codex.form.homepageLabel')" name="homepage">
          <UInput
            v-model="formState.homepage"
            type="url"
            :placeholder="t('codex.form.homepagePlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField>
      </div>

      <UFormField :label="t('codex.form.descriptionLabel')" name="description">
        <UTextarea
          v-model="formState.description"
          :placeholder="t('codex.form.descriptionPlaceholder')"
          :rows="4"
          :disabled="submitting"
          class="w-full"
        />
      </UFormField>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Base URL" name="baseUrl" required>
          <UInput
            v-model="formState.baseUrl"
            placeholder="https://api.openai.com"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('codex.form.apiKeyLabel')" name="apiKey" required>
          <UInput
            v-model="formState.apiKey"
            type="password"
            :placeholder="t('codex.form.apiKeyPlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField>
      </div>
    </div>

    <!-- Codex 配置（TOML） -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">{{ t('codex.form.codeConfigTitle') }} (TOML)</h3>
        <div class="flex items-center gap-3">
          <UCheckbox v-model="formState.writeToCommon" :label="t('codex.form.writeToCommon')" :disabled="submitting" />
          <UButton size="xs" variant="ghost" @click="openGeneralConfig">
            {{ t('codex.generalConfigManagement') }}
          </UButton>
        </div>
      </div>

      <SharedCodeEditor
        v-model="configToml"
        language="toml"
        :validate="false"
        height="250px"
      />
    </div>

    <!-- 余额查询配置(可选) -->
    <UCollapsible class="flex flex-col gap-2 w-full">
      <UButton
        class="group"
        :label="t('codex.form.balanceConfigTitle')"
        color="neutral"
        variant="link"
        icon="i-lucide-chevron-down"
        :ui="{
          leadingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
        }"
      />
      <template #content>
        <div class="space-y-4 p-4">
          <UFormField :label="t('codex.form.balanceUrlLabel')" name="balanceUrl">
            <UInput
              v-model="formState.balanceUrl"
              :placeholder="t('codex.form.balanceUrlPlaceholder')"
              :disabled="submitting"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="t('codex.form.httpMethodLabel')" name="balanceMethod">
              <USelect
                v-model="formState.balanceMethod"
                :items="[
                  { label: 'GET', value: 'GET' },
                  { label: 'POST', value: 'POST' },
                ]"
                :placeholder="t('codex.form.httpMethodPlaceholder')"
                :disabled="submitting"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('codex.form.jsonPathLabel')" name="balanceJsonPath">
              <UInput
                v-model="formState.balanceJsonPath"
                :placeholder="t('codex.form.jsonPathPlaceholder')"
                :disabled="submitting"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField :label="t('codex.form.headersLabel')" name="balanceHeaders">
            <UTextarea
              v-model="formState.balanceHeaders"
              class="w-full"
              :rows="4"
              :placeholder="t('codex.form.headersPlaceholder')"
              :disabled="submitting"
            />
          </UFormField>

          <UFormField :label="t('codex.form.bodyLabel')" name="balanceBody">
            <UTextarea
              v-model="formState.balanceBody"
              :rows="4"
              class="w-full"
              :disabled="submitting"
            />
          </UFormField>

          <UFormField :label="t('codex.form.formulaLabel')" name="balanceFormula">
            <UInput
              v-model="formState.balanceFormula"
              :placeholder="t('codex.form.formulaPlaceholder')"
              :disabled="submitting"
              size="lg"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
    </UCollapsible>

    <!-- 错误提示（TOML 不校验，保留接口占位） -->
    <UAlert
      v-if="formError"
      color="red"
      variant="soft"
      :title="formError || ''"
      icon="i-heroicons-exclamation-circle"
    />
  </UForm>
  
</template>

<script setup lang="ts">
import type { CodexEnvironmentRecord } from '#shared/types/codex'
import { useCodexStore } from '~/stores/codex'
import * as TOML from '@iarna/toml'

interface Props {
  initialValue?: CodexEnvironmentRecord
  treatAsNew?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: []; 'open-general': []; saved: [record: CodexEnvironmentRecord] }>()

const { t } = useI18n()
const codexStore = useCodexStore()
const { createEnvironment, updateEnvironment } = codexStore
const toast = useToast()

const isEditMode = computed(() => Boolean(props.initialValue && !props.treatAsNew))

// 表单状态
const formState = reactive({
  title: props.initialValue?.title || '',
  homepage: props.initialValue?.homepage || '',
  description: props.initialValue?.description || '',
  baseUrl: props.initialValue?.baseUrl || '',
  apiKey: props.initialValue?.apiKey || '',
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

// TOML 配置文本（不做语法校验）
const defaultToml = `# Codex 配置示例\n# 这里可以粘贴你的 TOML 配置\n`
const configToml = ref(props.initialValue?.configToml || defaultToml)

const submitting = ref(false)
const formError = ref<string>()
const codeError = ref<string | null>(null)

const handleSubmit = async () => {
  formError.value = undefined

  try {
    submitting.value = true

    // 解析 balance headers
    let balanceHeaders: Record<string, string> | undefined
    if (formState.balanceHeaders.trim()) {
      try {
        balanceHeaders = JSON.parse(formState.balanceHeaders)
      }
      catch {
        throw new Error(t('codex.form.balanceHeadersError'))
      }
    }

    const payload: any = {
      title: formState.title,
      homepage: formState.homepage || undefined,
      description: formState.description || undefined,
      baseUrl: formState.baseUrl,
      apiKey: formState.apiKey,
      configToml: configToml.value,
      writeToCommon: formState.writeToCommon,
    }

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
      payload.balanceUrl = undefined
      payload.balanceRequest = undefined
      payload.balanceJsonPath = undefined
      payload.balanceFormula = undefined
    }

    let savedRecord: CodexEnvironmentRecord
    if (isEditMode.value) {
      savedRecord = await updateEnvironment(props.initialValue!.id, payload)
      toast.add({
        title: t('codex.form.updateSuccess'),
        description: t('codex.form.environmentUpdated', { name: formState.title }),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
    else {
      savedRecord = await createEnvironment(payload)
      toast.add({
        title: t('codex.form.createSuccess'),
        description: t('codex.form.environmentCreated', { name: formState.title }),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }

    emit('saved', savedRecord)
    emit('close')
  }
  catch (error: any) {
    formError.value = error.message || t('codex.form.operationFailed')
  }
  finally {
    submitting.value = false
  }
}

defineExpose({
  submit: () => handleSubmit(),
  submitting,
  codeError,
  isEditMode,
  isSubmitting: () => submitting.value,
  hasCodeError: () => Boolean(codeError.value),
  isEdit: () => isEditMode.value,
})

const openGeneralConfig = () => {
  emit('open-general')
}

// ========== 工具：对象判断 / 深合并 / 深剔除 ==========
const isPlainObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v)
const deepMergePreferSecond = (a: any, b: any): any => {
  if (Array.isArray(a) && Array.isArray(b)) return b
  if (isPlainObject(a) && isPlainObject(b)) {
    const out: Record<string, any> = {}
    for (const k of Object.keys(b)) {
      out[k] = k in a ? deepMergePreferSecond(a[k], b[k]) : b[k]
    }
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

// ========== 将 base_url 写回 TOML ==========
const applyBaseUrl = (parsed: Record<string, any>, baseUrl: string) => {
  if (!baseUrl) return parsed
  const out = { ...parsed }
  const providers = out.model_providers
  let touched = false
  if ('base_url' in out) {
    out.base_url = baseUrl
    touched = true
  }
  if (isPlainObject(providers)) {
    Object.entries(providers).forEach(([name, prov]) => {
      if (isPlainObject(prov) && 'base_url' in (prov as any)) {
        ;(prov as any).base_url = baseUrl
        touched = true
      }
    })
  }
  if (!touched) out.base_url = baseUrl
  return out
}

// ========== 监听 baseUrl 变化，保持编辑区与输入同步 ==========
watch(
  () => formState.baseUrl,
  (url) => {
    try {
      const parsed = (TOML.parse(configToml.value || '') as any) || {}
      const next = applyBaseUrl(parsed, url)
      configToml.value = TOML.stringify(next as any)
    } catch {
      // 忽略 TOML 解析失败
    }
  }
)

// ========== 监听“写入通用配置”勾选与通用配置变化，实时合并/剔除 ==========
watch(
  [() => formState.writeToCommon, () => codexStore.generalConfig?.payload],
  () => {
    try {
      const current = (TOML.parse(configToml.value || '') as any) || {}
      const common: any = codexStore.generalConfig?.payload
        ? (TOML.parse(codexStore.generalConfig!.payload) as any)
        : {}
      let next = current
      if (formState.writeToCommon) {
        next = deepMergePreferSecond(common, current)
      } else if (common && Object.keys(common).length) {
        const pruned = deepPruneEqual(current, common)
        next = pruned === undefined ? {} : pruned
      }
      next = applyBaseUrl(next, formState.baseUrl)
      configToml.value = TOML.stringify(next as any)
    } catch {
      // 忽略 TOML 解析失败
    }
  }
)
</script>
