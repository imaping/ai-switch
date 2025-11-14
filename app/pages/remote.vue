<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- 页头 -->
    <div class="mb-8">
      <p class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        远程主机管理
      </p>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-4xl font-bold">远程主机管理</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            通过 SSH 连接管理远程主机上的 AI 环境配置
          </p>
        </div>
      </div>
    </div>

    <!-- 远程主机列表 -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold">SSH 主机列表</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              添加、编辑或删除远程主机配置
            </p>
          </div>
          <UButton icon="i-heroicons-plus" @click="openHostModal()">
            新增
          </UButton>
        </div>
      </template>

      <div v-if="environments.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        暂无远程主机,请先添加。
      </div>
      <div v-else>
        <UTable :data="environments" :columns="hostColumns" />
      </div>
    </UCard>

    <!-- 主机表单模态框（统一布局：标题 + #body + #footer） -->
    <UModal v-model:open="hostModalOpen" :title="editingHost ? '编辑主机' : '添加主机'" :ui="{ content: 'sm:max-w-3xl w-full', footer: 'justify-end' }">
      <template #body>
        <RemoteHostForm ref="hostFormRef" :initial-value="editingHost" @close="closeHostModal" />
      </template>
      <template #footer>
        <UButton variant="outline" @click="closeHostModal">取消</UButton>
        <UButton :loading="hostFormRef?.isSubmitting?.()" @click="hostFormRef?.submit()">
          {{ editingHost ? '保存修改' : '添加主机' }}
        </UButton>
      </template>
    </UModal>

    <!-- 删除确认对话框 -->
    <UModal v-model:open="confirmDialog.open" :ui="{ content: 'sm:max-w-md w-full' }">
      <template #content>
        <UCard class="max-h-[85dvh] overflow-y-auto">
          <template #header>
            <h3 class="text-xl font-semibold">删除主机</h3>
          </template>

          <p class="mb-6 text-gray-700 dark:text-gray-300">
            确认删除 "{{ confirmDialog.host?.title || '未命名主机' }}" 吗?此操作不可恢复。
          </p>

          <div class="flex justify-end gap-3">
            <UButton
              variant="outline"
              :disabled="confirmLoading"
              @click="closeConfirmDialog"
            >
              取消
            </UButton>
            <UButton
              color="red"
              :loading="confirmLoading"
              @click="handleConfirmDelete"
            >
              确认删除
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { RemoteEnvironmentRecord } from '#shared/types/remote'

definePageMeta({
  title: '远程主机管理',
})

// Stores（Pinia）
import { storeToRefs } from 'pinia'
import { useRemoteStore } from '~/stores/remote'
const remoteStore = useRemoteStore()
const { environments } = storeToRefs(remoteStore)
const { fetchOverview, testConnection, deleteEnvironment } = remoteStore

const toast = useToast()

// 状态
// UTable 列定义（Nuxt UI v4）
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const hostColumns: TableColumn<RemoteEnvironmentRecord>[] = [
  {
    id: 'title',
    accessorKey: 'title',
    header: '名称'
  },
  {
    id: 'address',
    header: '主机地址',
    cell: ({ row }) => h('span', { class: 'text-sm font-mono' }, `${row.original.host}:${row.original.port || 22}`)
  },
  {
    accessorKey: 'username',
    header: '用户名'
  },
  {
    id: 'auth',
    header: '认证方式',
    cell: ({ row }) =>
      h(
        UBadge as any,
        {
          color: row.original.auth?.type === 'privateKey' ? 'secondary' : 'success',
          size: 'md',
        },
        {
          default: () =>
            row.original.auth?.type === 'privateKey' ? '密钥认证' : '密码认证',
        },
      )
  },
  {
    id: 'status',
    header: '测试状态',
    cell: ({ row }) => {
      const env = row.original
      if (!env.lastTestAt) {
        return h(
          'span',
          { class: 'text-sm text-gray-500 dark:text-gray-400' },
          '未测试',
        )
      }

      let color: string = 'gray'
      let label: string = '未知'

      if (env.lastTestStatus === 'ok') {
        color = 'success'
        label = '正常'
      }
      else if (env.lastTestStatus === 'timeout') {
        color = 'warning'
        label = '超时'
      }
      else if (env.lastTestStatus === 'error') {
        color = 'error'
        label = '失败'
      }

      const latencyText =
        typeof env.lastTestLatencyMs === 'number'
          ? `${env.lastTestLatencyMs}ms`
          : undefined

      return h('div', { class: 'flex items-center gap-2' }, [
        h(
          UBadge as any,
          { color, size: 'md' },
          { default: () => label },
        ),
        latencyText
          ? h(
              'span',
              { class: 'text-xs text-gray-500 dark:text-gray-400' },
              latencyText,
            )
          : null,
      ])
    }
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, '操作'),
    cell: ({ row }) => h('div', { class: 'flex gap-2 justify-end' }, [
      h(UButton as any, { size: 'xs', variant: 'ghost', icon: 'i-heroicons-arrow-path', loading: testingConnections.value[row.original.id], onClick: () => handleTestConnection(row.original.id) }, { default: () => '测试连接' }),
      h(UButton as any, { size: 'xs', variant: 'ghost', onClick: () => openHostModal(row.original) }, { default: () => '编辑' }),
      h(UButton as any, { size: 'xs', variant: 'ghost', color: 'red', disabled: testingConnections.value[row.original.id], onClick: () => handleDeleteHost(row.original) }, { default: () => '删除' })
    ])
  }
]

const testingConnections = ref<Record<string, boolean>>({})
const hostModalOpen = ref(false)
const hostFormRef = ref<any>()
const editingHost = ref<RemoteEnvironmentRecord | undefined>()
const confirmDialog = ref<{
  open: boolean
  host?: RemoteEnvironmentRecord
}>({ open: false })
const confirmLoading = ref(false)

// 生命周期
onMounted(() => {
  fetchOverview()
})

// 方法
const openHostModal = (record?: RemoteEnvironmentRecord) => {
  editingHost.value = record
  hostModalOpen.value = true
}

const closeHostModal = () => {
  hostModalOpen.value = false
  editingHost.value = undefined
}

const handleDeleteHost = (record: RemoteEnvironmentRecord) => {
  confirmDialog.value = {
    open: true,
    host: record,
  }
}

const closeConfirmDialog = () => {
  if (confirmLoading.value)
    return
  confirmDialog.value = { open: false }
}

const handleConfirmDelete = async () => {
  if (!confirmDialog.value.host)
    return

  try {
    confirmLoading.value = true
    await deleteEnvironment(confirmDialog.value.host.id)
    toast.add({
      title: '删除成功',
      description: `主机 "${confirmDialog.value.host.title}" 已删除`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    confirmDialog.value = { open: false }
  }
  catch (error: any) {
    toast.add({
      title: '删除失败',
      description: error.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
  finally {
    confirmLoading.value = false
  }
}

// 方法
const handleTestConnection = async (id: string) => {
  testingConnections.value[id] = true
  try {
    const result = await testConnection(id)
    if (result.ok) {
      toast.add({
        title: '连接成功',
        description: `延迟: ${result.latencyMs}`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
    else {
      toast.add({
        title: '连接失败',
        description: result.error,
        color: 'error',
        icon: 'i-heroicons-x-circle',
      })
    }
  }
  catch (err: any) {
    toast.add({
      title: '连接测试失败',
      description: err?.message || '连接测试失败',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
  finally {
    testingConnections.value[id] = false
  }
}
</script>
