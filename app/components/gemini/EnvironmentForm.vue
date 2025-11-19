<template>
  <NForm :model="formState" @submit.prevent="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NFormItem :label="t('gemini.form.titleLabel')" path="title" :required="true">
          <NInput
            v-model:value="formState.title"
            :placeholder="t('gemini.form.titlePlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>

        <NFormItem :label="t('gemini.form.homepageLabel')" path="homepage">
          <NInput
            v-model:value="formState.homepage"
            :placeholder="t('gemini.form.homepagePlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>
      </div>

      <NFormItem :label="t('gemini.form.descriptionLabel')" path="description">
        <NInput
          v-model:value="formState.description"
          :placeholder="t('gemini.form.descriptionPlaceholder')"
          type="textarea"
          :rows="4"
          :disabled="submitting"
          class="w-full"
        />
      </NFormItem>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NFormItem :label="t('gemini.form.baseUrlLabel')" path="baseUrl" :required="true">
          <NInput
            v-model:value="formState.baseUrl"
            :placeholder="t('gemini.form.baseUrlPlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>

        <NFormItem :label="t('gemini.form.apiKeyLabel')" path="apiKey" :required="true">
          <NInput
            v-model:value="formState.apiKey"
            type="password"
            show-password-on="click"
            :placeholder="t('gemini.form.apiKeyPlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>

      </div>
    </div>

    <!-- 结果 .env （合成结果展示） -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          {{ t('gemini.form.envPreviewTitle') }}
        </h3>
        <div class="flex items-center gap-3">
          <NCheckbox v-model:checked="formState.writeToCommon">
            {{ t('gemini.form.writeToCommon') }}
          </NCheckbox>
          <NButton quaternary type="primary" @click="openGeneralConfig">
            {{ t('gemini.generalConfigManagement') }}
          </NButton>
        </div>
      </div>

      <SharedCodeEditor
        v-model="codeConfig"
        language="text"
        height="220px"
        :validate="false"
      />
    </div>

    <!-- 余额查询配置(可选) -->
    <NCollapse
      class="flex w-full flex-col gap-2"
      :default-expanded-names="balanceExpanded ? ['balance'] : []"
      @update:expanded-names="onBalanceExpandedChange"
    >
      <NCollapseItem :title="t('gemini.form.balanceConfigTitle')" name="balance">
        <div class="space-y-4 p-4">
          <NFormItem :label="t('gemini.form.balanceUrlLabel')" path="balanceUrl">
            <NInput
              v-model:value="formState.balanceUrl"
              :placeholder="t('gemini.form.balanceUrlPlaceholder')"
              :disabled="submitting"
              size="large"
              class="w-full"
            />
          </NFormItem>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NFormItem :label="t('gemini.form.httpMethodLabel')" path="balanceMethod">
              <NSelect
                v-model:value="formState.balanceMethod"
                :options="[
                  { label: 'GET', value: 'GET' },
                  { label: 'POST', value: 'POST' }
                ]"
                :placeholder="t('gemini.form.httpMethodPlaceholder')"
                :disabled="submitting"
                class="w-full"
              />
            </NFormItem>

            <NFormItem :label="t('gemini.form.jsonPathLabel')" path="balanceJsonPath">
              <NInput
                v-model:value="formState.balanceJsonPath"
                :placeholder="t('gemini.form.jsonPathPlaceholder')"
                :disabled="submitting"
                size="large"
                class="w-full"
              />
            </NFormItem>
          </div>

          <NFormItem :label="t('gemini.form.headersLabel')" path="balanceHeaders">
            <NInput
              v-model:value="formState.balanceHeaders"
              type="textarea"
              class="w-full"
              :rows="4"
              :placeholder="t('gemini.form.headersPlaceholder')"
              :disabled="submitting"
            />
          </NFormItem>

          <NFormItem :label="t('gemini.form.bodyLabel')" path="balanceBody">
            <NInput
              v-model:value="formState.balanceBody"
              type="textarea"
              :rows="4"
              :disabled="submitting"
            />
          </NFormItem>

          <NFormItem :label="t('gemini.form.formulaLabel')" path="balanceFormula">
            <NInput
              v-model:value="formState.balanceFormula"
              :placeholder="t('gemini.form.formulaPlaceholder')"
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
  useMessage,
} from 'naive-ui'
import * as dotenv from 'dotenv' 
import type { GeminiEnvironmentRecord } from '#shared/types/gemini'

const { t } = useI18n()

interface Props {
  initialValue?: GeminiEnvironmentRecord
  treatAsNew?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  'open-general': []
  saved: [record: GeminiEnvironmentRecord]
}>()

import { useGeminiStore } from '~/stores/gemini'
const geminiStore = useGeminiStore()
const { createEnvironment, updateEnvironment } = geminiStore
const message = useMessage()

const isEditMode = computed(
  () => Boolean(props.initialValue && !props.treatAsNew),
)

// 表单状态初始化函数
const initFormState = () => ({
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

const formState = reactive(initFormState())

const defaultCodeConfig = `GOOGLE_GEMINI_BASE_URL=
GEMINI_API_KEY=`

const codeConfig = ref(
  props.initialValue?.envContent || defaultCodeConfig
)

const submitting = ref(false)
const formError = ref<string>()
const balanceExpanded = ref(false)

// 监听 initialValue 变化，重新初始化表单状态
watch(
  () => props.initialValue,
  (newValue) => {
    if (newValue) {
      Object.assign(formState, initFormState())
    }
  },
  { deep: true, immediate: false },
)

// 构造本环境核心变量 .env 片段
const buildCoreEnv = (baseUrl: string, apiKey: string, model: string) => {
  const lines: string[] = []
  if (baseUrl) lines.push(`GOOGLE_GEMINI_BASE_URL=${baseUrl}`)
  if (apiKey) lines.push(`GEMINI_API_KEY=${apiKey}`)
  if (model) lines.push(`GEMINI_MODEL=${model}`)
  return lines.join('\n')
}

// 勾选/取消写入通用配置时，实时更新  编辑框展示的结果（通用优先级最低，仅填充缺失键）
watch(
  [() => formState.writeToCommon, () => geminiStore.generalConfig?.payload],
  () => {
    try {
      const current = dotenv.parse(codeConfig.value)
      const common: any = dotenv.parse(geminiStore.generalConfig?.payload)
      let next = current
      if (formState.writeToCommon) {
        next = deepMergePreferSecond(common, current)
      } else if (common && Object.keys(common).length) {
        const pruned = deepPruneEqual(current, common)
        next = pruned === undefined ? {} : pruned
      }
      next = next || {}
      next.GOOGLE_GEMINI_BASE_URL = formState.baseUrl
      next.GEMINI_API_KEY = formState.apiKey
      codeConfig.value = objectToEnvString(next)
    }
    catch {
      // 忽略 解析错误
    }
  }
)

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


// 监听 baseUrl 和 apiKey 变化,更新 JSON
watch([() => formState.baseUrl, () => formState.apiKey], ([url, key]) => {
  try {
    const config = dotenv.parse(codeConfig.value)
    config.GOOGLE_GEMINI_BASE_URL = url
    config.GEMINI_API_KEY = key
    codeConfig.value = objectToEnvString(config)
  }
  catch {
    // 忽略 解析错误
  }
})

const objectToEnvString = (obj:Object):string=> {
   return Object.entries(obj)
    .map(([key, value]) => {
      return `${key}=${value}`;
    })
    .join('\n');
}

// 预览内容变更时，反向更新 baseUrl / apiKey（从预览 -> 字段）
watch(
  codeConfig,
  (val) => {
    const env = dotenv.parse(val || '')
    const nextBase = env.GOOGLE_GEMINI_BASE_URL || ''
    const nextKey = env.GEMINI_API_KEY || ''
    if (nextBase !== formState.baseUrl) formState.baseUrl = nextBase
    if (nextKey !== formState.apiKey) formState.apiKey = nextKey
  },
)

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
    formError.value = t('gemini.form.titleRequired')
    return
  }
  if (!formState.baseUrl.trim()) {
    formError.value = t('gemini.form.baseUrlRequired')
    return
  }
  if (!formState.apiKey.trim()) {
    formError.value = t('gemini.form.apiKeyRequired')
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
    }

    if (formState.balanceUrl?.trim()) {
      let balanceHeaders: Record<string, string> | undefined
      if (formState.balanceHeaders.trim()) {
        try {
          balanceHeaders = JSON.parse(formState.balanceHeaders)
        } catch {
          throw new Error(t('gemini.form.balanceHeadersError'))
        }
      }

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

    let savedRecord: GeminiEnvironmentRecord
    if (isEditMode.value) {
      savedRecord = await updateEnvironment(props.initialValue!.id, payload)
      message.success(
        t('gemini.form.environmentUpdated', { name: formState.title }),
      )
    } else {
      savedRecord = await createEnvironment(payload)
      message.success(
        t('gemini.form.environmentCreated', { name: formState.title }),
      )
    }

    emit('saved', savedRecord)
    emit('close')
  } catch (error: any) {
    formError.value = error.message || t('gemini.form.operationFailed')
  } finally {
    submitting.value = false
  }
}

defineExpose({
  submit: () => handleSubmit(),
  submitting,
  isEditMode,
  isSubmitting: () => submitting.value,
  hasCodeError: () => false,
  isEdit: () => isEditMode.value,
})

const openGeneralConfig = () => {
  emit('open-general')
}


</script>
