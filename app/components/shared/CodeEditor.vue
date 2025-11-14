<template>
  <div class="code-editor-wrapper">
    <Codemirror
      v-model="internalValue"
      :style="{ height: height }"
      :extensions="extensions"
      :autofocus="autofocus"
      :disabled="disabled"
      :indent-with-tab="true"
      :tab-size="2"
      @ready="handleReady"
      @change="handleChange"
    />
    <div v-if="error" class="mt-2">
      <UAlert color="red" variant="soft" :title="error" icon="i-heroicons-exclamation-circle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Codemirror } from 'vue-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import type { Extension } from '@codemirror/state'

interface Props {
  modelValue: string
  language?: 'json' | 'toml' | 'text'
  height?: string
  autofocus?: boolean
  disabled?: boolean
  validate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  language: 'json',
  height: '300px',
  autofocus: false,
  disabled: false,
  validate: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
  'error': [error: string | null]
}>()

const internalValue = ref(props.modelValue)
const error = ref<string | null>(null)

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== internalValue.value) {
    internalValue.value = newValue
  }
})

// 根据语言类型获取扩展
const extensions = computed<Extension[]>(() => {
  const exts: Extension[] = [oneDark]

  if (props.language === 'json') {
    exts.push(json())
  }

  return exts
})

// 验证内容
const validateContent = (value: string) => {
  if (!props.validate)
    return null

  if (props.language === 'json') {
    try {
      JSON.parse(value)
      return null
    }
    catch (err: any) {
      return `JSON 格式错误: ${err.message}`
    }
  }

  return null
}

// 处理编辑器就绪
const handleReady = () => {
  // 编辑器已准备好
}

// 处理内容变化
const handleChange = (value: string) => {
  internalValue.value = value
  emit('update:modelValue', value)
  emit('change', value)

  // 验证内容
  const validationError = validateContent(value)
  error.value = validationError
  emit('error', validationError)
}
</script>

<style scoped>
/* .code-editor-wrapper {
  @apply rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden;
}

.code-editor-wrapper :deep(.cm-editor) {
  @apply text-sm;
}

.code-editor-wrapper :deep(.cm-scroller) {
  @apply font-mono;
} */
</style>
