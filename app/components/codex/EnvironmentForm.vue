<template>
  <NForm :model="formState" @submit.prevent="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NFormItem :label="t('codex.form.titleLabel')" path="title" :required="true">
          <NInput
            v-model="formState.title"
            :placeholder="t('codex.form.titlePlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>

        <NFormItem :label="t('codex.form.homepageLabel')" path="homepage">
          <NInput
            v-model="formState.homepage"
            type="url"
            :placeholder="t('codex.form.homepagePlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>
      </div>

      <NFormItem :label="t('codex.form.descriptionLabel')" path="description">
        <NInput
          v-model="formState.description"
          :placeholder="t('codex.form.descriptionPlaceholder')"
          type="textarea"
          :rows="4"
          :disabled="submitting"
          class="w-full"
        />
      </NFormItem>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NFormItem label="Base URL" path="baseUrl" :required="true">
          <NInput
            v-model="formState.baseUrl"
            placeholder="https://api.openai.com"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>

        <NFormItem :label="t('codex.form.apiKeyLabel')" path="apiKey" :required="true">
          <NInput
            v-model="formState.apiKey"
            type="password"
            :placeholder="t('codex.form.apiKeyPlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>
      </div>
    </div>

    <!-- Codex 配置（TOML） -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">{{ t('codex.form.codeConfigTitle') }} (TOML)</h3>
        <div class="flex items-center gap-3">
          <NCheckbox v-model="formState.writeToCommon" :disabled="submitting">
            {{ t('codex.form.writeToCommon') }}
          </NCheckbox>
          <NButton quaternary size="tiny" @click="openGeneralConfig">
            <span class="i-heroicons-cog-6-tooth mr-1 inline-block h-4 w-4" />
            {{ t('codex.generalConfigManagement') }}
          </NButton>
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
    <NCollapse
      class="flex w-full flex-col gap-2"
      :default-expanded-names="balanceExpanded ? ['balance'] : []"
      @update:expanded-names="onBalanceExpandedChange"
    >
      <NCollapseItem :title="t('codex.form.balanceConfigTitle')" name="balance">
        <div class="space-y-4 p-4">
          <NFormItem :label="t('codex.form.balanceUrlLabel')" path="balanceUrl">
            <NInput
              v-model="formState.balanceUrl"
              :placeholder="t('codex.form.balanceUrlPlaceholder')"
              :disabled="submitting"
              size="large"
              class="w-full"
            />
          </NFormItem>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NFormItem :label="t('codex.form.httpMethodLabel')" path="balanceMethod">
              <NSelect
                v-model="formState.balanceMethod"
                :options="[
                  { label: 'GET', value: 'GET' },
                  { label: 'POST', value: 'POST' }
                ]"
                :placeholder="t('codex.form.httpMethodPlaceholder')"
                :disabled="submitting"
                class="w-full"
              />
            </NFormItem>

            <NFormItem :label="t('codex.form.jsonPathLabel')" path="balanceJsonPath">
              <NInput
                v-model="formState.balanceJsonPath"
                :placeholder="t('codex.form.jsonPathPlaceholder')"
                :disabled="submitting"
                size="large"
                class="w-full"
              />
            </NFormItem>
          </div>

          <NFormItem :label="t('codex.form.headersLabel')" path="balanceHeaders">
            <NInput
              v-model="formState.balanceHeaders"
              type="textarea"
              class="w-full"
              :rows="4"
              :placeholder="t('codex.form.headersPlaceholder')"
              :disabled="submitting"
            />
          </NFormItem>

          <NFormItem :label="t('codex.form.bodyLabel')" path="balanceBody">
            <NInput
              v-model="formState.balanceBody"
              type="textarea"
              :rows="4"
              :disabled="submitting"
            />
          </NFormItem>

          <NFormItem :label="t('codex.form.formulaLabel')" path="balanceFormula">
            <NInput
              v-model="formState.balanceFormula"
              :placeholder="t('codex.form.formulaPlaceholder')"
              :disabled="submitting"
              size="large"
              class="w-full"
            />
          </NFormItem>
        </div>
      </NCollapseItem>
    </NCollapse>

    <!-- 错误提示 -->
    <NAlert
      v-if="formError"
      type="error"
      :show-icon="true"
    >
      {{ formError }}
    </NAlert>

    <!-- 操作按钮已移至父级弹窗 footer -->
  </NForm>
</template>

<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCheckbox,
  NCollapse,
  NCollapseItem,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  useMessage
} from 'naive-ui'
import type { CodexEnvironmentRecord } from '#shared/types/codex'
import TOML from '@iarna/toml'

const { t } = useI18n()

interface Props {
  initialValue?: CodexEnvironmentRecord
  treatAsNew?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  'open-general': []
  saved: [record: CodexEnvironmentRecord]
}>()

import { useCodexStore } from '~/stores/codex'
const codexStore = useCodexStore()
const { createEnvironment, updateEnvironment } = codexStore
const message = useMessage()

const isEditMode = computed(
  () => Boolean(props.initialValue && !props.treatAsNew)
)

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
  balanceFormula: props.initialValue?.balanceFormula || ''
})

const defaultConfig = props.initialValue?.tomlConfig || ''
const configToml = ref<string>(defaultConfig)
const submitting = ref(false)
const formError = ref<string>()
const codeError = ref<string | null>(null)
const balanceExpanded = ref(false)

const onBalanceExpandedChange = (names: string[] | string | null) => {
  if (Array.isArray(names)) {
    balanceExpanded.value = names.includes('balance')
  } else {
    balanceExpanded.value = names === 'balance'
  }
}

const handleSubmit = async () => {
  formError.value = undefined

  if (!formState.title.trim()) {
    formError.value = t('codex.form.titleRequired')
    return
  }

  if (!formState.baseUrl.trim()) {
    formError.value = t('codex.form.baseUrlRequired')
    return
  }

  if (!configToml.value.trim()) {
    formError.value = t('codex.form.fixTomlError')
    return
  }

  try {
    submitting.value = true

    const payload: any = {
      title: formState.title,
      homepage: formState.homepage || undefined,
      description: formState.description || undefined,
      baseUrl: formState.baseUrl,
      apiKey: formState.apiKey,
      writeToCommon: formState.writeToCommon,
      tomlConfig: configToml.value
    }

    if (formState.balanceUrl?.trim()) {
      let balanceHeaders: Record<string, string> | undefined
      if (formState.balanceHeaders.trim()) {
        try {
          balanceHeaders = JSON.parse(formState.balanceHeaders)
        } catch {
          throw new Error(t('codex.form.balanceHeadersError'))
        }
      }

      payload.balanceUrl = formState.balanceUrl
      payload.balanceRequest = {
        method: formState.balanceMethod || undefined,
        headers: balanceHeaders,
        body: formState.balanceBody || undefined
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
      message.success(
        t('codex.form.environmentUpdated', { name: formState.title })
      )
    } else {
      savedRecord = await createEnvironment(payload)
      message.success(
        t('codex.form.environmentCreated', { name: formState.title })
      )
    }

    emit('saved', savedRecord)
    emit('close')
  } catch (error: any) {
    formError.value = error.message || t('codex.form.operationFailed')
  } finally {
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
  isEdit: () => isEditMode.value
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

