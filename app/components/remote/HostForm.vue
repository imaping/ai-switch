<template>
  <NForm :model="formState" @submit.prevent="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <NFormItem :label="t('remote.hostForm.titleLabel')" path="title" :required="true">
        <NInput
          v-model:value="formState.title"
          :placeholder="t('remote.hostForm.titlePlaceholder')"
          :disabled="submitting"
          size="large"
          class="w-full"
        />
      </NFormItem>

      <NFormItem :label="t('remote.hostForm.descriptionLabel')" path="description">
        <NInput
          v-model:value="formState.description"
          :placeholder="t('remote.hostForm.descriptionPlaceholder')"
          type="textarea"
          :rows="2"
          :disabled="submitting"
          class="w-full"
        />
      </NFormItem>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NFormItem :label="t('remote.hostForm.hostLabel')" path="host" :required="true" class="md:col-span-2">
          <NInput
            v-model:value="formState.host"
            :placeholder="t('remote.hostForm.hostPlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>

        <NFormItem :label="t('remote.hostForm.portLabel')" path="port" :required="true">
          <n-input-number
            v-model:value="formState.port"
            :placeholder="t('remote.hostForm.portPlaceholder')"
            :disabled="submitting"
            size="large"
            clearable
            class="w-full"
          />
        </NFormItem>
      </div>

      <NFormItem :label="t('remote.hostForm.usernameLabel')" path="username" :required="true">
          <NInput
            v-model:value="formState.username"
            :placeholder="t('remote.hostForm.usernamePlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
      </NFormItem>
    </div>

    <!-- 认证方式 -->
    <div class="space-y-4">
      <NFormItem :label="t('remote.hostForm.authMethodLabel')" path="authType" :required="true">
        <NSelect
          class="w-full"
          v-model:value="formState.authType"
          :options="authTypeOptions"
          :disabled="submitting"
        />
      </NFormItem>

      <!-- 密码认证 -->
      <NFormItem
        v-if="formState.authType === 'password'"
        :label="t('remote.hostForm.passwordLabel')"
        path="password"
        required
      >
        <NInput
          v-model:value="formState.password"
          type="password"
          :placeholder="t('remote.hostForm.passwordPlaceholder')"
          :disabled="submitting"
          size="large"
          class="w-full"
        />
      </NFormItem>

      <!-- 密钥认证 -->
      <template v-else>
        <NFormItem :label="t('remote.hostForm.privateKeyPathLabel')" path="privateKeyPath">
          <NInput
            v-model:value="formState.privateKeyPath"
            :placeholder="t('remote.hostForm.privateKeyPathPlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>

        <NFormItem :label="t('remote.hostForm.privateKeyContentLabel')" path="privateKey">
          <NInput
            v-model:value="formState.privateKey"
            type="textarea"
            :placeholder="t('remote.hostForm.privateKeyContentPlaceholder')"
            :rows="6"
            :disabled="submitting"
            class="w-full"
          />
        </NFormItem>

        <NFormItem :label="t('remote.hostForm.passphraseLabel')" path="passphrase">
          <NInput
            v-model:value="formState.passphrase"
            type="password"
            :placeholder="t('remote.hostForm.passphrasePlaceholder')"
            :disabled="submitting"
            size="large"
            class="w-full"
          />
        </NFormItem>
      </template>
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
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  useMessage
} from 'naive-ui'
import type { RemoteEnvironmentRecord } from '#shared/types/remote'

const { t } = useI18n()

interface Props {
  initialValue?: RemoteEnvironmentRecord
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

import { useRemoteStore } from '~/stores/remote'
const { createEnvironment, updateEnvironment } = useRemoteStore()
const message = useMessage()

const authTypeOptions = computed(() => [
  { label: t('remote.passwordAuth'), value: 'password' },
  { label: t('remote.privateKeyAuth'), value: 'privateKey' }
])

const isEditMode = computed(() => Boolean(props.initialValue))

// 表单状态
const formState = reactive({
  title: props.initialValue?.title || '',
  description: props.initialValue?.description || '',
  host: props.initialValue?.host || '',
  port: props.initialValue?.port || 22,
  username: props.initialValue?.username || '',
  authType: (props.initialValue?.auth?.type || 'password') as 'password' | 'privateKey',
  password: props.initialValue?.auth?.password || '',
  privateKeyPath: props.initialValue?.auth?.privateKeyPath || '',
  privateKey: props.initialValue?.auth?.privateKey || '',
  passphrase: props.initialValue?.auth?.passphrase || '',
})

const submitting = ref(false)
const formError = ref<string>()

const handleSubmit = async () => {
  formError.value = undefined

  // 验证
  if (!formState.title.trim()) {
    formError.value = t('remote.hostForm.titleRequired')
    return
  }

  if (!formState.host.trim()) {
    formError.value = t('remote.hostForm.hostRequired')
    return
  }

  if (!formState.username.trim()) {
    formError.value = t('remote.hostForm.usernameRequired')
    return
  }

  if (formState.authType === 'password' && !formState.password) {
    formError.value = t('remote.hostForm.passwordRequired')
    return
  }

  if (formState.authType === 'privateKey' && !formState.privateKeyPath && !formState.privateKey) {
    formError.value = t('remote.hostForm.privateKeyRequired')
    return
  }

  try {
    submitting.value = true

    const payload: any = {
      title: formState.title,
      description: formState.description || undefined,
      host: formState.host,
      port: formState.port,
      username: formState.username,
      auth: formState.authType === 'password'
        ? { type: 'password', password: formState.password }
        : {
            type: 'privateKey' as const,
            privateKeyPath: formState.privateKeyPath || undefined,
            privateKey: formState.privateKey || undefined,
            passphrase: formState.passphrase || undefined,
          },
    }

    if (isEditMode.value) {
      await updateEnvironment(props.initialValue!.id, payload)
      message.success(
        t('remote.hostForm.hostUpdated', { title: formState.title })
      )
    }
    else {
      await createEnvironment(payload)
      message.success(
        t('remote.hostForm.hostCreated', { title: formState.title })
      )
    }

    emit('close')
  }
  catch (error: any) {
    formError.value = error.message || t('remote.hostForm.operationFailed')
  }
  finally {
    submitting.value = false
  }
}

// 暴露方法给父级弹窗控制
defineExpose({
  submit: () => handleSubmit(),
  isSubmitting: () => submitting.value,
})
</script>
