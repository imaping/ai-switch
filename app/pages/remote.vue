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

    <!-- 环境类型标签页 -->
    <NTabs v-model:value="activeTab" type="segment" class="mb-6">
      <NTabPane name="ssh" tab="SSH 远程主机">
        <template #tab>
          <div class="flex items-center gap-2">
            <span>🖥️</span>
            <span>SSH 远程主机</span>
          </div>
        </template>
      </NTabPane>
      <NTabPane name="wsl" tab="WSL 环境">
        <template #tab>
          <div class="flex items-center gap-2">
            <span>💻</span>
            <span>WSL 环境</span>
          </div>
        </template>
      </NTabPane>
    </NTabs>

    <!-- SSH 远程主机列表 -->
    <div v-if="activeTab === 'ssh'">
      <NCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold">
                {{ t('remote.sshHostList') }}
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ t('remote.sshHostListDesc') }}
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
          :data="sshEnvironments"
          :columns="hostColumns"
          :loading="hostTableLoading"
          :bordered="false"
        />
      </NCard>
    </div>

    <!-- WSL 环境管理 -->
    <div v-if="activeTab === 'wsl'">
      <!-- WSL 可用性检查 -->
      <NAlert v-if="!wslAvailable && !wslLoading" type="warning" class="mb-6">
        <div>
          <p class="font-semibold">⚠️ WSL 未安装或不可用</p>
          <p class="text-sm mt-1">
            请确保已安装 WSL 2 并设置了默认分发版。
            <a
              href="https://docs.microsoft.com/zh-cn/windows/wsl/install"
              target="_blank"
              class="text-primary underline"
            >
              查看安装指南
            </a>
          </p>
        </div>
      </NAlert>

      <!-- WSL 分发版发现 -->
      <NCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold">发现 WSL 分发版</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                自动扫描并添加 WSL 分发版到管理列表
              </p>
            </div>
            <NButton
              type="primary"
              size="small"
              :loading="wslLoading"
              @click="handleDiscoverWsl"
            >
              🔍 扫描 WSL 分发版
            </NButton>
          </div>
        </template>

        <div v-if="wslDistros.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RemoteWslDistroCard
            v-for="distro in wslDistros"
            :key="distro.name"
            :distro="distro"
            @added="handleWslAdded"
          />
        </div>
        <div v-else-if="!wslLoading" class="text-center py-8 text-gray-500 dark:text-gray-400">
          <div class="text-5xl mb-2 opacity-50">📭</div>
          <p>未发现 WSL 分发版</p>
          <p class="text-sm mt-1">点击上方按钮扫描 WSL 分发版</p>
        </div>
      </NCard>

      <!-- WSL 环境列表 -->
      <NCard>
        <template #header>
          <div>
            <h2 class="text-xl font-semibold">WSL 环境列表</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              已添加到管理的 WSL 环境
            </p>
          </div>
        </template>

        <NDataTable
          striped
          :data="wslEnvironments"
          :columns="wslColumns"
          :loading="hostTableLoading"
          :bordered="false"
        />
      </NCard>
    </div>

    <!-- SSH 主机表单模态框 -->
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
  NAlert,
  NTabs,
  NTabPane,
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
const { environments, wslAvailable, wslDistros, wslLoading } = storeToRefs(remoteStore)
const {
  fetchOverview,
  testConnection,
  deleteEnvironment,
  checkWslAvailable,
  discoverWslDistros
} = remoteStore

const message = useMessage()
const hostTableLoading = ref(false)

// 标签页
const activeTab = ref<'ssh' | 'wsl'>('ssh')

// 计算属性：分离 SSH 和 WSL 环境
const sshEnvironments = computed(() =>
  // 向后兼容：没有 type 字段的环境视为 SSH 环境
  environments.value.filter(env => !env.type || env.type === 'ssh')
)

const wslEnvironments = computed(() =>
  environments.value.filter(env => env.type === 'wsl')
)

// SSH 主机表格列
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
        { type, size: 'small', bordered: false },
        { default: () => label }
      )
    }
  },
  {
    key: 'status',
    title: t('remote.testStatus'),
    render(row) {
      return renderTestStatus(row)
    }
  },
  {
    key: 'actions',
    title: t('remote.actions'),
    align: 'right',
    render(row) {
      return renderActions(row)
    }
  }
]

// WSL 环境表格列
const wslColumns: DataTableColumns<RemoteEnvironmentRecord> = [
  {
    key: 'title',
    title: '名称'
  },
  {
    key: 'distro',
    title: 'WSL 分发版',
    render(row) {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(
          'span',
          { class: 'text-sm font-mono' },
          row.wslConfig?.distroName || '-'
        ),
        row.wslConfig?.isDefault
          ? h(
              NTag,
              { type: 'primary', size: 'small', bordered: false },
              { default: () => '默认' }
            )
          : null
      ])
    }
  },
  {
    key: 'version',
    title: 'WSL 版本',
    render(row) {
      return h(
        NTag,
        { type: 'info', size: 'small', bordered: false },
        { default: () => `WSL ${row.wslConfig?.wslVersion || '-'}` }
      )
    }
  },
  {
    key: 'state',
    title: '状态',
    render(row) {
      const state = row.wslConfig?.state
      const color = state === 'Running' ? 'success' : 'default'
      return h(
        NTag,
        { type: color as any, size: 'small', bordered: false },
        { default: () => state || '-' }
      )
    }
  },
  {
    key: 'testStatus',
    title: '连接测试',
    render(row) {
      return renderTestStatus(row)
    }
  },
  {
    key: 'actions',
    title: '操作',
    align: 'right',
    render(row) {
      return renderActions(row)
    }
  }
]

// 渲染测试状态
function renderTestStatus(row: RemoteEnvironmentRecord) {
  const env = row
  if (!env.lastTestAt) {
    return h(
      'span',
      { class: 'text-sm text-gray-500 dark:text-gray-400' },
      t('remote.notTested')
    )
  }

  let color: string = 'gray'
  let label: string = t('remote.statusUnknown')

  if (env.lastTestStatus === 'ok') {
    color = 'success'
    label = t('remote.statusNormal')
  } else if (env.lastTestStatus === 'timeout') {
    color = 'warning'
    label = t('remote.statusTimeout')
  } else if (env.lastTestStatus === 'error') {
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
      { type: color as any, size: 'small', bordered: false },
      { default: () => label }
    ),
    latencyText
      ? h(
          'span',
          { class: 'text-xs text-gray-500 dark:text-gray-400' },
          latencyText
        )
      : null
  ])
}

// 渲染操作按钮
function renderActions(row: RemoteEnvironmentRecord) {
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
    row.type === 'ssh'
      ? h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            onClick: () => openHostModal(row)
          },
          { default: () => t('common.edit') }
        )
      : null,
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

const testingConnections = ref<Record<string, boolean>>({})
const hostModalOpen = ref(false)
const hostFormRef = ref<any>()
const editingHost = ref<RemoteEnvironmentRecord | undefined>()

// 生命周期
onMounted(async () => {
  hostTableLoading.value = true
  try {
    await fetchOverview()
    // 检查 WSL 可用性
    await checkWslAvailable()
  } finally {
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
  } catch (error: any) {
    message.error(error?.message || t('remote.deleteError'))
  }
}

const handleTestConnection = async (id: string) => {
  testingConnections.value[id] = true
  try {
    const result = await testConnection(id)
    if (result.ok) {
      message.success(
        `${t('remote.testSuccess')} (${t('remote.latency')}: ${result.latencyMs}ms)`
      )
    } else {
      message.error(result.error || t('remote.testFailed'))
    }
  } catch (err: any) {
    message.error(err?.message || t('remote.testError'))
  } finally {
    testingConnections.value[id] = false
  }
}

// WSL 相关方法
const handleDiscoverWsl = async () => {
  try {
    console.log('开始扫描 WSL 分发版...')
    const distros = await discoverWslDistros()
    console.log('扫描结果:', distros)
    console.log('wslDistros.value:', wslDistros.value)

    if (wslDistros.value.length > 0) {
      message.success(`发现 ${wslDistros.value.length} 个 WSL 分发版`)
    } else {
      message.warning('未发现 WSL 分发版')
    }
  } catch (error: any) {
    console.error('扫描 WSL 失败:', error)
    message.error(error?.message || '发现 WSL 分发版失败')
  }
}

const handleWslAdded = (distroName: string) => {
  message.success(`WSL 环境 ${distroName} 已添加`)
}
</script>
