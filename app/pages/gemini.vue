<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- 页头 -->
    <div class="mb-8">
      <p class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {{ t('gemini.environment') }}
      </p>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-4xl font-bold">{{ t('gemini.pageTitle') }}</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {{ t('gemini.pageSubtitle') }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <NSelect
            v-model:value="selectedScope"
            class="min-w-[160px]"
            size="small"
            :options="scopeOptions"
            :placeholder="t('gemini.selectScope')"
            @update:value="envScopeStore.setScope"
          />
          <NButton
            type="primary"
            size="small"
            @click="openGeneralModal"
          >
            {{ t('gemini.generalConfigManagement') }}
          </NButton>
        </div>
      </div>
    </div>

    <!-- 环境管理卡片 -->
    <NCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">{{ t('gemini.environmentManagement') }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('gemini.environmentManagementDesc') }}
            </p>
          </div>
          <NButton type="primary" size="small" @click="openEnvModal()">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            {{ t('gemini.add') }}
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
            <h2 class="text-xl font-semibold">{{ t('gemini.mcpList') }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('gemini.mcpListDesc') }}
            </p>
          </div>
          <NButton type="primary" size="small" @click="openMcpModal()">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            {{ t('gemini.add') }}
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

    <!-- MCP 表单模态框 -->
    <NModal v-model:show="mcpModalOpen">
      <NCard
        :title="editingMcp ? t('gemini.editMcp') : t('gemini.addMcp')"
        class="w-full sm:max-w-3xl"
        closable
        @close="closeMcpModal"
      >
        <GeminiMcpForm ref="mcpFormRef" :initial-value="editingMcp" @close="closeMcpModal" />

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
              {{ mcpFormRef?.isEdit?.() ? t('gemini.saveChanges') : t('gemini.createMcp') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>

    <!-- 环境表单模态框 -->
    <NModal v-model:show="envModalOpen">
      <NCard
        :title="editingEnv && !envFormTreatAsNew ? t('gemini.editEnvironment') : t('gemini.createEnvironment')"
        class="w-full sm:max-w-5xl"
        closable
        @close="closeEnvModal"
      >
        <GeminiEnvironmentForm
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
              {{ envFormRef?.isEdit?.() ? t('gemini.saveChanges') : t('gemini.createEnvironment') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>

    <!-- 通用配置管理 -->
    <NModal v-model:show="generalModalOpen">
      <NCard
        :title="t('gemini.generalConfigManagement')"
        class="w-full sm:max-w-4xl"
        closable
        @close="closeGeneralModal"
      >
        <GeminiGeneralConfigForm
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
  </div>
</template>

<script setup lang="ts">
import { h, ref, watch, computed, onMounted } from 'vue'
import { Add, Refresh } from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NDataTable,
  NModal,
  NSelect,
  NSwitch,
  NIcon,
  NPopconfirm,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import type { GeminiEnvironmentRecord, GeminiMcpRecord } from '#shared/types/gemini'
import { storeToRefs } from 'pinia'
import { useGeminiStore } from '~/stores/gemini'
import { useRemoteStore } from '~/stores/remote'
import { useEnvScopeStore } from '~/stores/envScope'
import GeminiEnvironmentForm from '~/components/gemini/EnvironmentForm.vue'
import GeminiMcpForm from '~/components/gemini/McpForm.vue'
import GeminiGeneralConfigForm from '~/components/gemini/GeneralConfigForm.vue'

const { t } = useI18n()

definePageMeta({
  title: 'Gemini 环境管理',
})

// Stores（Pinia）
const geminiStore = useGeminiStore()
const envScopeStore = useEnvScopeStore()
const remoteStore = useRemoteStore()
const { environments: remoteEnvs } = storeToRefs(remoteStore)
const {
  environments,
  generalConfig,
  mcpServers,
} = storeToRefs(geminiStore)
const {
  fetchOverview,
  activateEnvironment,
  toggleMcpServer,
  deleteEnvironment,
} = geminiStore
const message = useMessage()

interface ScopeOption {
  label: string
  value: string
}

const scopeOptions = computed<ScopeOption[]>(() => {
  const options: ScopeOption[] = [
    { label: t('gemini.localEnvironment'), value: 'local' },
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
  } finally {
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
    } finally {
      tableLoading.value = false
    }
    await handleQueryAllBalances()
  },
)

// 表格列（环境）
const envColumns: DataTableColumns<GeminiEnvironmentRecord> = [
  {
    key: 'title',
    title: t('gemini.name'),
    render(row) {
      return h('div', {}, [
        h(
          'p',
          { class: 'font-semibold text-gray-900 dark:text-gray-100' },
          row.title || t('gemini.unnamed'),
        ),
        row.description
          ? h(
              'p',
              { class: 'mt-1 text-sm text-gray-500 dark:text-gray-400' },
              row.description,
            )
          : null,
      ])
    },
  },
  {
    key: 'homepage',
    title: t('gemini.homepage'),
    render(row) {
      if (row.homepage) {
        return h(
          'a',
          {
            href: row.homepage,
            target: '_blank',
            rel: 'noreferrer',
            class: 'text-primary hover:underline text-sm',
          },
          row.homepage,
        )
      }
      return h(
        'span',
        { class: 'text-sm text-gray-500 dark:text-gray-400' },
        t('gemini.notProvided'),
      )
    },
  },
  {
    key: 'enabled',
    title: t('gemini.enabled'),
    render(row) {
      return h(NSwitch, {
        value: row.status === 'active',
        size: 'large',
        'onUpdate:value': (val: boolean) => handleToggleEnv(row, val),
      })
    },
  },
  {
    key: 'balance',
    title: () =>
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', {}, t('gemini.balance')),
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'tiny',
            loading: balanceAllLoading.value,
            disabled: balanceAllLoading.value,
            onClick: () => handleQueryAllBalances(),
          },
          {
            icon: () => h(NIcon, null, { default: () => h(Refresh) }),
          },
        ),
      ]),
    render(row) {
      const env = row
      if (!env.balanceUrl) {
        return h(
          'span',
          { class: 'text-sm text-gray-500 dark:text-gray-400' },
          t('gemini.notConfigured'),
        )
      }
      const parts: any[] = []
      const text =
        typeof (env as any).currentBalance === 'number'
          ? `${formatCurrency((env as any).currentBalance)}`
          : t('gemini.notQueried')
      parts.push(h('span', { class: 'text-sm' }, text))
      parts.push(
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'tiny',
            loading: !!balanceRowLoading.value[env.id],
            disabled:
              !!balanceRowLoading.value[env.id] || balanceAllLoading.value,
            onClick: () => handleQueryBalance(env),
          },
          {
            icon: () => h(NIcon, null, { default: () => h(Refresh) }),
          },
        ),
      )
      return h('div', { class: 'flex items-center gap-2' }, parts)
    },
  },
  {
    key: 'actions',
    title: t('gemini.actions'),
    align: 'right',
    render(row) {
      return h('div', { class: 'flex justify-end gap-2' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            onClick: () => openEnvModal(row),
          },
          { default: () => t('common.edit') },
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            onClick: () =>
              openEnvModal(
                { ...row, title: `${row.title || ''}(副本)` } as GeminiEnvironmentRecord,
                true,
              ),
          },
          { default: () => t('gemini.copy') },
        ),
        h(
          NPopconfirm,
          {
            positiveText: t('gemini.confirmDelete'),
            negativeText: t('common.cancel'),
            disabled: row.status === 'active',
            onPositiveClick: () => handleDeleteEnv(row),
          },
          {
            default: () =>
              t('gemini.deleteConfirmMessage', {
                name: row.title || t('gemini.unnamedEnvironment'),
              }),
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  focusable: false,
                  type: 'error',
                  disabled: row.status === 'active',
                },
                { default: () => t('common.delete') },
              ),
          },
        ),
      ])
    },
  },
]

// MCP 列
const mcpColumns: DataTableColumns<GeminiMcpRecord> = [
  {
    key: 'name',
    title: t('gemini.name'),
    render(row) {
      return h(
        'p',
        { class: 'font-semibold text-gray-900 dark:text-gray-100' },
        row.displayName || row.name,
      )
    },
  },
  {
    key: 'doc',
    title: t('gemini.doc'),
    render(row) {
      if (row.docUrl) {
        return h(
          'a',
          {
            href: row.docUrl,
            target: '_blank',
            rel: 'noreferrer',
            class: 'text-primary hover:underline text-sm',
          },
          row.docUrl,
        )
      }
      return h(
        'span',
        { class: 'text-sm text-gray-500 dark:text-gray-400' },
        t('gemini.noDocLink'),
      )
    },
  },
  {
    key: 'enabled',
    title: t('gemini.enabled'),
    render(row) {
      return h(NSwitch, {
        value: row.enabled,
        size: 'large',
        'onUpdate:value': (val: boolean) => handleToggleMcp(row, val),
      })
    },
  },
  {
    key: 'actions',
    title: t('gemini.actions'),
    align: 'right',
    render(row) {
      return h('div', { class: 'flex justify-end gap-2' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            focusable: false,
            onClick: () => openMcpModal(row),
          },
          { default: () => t('common.edit') },
        ),
        h(
          NPopconfirm,
          {
            positiveText: t('gemini.confirmDelete'),
            negativeText: t('common.cancel'),
            disabled: row.enabled,
            onPositiveClick: () => handleDeleteMcp(row),
          },
          {
            default: () =>
              t('gemini.deleteConfirmMessage', {
                name: row.displayName || row.name,
              }),
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  focusable: false,
                  type: 'error',
                  disabled: row.enabled,
                },
                { default: () => t('common.delete') },
              ),
          },
        ),
      ])
    },
  },
]

// 操作方法
const handleToggleEnv = async (record: GeminiEnvironmentRecord, enabled: boolean) => {
  if (enabled && record.status !== 'active') {
    try {
      const res = await activateEnvironment(record.id)
      message.success(
        t('gemini.environmentActivated', { name: res.title || '' }),
      )
    } catch (error: any) {
      message.error(error?.message || t('gemini.activateError'))
    }
  } else if (!enabled && record.status === 'active') {
    message.error(t('gemini.switchByEnabling'))
  }
}

const handleToggleMcp = async (record: GeminiMcpRecord, enabled: boolean) => {
  try {
    const res = await geminiStore.toggleMcpServer(record.id, enabled)
    if (res.enabled) {
      message.success(
        t('gemini.mcpEnabled', { name: res.displayName || res.name }),
      )
    } else {
      message.success(
        t('gemini.mcpDisabled', { name: res.displayName || res.name }),
      )
    }
  } catch (error: any) {
    message.error(error?.message || t('gemini.operationError'))
  }
}

const formatCurrency = (val: number) => {
  try {
    return `$${Number(val).toFixed(2)}`
  } catch {
    return `$${val}`
  }
}

const handleQueryBalance = async (record: GeminiEnvironmentRecord) => {
  balanceRowLoading.value[record.id] = true
  try {
    const res = await geminiStore.queryBalance(record.id)
    if (res.error) {
      message.error(res.error || t('gemini.queryError'))
    } else {
      message.success(
        `${t('gemini.balance')}: ${res.balance} (${res.raw})`,
      )
    }
  } catch (err: any) {
    message.error(err?.message || t('gemini.queryError'))
  } finally {
    balanceRowLoading.value[record.id] = false
  }
}

const handleQueryAllBalances = async () => {
  const list = environments.value.filter(e => e.balanceUrl)
  if (!list.length) return

  balanceAllLoading.value = true
  try {
    const ids = list.map(env => env.id)
    ids.forEach(id => {
      balanceRowLoading.value[id] = true
    })
    for (const env of list) {
      try {
        await geminiStore.queryBalance(env.id)
      } catch {}
    }
  } finally {
    const ids = list.map(env => env.id)
    ids.forEach(id => {
      balanceRowLoading.value[id] = false
    })
    balanceAllLoading.value = false
  }
}

const handleAfterEnvSaved = async (record: GeminiEnvironmentRecord) => {
  if (record.balanceUrl) {
    await handleQueryBalance(record)
  }
}

// 删除操作
const handleDeleteEnv = async (record: GeminiEnvironmentRecord) => {
  try {
    await deleteEnvironment(record.id)
    message.success(
      t('gemini.environmentDeleted', { name: record.title || '' }),
    )
  } catch (error: any) {
    message.error(error?.message || t('gemini.deleteError'))
  }
}

const handleDeleteMcp = async (record: GeminiMcpRecord) => {
  if (record.enabled) {
    message.error(t('gemini.disableMcpFirst'))
    return
  }

  try {
    await geminiStore.deleteMcpServer(record.id)
    message.success(
      t('gemini.mcpDeleted', {
        name: record.displayName || record.name,
      }),
    )
  } catch (error: any) {
    message.error(error?.message || t('gemini.deleteError'))
  }
}

// 通用配置管理
const generalModalOpen = ref(false)
const generalFormRef = ref<any>()
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

// MCP 对话框
const mcpModalOpen = ref(false)
const editingMcp = ref<GeminiMcpRecord | undefined>()
const mcpFormRef = ref<any>()
const openMcpModal = (record?: GeminiMcpRecord) => {
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
const editingEnv = ref<GeminiEnvironmentRecord | undefined>()
const envFormTreatAsNew = ref(false)

const openEnvModal = (record?: GeminiEnvironmentRecord, treatAsNew = false) => {
  editingEnv.value = record
  envFormTreatAsNew.value = treatAsNew
  envModalOpen.value = true
}

const closeEnvModal = () => {
  envModalOpen.value = false
  editingEnv.value = undefined
  envFormTreatAsNew.value = false
}
</script>
