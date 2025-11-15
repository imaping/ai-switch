<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- 页头 -->
    <div class="mb-8">
      <p class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {{ t('claude.environment') }}
      </p>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-4xl font-bold">{{ t('claude.pageTitle') }}</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {{ t('claude.pageSubtitle') }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <NSelect
            v-model:value="selectedScope"
            class="min-w-[160px]"
            size="small"
            :options="scopeOptions"
            :placeholder="t('claude.selectScope')"
            @update:value="envScopeStore.setScope"
          />
          <NButton
            secondary
            size="small"
            @click="openGeneralModal"
          >
            {{ t('claude.generalConfigManagement') }}
          </NButton>
        </div>
      </div>
    </div>

    <!-- 环境管理卡片 -->
    <NCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">{{ t('claude.environmentManagement') }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('claude.environmentManagementDesc') }}
            </p>
          </div>
          <NButton type="primary" size="small" @click="openEnvModal()">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            {{ t('claude.add') }}
          </NButton>
        </div>
      </template>

      <NDataTable
        :data="environments"
        :columns="envColumns"
        :bordered="false"
        :single-line="false"
      />
    </NCard>

    <!-- MCP 列表卡片 -->
    <NCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">{{ t('claude.mcpList') }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('claude.mcpListDesc') }}
            </p>
          </div>
          <NButton type="primary" size="small" @click="openMcpModal()">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            {{ t('claude.add') }}
          </NButton>
        </div>
      </template>

      <NDataTable
        :data="mcpServers"
        :columns="mcpColumns"
        :bordered="false"
        :single-line="false"
      />
    </NCard>

    <!-- 环境表单模态框 -->
    <NModal v-model:show="envModalOpen">
      <NCard
        :title="editingEnv && !envFormTreatAsNew ? t('claude.editEnvironment') : t('claude.createEnvironment')"
        class="w-full sm:max-w-5xl"
        closable
        @close="closeEnvModal"
      >
        <ClaudeEnvironmentForm
          ref="envFormRef"
          :initial-value="editingEnv"
          :treat-as-new="envFormTreatAsNew"
          @open-general="openGeneralModal"
          @saved="handleAfterEnvSaved"
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
              {{ envFormRef?.isEdit?.() ? t('claude.saveChanges') : t('claude.createEnvironment') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>

    <!-- 通用配置管理 -->
    <NModal v-model:show="generalModalOpen">
      <NCard
        :title="t('claude.generalConfigManagement')"
        class="w-full sm:max-w-4xl"
        closable
        @close="closeGeneralModal"
      >
        <ClaudeGeneralConfigForm
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

    <!-- MCP 表单模态框（对齐"新增环境"布局） -->
    <NModal v-model:show="mcpModalOpen">
      <NCard
        :title="editingMcp ? t('claude.editMcp') : t('claude.addMcp')"
        class="w-full sm:max-w-3xl"
        closable
        @close="closeMcpModal"
      >
        <ClaudeMcpForm ref="mcpFormRef" :initial-value="editingMcp" @close="closeMcpModal" />

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
              {{ mcpFormRef?.isEdit?.() ? t('claude.saveChanges') : t('claude.createMcp') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>

    <!-- 删除确认对话框 -->
    <NModal v-model:show="confirmDialog.open">
      <NCard
        class="max-h-[85dvh] w-full overflow-y-auto sm:max-w-md"
        :title="confirmDialog.mode === 'env' ? t('claude.deleteEnvironment') : t('claude.deleteMcp')"
        closable
        @close="closeConfirmDialog"
      >
        <p class="mb-6 text-gray-700 dark:text-gray-300">
          {{ t('claude.deleteConfirmMessage', {
            name: confirmDialog.mode === 'env'
              ? confirmDialog.env?.title || t('claude.unnamedEnvironment')
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
            {{ t('claude.confirmDelete') }}
          </NButton>
        </div>
      </NCard>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { Add,Refresh } from '@vicons/ionicons5'
import { h, ref, watch, computed } from 'vue'
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
import type { ClaudeEnvironmentRecord, ClaudeMcpRecord } from '#shared/types/claude'

const { t } = useI18n()

definePageMeta({
  title: 'Claude 环境管理',
})

// Stores（Pinia）
import { storeToRefs } from 'pinia'
import { useClaudeStore } from '~/stores/claude'
import { useRemoteStore } from '~/stores/remote'
import { useEnvScopeStore } from '~/stores/envScope'
const claudeStore = useClaudeStore()
const envScopeStore = useEnvScopeStore()
const remoteStore = useRemoteStore()
const { environments: remoteEnvs } = storeToRefs(remoteStore)
const {
  environments,
  generalConfig,
  mcpServers,
  loading,
} = storeToRefs(claudeStore)
const {
  fetchOverview,
  activateEnvironment,
  toggleMcpServer,
  deleteEnvironment,
  deleteMcpServer,
} = claudeStore

const message = useMessage()

interface ScopeOption {
  label: string
  value: string
}

// 本地 + 远程主机列表，用于面板内环境下拉
const scopeOptions = computed<ScopeOption[]>(() => {
  const options: ScopeOption[] = [
    { label: t('claude.localEnvironment'), value: 'local' },
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

// 子表单引用（用于触发提交与读取状态）
const envFormRef = ref<any>()
const generalModalOpen = ref(false)
const generalFormRef = ref<any>()
const mcpFormRef = ref<any>()

// 状态
// 表格列（Naive UI NDataTable）
const envColumns: DataTableColumns<ClaudeEnvironmentRecord> = [
  {
    key: 'title',
    title: t('claude.name'),
    render(row) {
      return h('div', {}, [
        h(
          'p',
          { class: 'font-semibold text-gray-900 dark:text-gray-100' },
          row.title || t('claude.unnamed')
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
    title: t('claude.homepage'),
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
        t('claude.notProvided')
      )
    }
  },
  {
    key: 'enabled',
    title: t('claude.enabled'),
    render(row) {
      return h(NSwitch, {
        value: row.status === 'active',
        size: 'large',
        disabled: loading.value,
        'onUpdate:value': (val: boolean) => handleToggleEnv(row, val)
      })
    }
  },
  {
    key: 'balance',
    title: () =>
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', {}, t('claude.balance')),
        h(
          NButton,
          {
            quaternary:true,
            circle:true,
            size: 'tiny',
            type:'info',
            disabled: loading.value,
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
        return h('span', { class: 'text-sm text-gray-500 dark:text-gray-400' }, t('claude.notConfigured'))
      }
      const parts: any[] = []
      const text = typeof env.currentBalance === 'number' ? `${formatCurrency(env.currentBalance)}` : t('claude.notQueried')
      parts.push(h('span', { class: 'text-sm' }, text))

      parts.push(
        h(
          NButton,
          {
            quaternary:true,
            circle:true,
            size: 'tiny',
            type:'info',
            disabled: loading.value,
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
    title: t('claude.actions'),
    align: 'right',
    render(row) {
      return h('div', { class: 'flex justify-end gap-2' }, [
        h(
          NButton,
          {
            size: 'tiny',
            tertiary: true,
            onClick: () => openEnvModal(row)
          },
          { default: () => t('common.edit') }
        ),
        h(
          NButton,
          {
            size: 'tiny',
            tertiary: true,
            onClick: () =>
              openEnvModal(
                { ...row, title: `${row.title || ''}(副本)` } as ClaudeEnvironmentRecord,
                true
              )
          },
          { default: () => t('claude.copy') }
        ),
        h(
          NButton,
          {
            size: 'tiny',
            tertiary: true,
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

const mcpColumns: DataTableColumns<ClaudeMcpRecord> = [
  {
    key: 'name',
    title: t('claude.name'),
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
    title: t('claude.doc'),
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
        t('claude.noDocLink')
      )
    }
  },
  {
    key: 'enabled',
    title: t('claude.enabled'),
    render(row) {
      return h(NSwitch, {
        value: row.enabled,
        size: 'large',
        disabled: loading.value,
        'onUpdate:value': (val: boolean) => handleToggleMcp(row, val)
      })
    }
  },
  {
    key: 'actions',
    title: t('claude.actions'),
    align: 'right',
    render(row) {
      return h('div', { class: 'flex justify-end gap-2' }, [
        h(
          NButton,
          {
            size: 'tiny',
            tertiary: true,
            onClick: () => openMcpModal(row)
          },
          { default: () => t('common.edit') }
        ),
        h(
          NButton,
          {
            size: 'tiny',
            tertiary: true,
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

const envModalOpen = ref(false)
const editingEnv = ref<ClaudeEnvironmentRecord | undefined>()
const envFormTreatAsNew = ref(false)
const mcpModalOpen = ref(false)
const editingMcp = ref<ClaudeMcpRecord | undefined>()
const confirmDialog = ref<{
  open: boolean
  mode?: 'env' | 'mcp'
  env?: ClaudeEnvironmentRecord
  mcp?: ClaudeMcpRecord
}>({ open: false })
const confirmLoading = ref(false)

// 生命周期
onMounted(async () => {
  // 预加载远程主机列表供下拉使用
  if (!remoteEnvs.value.length) {
    remoteStore.fetchOverview().catch(() => {})
  }
  await fetchOverview()
  await handleQueryAllBalances()
})

// 监听作用域切换，自动刷新当前面板数据
watch(
  () => envScopeStore.scope,
  async () => {
    await fetchOverview()
    await handleQueryAllBalances()
  },
)

// 方法
const openEnvModal = (record?: ClaudeEnvironmentRecord, treatAsNew = false) => {
  editingEnv.value = record
  envFormTreatAsNew.value = treatAsNew
  envModalOpen.value = true
}

const closeEnvModal = () => {
  envModalOpen.value = false
  editingEnv.value = undefined
  envFormTreatAsNew.value = false
}

const openGeneralModal = () => {
  generalModalOpen.value = true
}

const closeGeneralModal = () => {
  generalModalOpen.value = false
}

const onSaveGeneral = async () => {
  await generalFormRef.value?.submit?.()
  closeGeneralModal()
}

const openMcpModal = (record?: ClaudeMcpRecord) => {
  editingMcp.value = record
  mcpModalOpen.value = true
}

const closeMcpModal = () => {
  mcpModalOpen.value = false
  editingMcp.value = undefined
}

const handleDeleteEnv = (record: ClaudeEnvironmentRecord) => {
  confirmDialog.value = {
    open: true,
    mode: 'env',
    env: record,
  }
}

const handleDeleteMcp = (record: ClaudeMcpRecord) => {
  if (record.enabled) {
    message.error(t('claude.disableMcpFirst'))
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
        t('claude.environmentDeleted', { name: confirmDialog.value.env.title || '' })
      )
    }
    else if (confirmDialog.value.mode === 'mcp' && confirmDialog.value.mcp) {
      await deleteMcpServer(confirmDialog.value.mcp.id)
      message.success(
        t('claude.mcpDeleted', {
          name: confirmDialog.value.mcp.displayName || confirmDialog.value.mcp.name
        })
      )
    }

    confirmDialog.value = { open: false }
  }
  catch (error: any) {
    message.error(error?.message || t('claude.deleteError'))
  }
  finally {
    confirmLoading.value = false
  }
}

// 方法
const handleActivateEnv = async (record: ClaudeEnvironmentRecord) => {
  try {
    await activateEnvironment(record.id)
    message.success(
      t('claude.environmentActivated', { name: record.title })
    )
  }
  catch (err: any) {
    message.error(err?.message || t('claude.activateError'))
  }
}

const handleToggleEnv = async (record: ClaudeEnvironmentRecord, next: boolean) => {
  try {
    if (next) {
      // 切到激活
      await activateEnvironment(record.id)
      message.success(
        t('claude.environmentActivated', { name: record.title })
      )
    } else {
      // 目前不支持直接禁用，提示用户
      message.info(t('claude.switchByEnabling'))
    }
  } catch (err: any) {
    message.error(err?.message || t('claude.operationError'))
  } finally {
    // 同步最新状态，确保开关回到正确位置
    await fetchOverview()
  }
}

const handleToggleMcp = async (record: ClaudeMcpRecord, next?: boolean) => {
  try {
    await toggleMcpServer(record.id, typeof next === 'boolean' ? next : !record.enabled)
    const name = record.displayName || record.name
    const statusKey = !record.enabled ? 'mcpEnabled' : 'mcpDisabled'
    message.success(t(`claude.${statusKey}`, { name }))
  }
  catch (err: any) {
    message.error(err?.message || t('claude.operationError'))
  }
}

const formatCurrency = (val: number) => {
  try {
    return `$${Number(val).toFixed(2)}`
  } catch {
    return `$${val}`
  }
}

const handleQueryBalance = async (record: ClaudeEnvironmentRecord) => {
  try {
    const res = await claudeStore.queryBalance(record.id)
    if (res.error) {
      message.error(res.error || t('claude.queryError'))
    } else {
      message.success(
        `${t('claude.balance')}: ${formatCurrency(res.balance)}`
      )
    }
  } catch (err: any) {
    message.error(err?.message || t('claude.queryError'))
  }
}

const handleAfterEnvSaved = async (record: ClaudeEnvironmentRecord) => {
  // 保存后若配置了余额接口，自动查询一次
  if (record.balanceUrl) {
    await handleQueryBalance(record)
  }
}

const handleQueryAllBalances = async () => {
  const list = environments.value.filter(e => e.balanceUrl)
  for (const env of list) {
    try {
      await claudeStore.queryBalance(env.id)
    } catch {}
  }
}
</script>
