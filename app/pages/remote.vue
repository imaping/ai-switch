<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- 页头 -->
    <div class="mb-8">
      <p class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {{ t('remote.title') }}
      </p>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-4xl font-bold">{{ t('remote.pageTitle') }}</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {{ t('remote.pageSubtitle') }}
          </p>
        </div>
      </div>
    </div>

    <!-- 远程主机列表 -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold">{{ t('remote.hostList') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('remote.hostListDesc') }}
            </p>
          </div>
          <UButton icon="i-heroicons-plus" @click="openHostModal()">
            {{ t('remote.addHost') }}
          </UButton>
        </div>
      </template>

      <div v-if="environments.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        {{ t('remote.noHosts') }}
      </div>
      <div v-else>
        <UTable :data="environments" :columns="hostColumns" />
      </div>
    </UCard>

    <!-- 主机表单模态框（统一布局：标题 + #body + #footer） -->
    <UModal v-model:open="hostModalOpen" :title="editingHost ? t('remote.editHost') : t('remote.addHostTitle')" :ui="{ content: 'sm:max-w-3xl w-full', footer: 'justify-end' }">
      <template #body>
        <RemoteHostForm ref="hostFormRef" :initial-value="editingHost" @close="closeHostModal" />
      </template>
      <template #footer>
        <UButton variant="outline" @click="closeHostModal">{{ t('common.cancel') }}</UButton>
        <UButton :loading="hostFormRef?.isSubmitting?.()" @click="hostFormRef?.submit()">
          {{ editingHost ? t('remote.saveChanges') : t('remote.addHostTitle') }}
        </UButton>
      </template>
    </UModal>

    <!-- 删除确认对话框 -->
    <UModal v-model:open="confirmDialog.open" :ui="{ content: 'sm:max-w-md w-full' }">
      <template #content>
        <UCard class="max-h-[85dvh] overflow-y-auto">
          <template #header>
            <h3 class="text-xl font-semibold">{{ t('remote.deleteHost') }}</h3>
          </template>

          <p class="mb-6 text-gray-700 dark:text-gray-300">
            {{ t('remote.deleteConfirmMessage', {
              name: confirmDialog.host?.title || t('remote.unnamedHost')
            }) }}
          </p>

          <div class="flex justify-end gap-3">
            <UButton
              variant="outline"
              :disabled="confirmLoading"
              @click="closeConfirmDialog"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              color="red"
              :loading="confirmLoading"
              @click="handleConfirmDelete"
            >
              {{ t('remote.confirmDelete') }}
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

const { t } = useI18n()

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
    header: t('remote.name')
  },
  {
    id: 'address',
    header: t('remote.address'),
    cell: ({ row }) => h('span', { class: 'text-sm font-mono' }, `${row.original.host}:${row.original.port || 22}`)
  },
  {
    accessorKey: 'username',
    header: t('remote.username')
  },
  {
    id: 'auth',
    header: t('remote.authMethod'),
    cell: ({ row }) =>
      h(
        UBadge as any,
        {
          color: row.original.auth?.type === 'privateKey' ? 'secondary' : 'success',
          size: 'md',
        },
        {
          default: () =>
            row.original.auth?.type === 'privateKey' ? t('remote.privateKeyAuth') : t('remote.passwordAuth'),
        },
      )
  },
  {
    id: 'status',
    header: t('remote.testStatus'),
    cell: ({ row }) => {
      const env = row.original
      if (!env.lastTestAt) {
        return h(
          'span',
          { class: 'text-sm text-gray-500 dark:text-gray-400' },
          t('remote.notTested'),
        )
      }

      let color: string = 'gray'
      let label: string = t('remote.statusUnknown')

      if (env.lastTestStatus === 'ok') {
        color = 'success'
        label = t('remote.statusNormal')
      }
      else if (env.lastTestStatus === 'timeout') {
        color = 'warning'
        label = t('remote.statusTimeout')
      }
      else if (env.lastTestStatus === 'error') {
        color = 'error'
        label = t('remote.statusError')
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
    header: () => h('div', { class: 'text-right' }, t('remote.actions')),
    cell: ({ row }) => h('div', { class: 'flex gap-2 justify-end' }, [
      h(UButton as any, { size: 'xs', variant: 'ghost', icon: 'i-heroicons-arrow-path', loading: testingConnections.value[row.original.id], onClick: () => handleTestConnection(row.original.id) }, { default: () => t('remote.testConnection') }),
      h(UButton as any, { size: 'xs', variant: 'ghost', onClick: () => openHostModal(row.original) }, { default: () => t('common.edit') }),
      h(UButton as any, { size: 'xs', variant: 'ghost', color: 'red', disabled: testingConnections.value[row.original.id], onClick: () => handleDeleteHost(row.original) }, { default: () => t('common.delete') })
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
      title: t('remote.deleteSuccess'),
      description: t('remote.hostDeleted', { name: confirmDialog.value.host.title }),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    confirmDialog.value = { open: false }
  }
  catch (error: any) {
    toast.add({
      title: t('remote.deleteError'),
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
        title: t('remote.testSuccess'),
        description: `${t('remote.latency')}: ${result.latencyMs}ms`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
    else {
      toast.add({
        title: t('remote.testFailed'),
        description: result.error,
        color: 'error',
        icon: 'i-heroicons-x-circle',
      })
    }
  }
  catch (err: any) {
    toast.add({
      title: t('remote.testError'),
      description: err?.message || t('remote.testError'),
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
  finally {
    testingConnections.value[id] = false
  }
}
</script>
