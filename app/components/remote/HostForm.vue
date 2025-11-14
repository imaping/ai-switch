<template>
  <UForm :state="formState" @submit="handleSubmit" class="space-y-6">
    <!-- 基本信息 -->
    <div class="space-y-4">
      <UFormField  label="主机名称" name="title" required>
        <UInput
          v-model="formState.title"
          placeholder="例如: 生产服务器"
          :disabled="submitting"
          size="lg"
          class="w-full"
        />
      </UFormField >

      <UFormField  label="描述" name="description">
        <UTextarea
          v-model="formState.description"
          placeholder="关于此主机的说明"
          :rows="2"
          :disabled="submitting"
          class="w-full"
        />
      </UFormField >

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UFormField  label="主机地址" name="host" required class="md:col-span-2">
          <UInput
            v-model="formState.host"
            placeholder="example.com 或 192.168.1.100"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField >

        <UFormField  label="端口" name="port" required>
          <UInput
            v-model.number="formState.port"
            type="number"
            placeholder="22"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
        </UFormField >
      </div>

      <UFormField  label="用户名" name="username" required>
          <UInput
            v-model="formState.username"
            placeholder="root"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
      </UFormField >
    </div>

    <!-- 认证方式 -->
    <div class="space-y-4">
      <UFormField  label="认证方式" name="authType" required>
        <USelect
          class="w-full"
          v-model="formState.authType"
          :items="[
            { label: '密码认证', value: 'password' },
            { label: '密钥认证', value: 'privateKey' },
          ]"
          :disabled="submitting"
        />
      </UFormField >

      <!-- 密码认证 -->
      <UFormField 
        v-if="formState.authType === 'password'"
        label="密码"
        name="password"
        required
      >
        <UInput
          v-model="formState.password"
          type="password"
          placeholder="输入 SSH 密码"
          :disabled="submitting"
          size="lg"
          class="w-full"
        />
      </UFormField >

      <!-- 密钥认证 -->
      <template v-else>
        <UFormField  label="私钥路径" name="privateKeyPath">
          <UInput
            v-model="formState.privateKeyPath"
            placeholder="~/.ssh/id_rsa"
            :disabled="submitting"
            size="lg"
            class="w-full"
          />
          <template #help>
            <span class="text-xs text-gray-500">留空则使用私钥内容</span>
          </template>
        </UFormField >

        <UFormField  label="私钥内容" name="privateKey">
          <UTextarea
            v-model="formState.privateKey"
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
            :rows="6"
            :disabled="submitting"
            class="w-full"
          />
          <template #help>
            <span class="text-xs text-gray-500">如果提供了私钥路径,此项可留空</span>
          </template>
        </UFormField >

        <UFormField  label="密钥密码(可选)" name="passphrase">
          <UInput
            v-model="formState.passphrase"
            type="password"
            placeholder="如果私钥有密码保护"
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
    formError.value = '主机名称不能为空'
    return
  }

  if (!formState.host.trim()) {
    formError.value = '主机地址不能为空'
    return
  }

  if (!formState.username.trim()) {
    formError.value = '用户名不能为空'
    return
  }

  if (formState.authType === 'password' && !formState.password) {
    formError.value = '请输入密码'
    return
  }

  if (formState.authType === 'privateKey' && !formState.privateKeyPath && !formState.privateKey) {
    formError.value = '请提供私钥路径或私钥内容'
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
        title: '更新成功',
        description: `主机 "${formState.title}" 已更新`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
    else {
      await createEnvironment(payload)
      toast.add({
        title: '添加成功',
        description: `主机 "${formState.title}" 已添加`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }

    emit('close')
  }
  catch (error: any) {
    formError.value = error.message || '操作失败'
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
