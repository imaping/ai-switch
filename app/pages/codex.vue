<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- 页头 -->
    <div class="mb-8">
      <p class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {{ t('codex.environment') }}
      </p>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-4xl font-bold">{{ t('codex.pageTitle') }}</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {{ t('codex.pageSubtitle') }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <NSelect
            v-model:value="selectedScope"
            class="min-w-[160px]"
            size="small"
            :options="scopeOptions"
            :placeholder="t('codex.selectScope')"
            @update:value="envScopeStore.setScope"
          />
          <NButton
            type="primary"
            size="small"
            @click="openGeneralModal"
          >
            {{ t('codex.generalConfigManagement') }}
          </NButton>
        </div>
      </div>
    </div>

    <!-- 环境管理卡片 -->
    <NCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">{{ t('codex.environmentManagement') }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('codex.environmentManagementDesc') }}
            </p>
          </div>
          <NButton type="primary" size="small" @click="openEnvModal()">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            {{ t('codex.add') }}
          </NButton>
        </div>
      </template>

      <NDataTable
        striped
        :data="environments"
        :columns="envColumns"
        :loading="tableLoading"
        :bordered="false"
      />
    </NCard>

    <!-- MCP 列表卡片 -->
    <NCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">{{ t('codex.mcpList') }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('codex.mcpListDesc') }}
            </p>
          </div>
          <NButton type="primary" size="small" @click="openMcpModal()">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            {{ t('codex.add') }}
          </NButton>
        </div>
      </template>

      <NDataTable
        striped
        :data="mcpServers"
        :columns="mcpColumns"
        :loading="tableLoading"
        :bordered="false"
      />
    </NCard>

    <!-- MCP 表单模态框（对齐"新增环境"布局） -->
    <NModal v-model:show="mcpModalOpen">
      <NCard
        :title="editingMcp ? t('codex.editMcp') : t('codex.addMcp')"
        class="w-full sm:max-w-3xl"
        closable
        @close="closeMcpModal"
      >
        <CodexMcpForm ref="mcpFormRef" :initial-value="editingMcp" @close="closeMcpModal" />

        <template #footer>
          <div class="flex justify-end gap-3">
            <NButton quaternary size="small" @click="closeMcpModal">
              {{ t('common.cancel') }}
            </NButton>
            <NButton
              type="primary"
              size="small"
              :loading="mcpFormRef?.isSubmitting?.()"
              :disabled="mcpFormRef?.hasCodeError?.()"
              @click="mcpFormRef?.submit()"
            >
              {{ mcpFormRef?.isEdit?.() ? t('codex.saveChanges') : t('codex.createMcp') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>
    <!-- 环境表单模态框 -->
    <NModal v-model:show="envModalOpen">
      <NCard
        :title="editingEnv && !envFormTreatAsNew ? t('codex.editEnvironment') : t('codex.createEnvironment')"
        class="w-full sm:max-w-5xl"
        closable
        @close="closeEnvModal"
      >
        <CodexEnvironmentForm
          ref="envFormRef"
          :initial-value="editingEnv"
          :treat-as-new="envFormTreatAsNew"
          @saved="handleAfterEnvSaved"
          @open-general="openGeneralModal"
          @close="closeEnvModal"
        />

        <template #footer>
          <div class="flex justify-end gap-3">
            <NButton quaternary size="small" @click="closeEnvModal">
              {{ t('common.cancel') }}
            </NButton>
            <NButton
              type="primary"
              size="small"
              :loading="envFormRef?.isSubmitting?.()"
              :disabled="envFormRef?.hasCodeError?.()"
              @click="envFormRef?.submit()"
            >
              {{ envFormRef?.isEdit?.() ? t('codex.saveChanges') : t('codex.createEnvironment') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>

    <!-- 通用配置管理（置于末尾以获得更高层级） -->
    <NModal v-model:show="generalModalOpen">
      <NCard
        :title="t('codex.generalConfigManagement')"
        class="w-full sm:max-w-4xl"
        closable
        @close="closeGeneralModal"
      >
        <CodexGeneralConfigForm
          ref="generalFormRef"
          :initial-value="generalConfig?.payload"
        />

        <template #footer>
          <div class="flex justify-end gap-3">
            <NButton quaternary size="small" @click="closeGeneralModal">
              {{ t('common.cancel') }}
            </NButton>
            <NButton
              type="primary"
              size="small"
              :loading="generalFormRef?.isSubmitting?.()"
              :disabled="generalFormRef?.hasCodeError?.()"
              @click="onSaveGeneral()"
            >
              {{ t('common.save') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>

    <!-- 删除确认对话框 -->
    <NModal v-model:show="confirmDialog.open">
      <NCard
        class="max-h-[85dvh] w-full overflow-y-auto sm:max-w-md"
        :title="confirmDialog.mode === 'env' ? t('codex.deleteEnvironment') : t('codex.deleteMcp')"
        closable
        @close="closeConfirmDialog"
      >
        <p class="mb-6 text-gray-700 dark:text-gray-300">
          {{ t('codex.deleteConfirmMessage', {
            name: confirmDialog.mode === 'env'
              ? confirmDialog.env?.title || t('codex.unnamedEnvironment')
              : confirmDialog.mcp?.displayName || confirmDialog.mcp?.name
          }) }}
        </p>

        <div class="flex justify-end gap-3">
          <NButton
            quaternary
            size="small"
            :disabled="confirmLoading"
            @click="closeConfirmDialog"
          >
            {{ t('common.cancel') }}
          </NButton>
          <NButton
            type="error"
            size="small"
            :loading="confirmLoading"
            @click="handleConfirmDelete"
          >
            {{ t('codex.confirmDelete') }}
          </NButton>
        </div>
      </NCard>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { h, ref, watch, computed } from 'vue'
import { Add,Refresh } from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NDataTable,
  NModal,
  NSelect,
  NSwitch,
  NIcon,
  useMessage,
  type DataTableColumns
} from 'naive-ui'
import type { CodexEnvironmentRecord, CodexMcpRecord } from '#shared/types/codex'

const { t } = useI18n()

definePageMeta({
  title: 'Codex 环境管理',
})

// Stores（Pinia）
import { storeToRefs } from 'pinia'
import { useCodexStore } from '~/stores/codex'
import { useRemoteStore } from '~/stores/remote'
import { useEnvScopeStore } from '~/stores/envScope'
const codexStore = useCodexStore()
const envScopeStore = useEnvScopeStore()
const remoteStore = useRemoteStore()
const { environments: remoteEnvs } = storeToRefs(remoteStore)
const {
  environments,
  generalConfig,
  mcpServers
} = storeToRefs(codexStore)
const { fetchOverview, activateEnvironment, toggleMcpServer, deleteEnvironment } = codexStore
const message = useMessage()

interface ScopeOption {
  label: string
  value: string
}

const scopeOptions = computed<ScopeOption[]>(() => {
  const options: ScopeOption[] = [
    { label: t('codex.localEnvironment'), value: 'local' },
  ]
  for (const env of remoteEnvs.value) {
    options.push({
      label: env.title || `${env.host}:${env.port}`,
      value: env.id,
    })
  }
  return options
})

const selectedScope = ref<string>(envScopeStore.scope)
const tableLoading = ref(false)
// 余额刷新 loading（整表 & 单行）
const balanceAllLoading = ref(false)
const balanceRowLoading = ref<Record<string, boolean>>({})
// 生命周期
onMounted(async () => {
  if (!remoteEnvs.value.length) {
    remoteStore.fetchOverview().catch(() => {})
  }
  tableLoading.value = true
  try {
    await fetchOverview()
  }
  finally {
    tableLoading.value = false
  }
  await handleQueryAllBalances()
})

// 监听作用域切换，自动刷新当前面板数据
watch(
  () => envScopeStore.scope,
  async () => {
    tableLoading.value = true
    try {
      await fetchOverview()
    }
    finally {
      tableLoading.value = false
    }
    await handleQueryAllBalances()
  },
)

// 方法
// 表格列（Naive UI NDataTable）
const envColumns: DataTableColumns<CodexEnvironmentRecord> = [
  {
    key: 'title',
    title: t('codex.name'),
    render(row) {
      return h('div', {}, [
        h(
          'p',
          { class: 'font-semibold text-gray-900 dark:text-gray-100' },
          row.title || t('codex.unnamed')
        ),
        row.description
          ? h(
              'p',
              { class: 'mt-1 text-sm text-gray-500 dark:text-gray-400' },
              row.description
            )
          : null
      ])
    }
  },
  {
    key: 'homepage',
    title: t('codex.homepage'),
    render(row) {
      if (row.homepage) {
        return h(
          'a',
          {
            href: row.homepage,
            target: '_blank',
            rel: 'noreferrer',
            class: 'text-primary hover:underline text-sm'
          },
          row.homepage
        )
      }
      return h(
        'span',
        { class: 'text-sm text-gray-500 dark:text-gray-400' },
        t('codex.notProvided')
      )
    }
  },
  {
    key: 'enabled',
    title: t('codex.enabled'),
    render(row) {
      return h(NSwitch, {
        value: row.status === 'active',
        size: 'large',
        'onUpdate:value': (val: boolean) => handleToggleEnv(row, val)
      })
    }
  },
  {
    key: 'balance',
    title: () =>
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', {}, t('codex.balance')),
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'tiny',
            type: 'info',
            loading: balanceAllLoading.value,
            disabled: balanceAllLoading.value,
            onClick: () => handleQueryAllBalances()
          },
          {
            icon: ()=> h(NIcon, null, {default:() => h(Refresh)})
          }
        )
      ]),
    render(row) {
      const env = row
      if (!env.balanceUrl) {
        return h(
          'span',
          { class: 'text-sm text-gray-500 dark:text-gray-400' },
          t('codex.notConfigured')
        )
      }
      const parts: any[] = []
      const text =
        typeof (env as any).currentBalance === 'number'
          ? `${formatCurrency((env as any).currentBalance)}`
          : t('codex.notQueried')
      parts.push(h('span', { class: 'text-sm' }, text))
      parts.push(
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'tiny',
            type: 'info',
            loading: !!balanceRowLoading.value[env.id],
            disabled: !!balanceRowLoading.value[env.id] || balanceAllLoading.value,
            onClick: () => handleQueryBalance(env)
          },
          {
            icon: ()=> h(NIcon, null, {default:() => h(Refresh)})
          }
        )
      )
      return h('div', { class: 'flex items-center gap-2' }, parts)
    }
  },
  {
    key: 'actions',
    title: t('codex.actions'),
    align: 'right',
    render(row) {
      return h('div', { class: 'flex justify-end gap-2' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            onClick: () => openEnvModal(row)
          },
          { default: () => t('common.edit') }
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            onClick: () =>
              openEnvModal(
                { ...row, title: `${row.title || ''}(副本)` } as CodexEnvironmentRecord,
                true
              )
          },
          { default: () => t('codex.copy') }
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            type: 'error',
            disabled: row.status === 'active',
            onClick: () => handleDeleteEnv(row)
          },
          { default: () => t('common.delete') }
        )
      ])
    }
  }
]

const mcpColumns: DataTableColumns<CodexMcpRecord> = [
  {
    key: 'name',
    title: t('codex.name'),
    render(row) {
      return h(
        'p',
        { class: 'font-semibold text-gray-900 dark:text-gray-100' },
        row.displayName || row.name
      )
    }
  },
  {
    key: 'doc',
    title: t('codex.doc'),
    render(row) {
      if (row.docUrl) {
        return h(
          'a',
          {
            href: row.docUrl,
            target: '_blank',
            rel: 'noreferrer',
            class: 'text-primary hover:underline text-sm'
          },
          row.docUrl
        )
      }
      return h(
        'span',
        { class: 'text-sm text-gray-500 dark:text-gray-400' },
        t('codex.noDocLink')
      )
    }
  },
  {
    key: 'enabled',
    title: t('codex.enabled'),
    render(row) {
      return h(NSwitch, {
        value: row.enabled,
        size: 'large',
        'onUpdate:value': (val: boolean) => handleToggleMcp(row, val)
      })
    }
  },
  {
    key: 'actions',
    title: t('codex.actions'),
    align: 'right',
    render(row) {
      return h('div', { class: 'flex justify-end gap-2' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            onClick: () => openMcpModal(row)
          },
          { default: () => t('common.edit') }
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            type: 'error',
            disabled: row.enabled,
            onClick: () => handleDeleteMcp(row)
          },
          { default: () => t('common.delete') }
        )
      ])
    }
  }
]

const handleToggleMcp = async (record: CodexMcpRecord, next?: boolean) => {
  try {
    await toggleMcpServer(record.id, typeof next === 'boolean' ? next : !record.enabled)
  }
  catch (err: any) {
    console.error('切换 MCP 状态失败:', err.message)
  }
}

const handleToggleEnv = async (record: CodexEnvironmentRecord, next: boolean) => {
  try {
    if (next) {
      await activateEnvironment(record.id)
      message.success(
        t('codex.environmentActivated', { name: record.title })
      )
    } else {
      // 目前不支持直接禁用
      message.info(t('codex.switchByEnabling'))
    }
  } catch (err: any) {
    message.error(err?.message || t('codex.operationError'))
  } finally {
    await fetchOverview()
  }
}

const formatCurrency = (val: number) => {
  try {
    return `$${Number(val).toFixed(2)}`
  } catch {
    return `$${val}`
  }
}

const handleQueryBalance = async (record: CodexEnvironmentRecord) => {
  balanceRowLoading.value[record.id] = true
  try {
    const res = await codexStore.queryBalance(record.id)
    if (res.error) {
      message.error(res.error || t('codex.queryError'))
    } else {
      message.success(
        `${t('codex.balance')}: ${res.balance} (${res.raw})`
      )
    }
  } catch (err: any) {
    message.error(err?.message || t('codex.queryError'))
  } finally {
    balanceRowLoading.value[record.id] = false
  }
}

const handleQueryAllBalances = async () => {
  const list = environments.value.filter(e => e.balanceUrl)
  if (!list.length) return

  balanceAllLoading.value = true
  // 批量刷新时只更新数据，不弹出多条消息
  try {
    const ids = list.map(env => env.id)
    ids.forEach(id => { balanceRowLoading.value[id] = true })
    for (const env of list) {
      try {
        await codexStore.queryBalance(env.id)
      } catch {}
    }
  } finally {
    const ids = list.map(env => env.id)
    ids.forEach(id => { balanceRowLoading.value[id] = false })
    balanceAllLoading.value = false
  }
}

const handleAfterEnvSaved = async (record: CodexEnvironmentRecord) => {
  if (record.balanceUrl) {
    await handleQueryBalance(record)
  }
}

// 删除确认对话框
const confirmDialog = ref<{
  open: boolean
  mode?: 'env' | 'mcp'
  env?: CodexEnvironmentRecord
  mcp?: CodexMcpRecord
}>({ open: false })
const confirmLoading = ref(false)

// 通用配置管理
const generalModalOpen = ref(false)
const generalFormRef = ref<any>()
const openGeneralModal = () => { generalModalOpen.value = true }
const closeGeneralModal = () => { generalModalOpen.value = false }
const onSaveGeneral = async () => {
  await generalFormRef.value?.submit?.()
  closeGeneralModal()
}

// MCP 对话框
const mcpModalOpen = ref(false)
const editingMcp = ref<CodexMcpRecord | undefined>()
const mcpFormRef = ref<any>()
const openMcpModal = (record?: CodexMcpRecord) => {
  editingMcp.value = record
  mcpModalOpen.value = true
}
const closeMcpModal = () => {
  mcpModalOpen.value = false
  editingMcp.value = undefined
}

// 新增/编辑环境对话框
const envModalOpen = ref(false)
const envFormRef = ref<any>()
const editingEnv = ref<CodexEnvironmentRecord | undefined>()
const envFormTreatAsNew = ref(false)

const openEnvModal = (record?: CodexEnvironmentRecord, treatAsNew = false) => {
  editingEnv.value = record
  envFormTreatAsNew.value = treatAsNew
  envModalOpen.value = true
}

const closeEnvModal = () => {
  envModalOpen.value = false
  editingEnv.value = undefined
  envFormTreatAsNew.value = false
}

const handleDeleteEnv = (record: CodexEnvironmentRecord) => {
  confirmDialog.value = {
    open: true,
    mode: 'env',
    env: record,
  }
}

const handleDeleteMcp = (record: CodexMcpRecord) => {
  if (record.enabled) {
    message.error(t('codex.disableMcpFirst'))
    return
  }
  confirmDialog.value = {
    open: true,
    mode: 'mcp',
    mcp: record,
  }
}

const closeConfirmDialog = () => {
  if (confirmLoading.value)
    return
  confirmDialog.value = { open: false }
}

const handleConfirmDelete = async () => {
  if (!confirmDialog.value.mode)
    return

  try {
    confirmLoading.value = true

    if (confirmDialog.value.mode === 'env' && confirmDialog.value.env) {
      await deleteEnvironment(confirmDialog.value.env.id)
      message.success(
        t('codex.environmentDeleted', { name: confirmDialog.value.env.title || '' })
      )
    }
    else if (confirmDialog.value.mode === 'mcp' && confirmDialog.value.mcp) {
      await codexStore.deleteMcpServer(confirmDialog.value.mcp.id)
      message.success(
        t('codex.mcpDeleted', {
          name: confirmDialog.value.mcp.displayName || confirmDialog.value.mcp.name
        })
      )
    }

    confirmDialog.value = { open: false }
  }
  catch (error: any) {
    message.error(error?.message || t('codex.deleteError'))
  }
  finally {
    confirmLoading.value = false
  }
}
</script>
