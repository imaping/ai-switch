<template>
  <UForm :state="formState" @submit="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <UFormField  :label="t('remote.hostForm.titleLabel')" name="title" required>
        <UInput
          v-model="formState.title"
          :placeholder="t('remote.hostForm.titlePlaceholder')"
          :disabled="submitting"
          size="lg"
          class="w-full"
        />
      </UFormField >

      <UFormField  :label="t('remote.hostForm.descriptionLabel')" name="description">
        <UTextarea
          v-model="formState.description"
          :placeholder="t('remote.hostForm.descriptionPlaceholder')"
          :rows="2"
          :disabled="submitting"
          class="w-full"
        />
      </UFormField >

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UFormField  :label="t('remote.hostForm.hostLabel')" name="host" required class="md:col-span-2">
          <UInput
            v-model="formState.host"
            :placeholder="t('remote.hostForm.hostPlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField >

        <UFormField  :label="t('remote.hostForm.portLabel')" name="port" required>
          <UInput
            v-model.number="formState.port"
            type="number"
            :placeholder="t('remote.hostForm.portPlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField >
      </div>

      <UFormField  :label="t('remote.hostForm.usernameLabel')" name="username" required>
          <UInput
            v-model="formState.username"
            :placeholder="t('remote.hostForm.usernamePlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
      </UFormField >
    </div>

    <!-- 认证方式 -->
    <div class="space-y-4">
      <UFormField  :label="t('remote.hostForm.authMethodLabel')" name="authType" required>
        <USelect
          class="w-full"
          v-model="formState.authType"
          :items="[
            { label: t('remote.passwordAuth'), value: 'password' },
            { label: t('remote.privateKeyAuth'), value: 'privateKey' },
          ]"
          :disabled="submitting"
        />
      </UFormField >

      <!-- 密码认证 -->
      <UFormField
        v-if="formState.authType === 'password'"
        :label="t('remote.hostForm.passwordLabel')"
        name="password"
        required
      >
        <UInput
          v-model="formState.password"
          type="password"
          :placeholder="t('remote.hostForm.passwordPlaceholder')"
          :disabled="submitting"
          size="lg"
          class="w-full"
        />
      </UFormField >

      <!-- 密钥认证 -->
      <template v-else>
        <UFormField  :label="t('remote.hostForm.privateKeyPathLabel')" name="privateKeyPath">
          <UInput
            v-model="formState.privateKeyPath"
            :placeholder="t('remote.hostForm.privateKeyPathPlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField >

        <UFormField  :label="t('remote.hostForm.privateKeyContentLabel')" name="privateKey">
          <UTextarea
            v-model="formState.privateKey"
            :placeholder="t('remote.hostForm.privateKeyContentPlaceholder')"
            :rows="6"
            :disabled="submitting"
            class="w-full"
          />
        </UFormField >

        <UFormField  :label="t('remote.hostForm.passphraseLabel')" name="passphrase">
          <UInput
            v-model="formState.passphrase"
            type="password"
            :placeholder="t('remote.hostForm.passphrasePlaceholder')"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField >
      </template>
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
const toast = useToast()

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
      toast.add({
        title: t('remote.hostForm.updateSuccess'),
        description: t('remote.hostForm.hostUpdated', { title: formState.title }),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
    else {
      await createEnvironment(payload)
      toast.add({
        title: t('remote.hostForm.createSuccess'),
        description: t('remote.hostForm.hostCreated', { title: formState.title }),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
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
