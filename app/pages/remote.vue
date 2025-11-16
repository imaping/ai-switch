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
    <NCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">
              {{ t('remote.hostList') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('remote.hostListDesc') }}
            </p>
          </div>
          <NButton type="primary" size="small" @click="openHostModal()">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            {{ t('remote.addHost') }}
          </NButton>
        </div>
      </template>

      <NDataTable
        striped
        :data="environments"
        :columns="hostColumns"
        :loading="hostTableLoading"
        :bordered="false"
        />
    </NCard>

    <!-- 主机表单模态框 -->
    <NModal v-model:show="hostModalOpen">
      <NCard
        :title="editingHost ? t('remote.editHost') : t('remote.addHostTitle')"
        class="w-full sm:max-w-3xl"
        closable
        @close="closeHostModal"
      >
        <RemoteHostForm ref="hostFormRef" :initial-value="editingHost" @close="closeHostModal" />

        <template #footer>
          <div class="flex justify-end gap-3">
            <NButton quaternary size="small" @click="closeHostModal">
              {{ t('common.cancel') }}
            </NButton>
            <NButton
              type="primary"
              size="small"
              :loading="hostFormRef?.isSubmitting?.()"
              @click="hostFormRef?.submit()"
            >
              {{ editingHost ? t('remote.saveChanges') : t('remote.addHostTitle') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NModal,
  NTag,
  NIcon,
  NPopconfirm,
  useMessage,
  type DataTableColumns
} from 'naive-ui'
import { Add } from '@vicons/ionicons5'
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

const message = useMessage()
const hostTableLoading = ref(false)

// 状态 & 表格列（Naive UI NDataTable）
const hostColumns: DataTableColumns<RemoteEnvironmentRecord> = [
  {
    key: 'title',
    title: t('remote.name')
  },
  {
    key: 'address',
    title: t('remote.address'),
    render(row) {
      return h(
        'span',
        { class: 'text-sm font-mono' },
        `${row.host}:${row.port || 22}`
      )
    }
  },
  {
    key: 'username',
    title: t('remote.username')
  },
  {
    key: 'auth',
    title: t('remote.authMethod'),
    render(row) {
      const isPrivateKey = row.auth?.type === 'privateKey'
      const type = isPrivateKey ? 'info' : 'success'
      const label = isPrivateKey ? t('remote.privateKeyAuth') : t('remote.passwordAuth')

      return h(
        NTag,
        { type, size: 'small', bordered:false },
        { default: () => label }
      )
    }
  },
  {
    key: 'status',
    title: t('remote.testStatus'),
    render(row) {
      const env = row
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
          NTag,
          { type: color as any, size: 'small', bordered:false },
          { default: () => label }
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
    key: 'actions',
    title: t('remote.actions'),
    align: 'right',
    render(row) {
      return h('div', { class: 'flex justify-end gap-2' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            loading: testingConnections.value[row.id],
            onClick: () => handleTestConnection(row.id)
          },
          { default: () => t('remote.testConnection') }
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            onClick: () => openHostModal(row)
          },
          { default: () => t('common.edit') }
        ),
        h(
          NPopconfirm,
          {
            positiveText: t('remote.confirmDelete'),
            negativeText: t('common.cancel'),
            disabled: testingConnections.value[row.id],
            onPositiveClick: () => handleDeleteHost(row)
          },
          {
            default: () =>
              t('remote.deleteConfirmMessage', {
                name: row.title || t('remote.unnamedHost')
              }),
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  focusable: false,
                  type: 'error',
                  disabled: testingConnections.value[row.id]
                },
                { default: () => t('common.delete') }
              )
          }
        )
      ])
    }
  }
]

const testingConnections = ref<Record<string, boolean>>({})
const hostModalOpen = ref(false)
const hostFormRef = ref<any>()
const editingHost = ref<RemoteEnvironmentRecord | undefined>()

// 生命周期
onMounted(async () => {
  hostTableLoading.value = true
  try {
    await fetchOverview()
  }
  finally {
    hostTableLoading.value = false
  }
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

const handleDeleteHost = async (record: RemoteEnvironmentRecord) => {
  try {
    await deleteEnvironment(record.id)
    message.success(
      t('remote.hostDeleted', { name: record.title || '' })
    )
  }
  catch (error: any) {
    message.error(error?.message || t('remote.deleteError'))
  }
}

// 方法
const handleTestConnection = async (id: string) => {
  testingConnections.value[id] = true
  try {
    const result = await testConnection(id)
    if (result.ok) {
      message.success(
        `${t('remote.testSuccess')} (${t('remote.latency')}: ${result.latencyMs}ms)`
      )
    }
    else {
      message.error(result.error || t('remote.testFailed'))
    }
  }
  catch (err: any) {
    message.error(err?.message || t('remote.testError'))
  }
  finally {
    testingConnections.value[id] = false
  }
}
</script>
