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
          <USelect
            v-model="selectedScope"
            @change="envScopeStore.setScope(selectedScope)"
            :items="scopeOptions"
            option-attribute="label"
            size="sm"
            class="min-w-[160px]"
            :placeholder="t('codex.selectScope')"
          />
          <UButton
            icon="i-heroicons-cog-6-tooth"
            variant="outline"
            @click="openGeneralModal"
          >
            {{ t('codex.generalConfigManagement') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- 环境管理卡片 -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold">{{ t('codex.environmentManagement') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('codex.environmentManagementDesc') }}
            </p>
          </div>
          <UButton icon="i-heroicons-plus" @click="openEnvModal()">
            {{ t('codex.add') }}
          </UButton>
        </div>
      </template>

      <div v-if="environments.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        {{ t('codex.noEnvironments') }}
      </div>
      <div v-else>
        <UTable :data="environments" :columns="envColumns" sticky class="flex-1 h-100" />
      </div>
    </UCard>

    <!-- MCP 列表卡片 -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold">{{ t('codex.mcpList') }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('codex.mcpListDesc') }}
            </p>
          </div>
          <UButton icon="i-heroicons-plus" @click="openMcpModal()">
            {{ t('codex.add') }}
          </UButton>
        </div>
      </template>

      <div v-if="mcpServers.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        {{ t('codex.noMcpServers') }}
      </div>
      <div v-else>
        <UTable :data="mcpServers" :columns="mcpColumns"  sticky class="flex-1 h-60"/>
      </div>
    </UCard>

    <!-- MCP 表单模态框（对齐"新增环境"布局） -->
    <UModal v-model:open="mcpModalOpen" :title="editingMcp ? t('codex.editMcp') : t('codex.addMcp')" :ui="{ content: 'sm:max-w-3xl w-full', footer: 'justify-end' }">
      <template #body>
        <CodexMcpForm ref="mcpFormRef" :initial-value="editingMcp" @close="closeMcpModal" />
      </template>
      <template #footer>
        <UButton variant="outline" @click="closeMcpModal">{{ t('common.cancel') }}</UButton>
        <UButton :loading="mcpFormRef?.isSubmitting?.()" :disabled="mcpFormRef?.hasCodeError?.()" @click="mcpFormRef?.submit()">
          {{ mcpFormRef?.isEdit?.() ? t('codex.saveChanges') : t('codex.createMcp') }}
        </UButton>
      </template>
    </UModal>
    <!-- 环境表单模态框 -->
    <UModal v-model:open="envModalOpen" :title="editingEnv && !envFormTreatAsNew ? t('codex.editEnvironment') : t('codex.createEnvironment')" :ui="{ content: 'sm:max-w-5xl w-full', footer: 'justify-end' }">
      <template #body>
        <CodexEnvironmentForm
          ref="envFormRef"
          :initial-value="editingEnv"
          :treat-as-new="envFormTreatAsNew"
          @saved="handleAfterEnvSaved"
          @open-general="openGeneralModal"
          @close="closeEnvModal"
        />
      </template>
      <template #footer>
        <UButton variant="outline" @click="closeEnvModal">{{ t('common.cancel') }}</UButton>
        <UButton :loading="envFormRef?.isSubmitting?.()" :disabled="envFormRef?.hasCodeError?.()" @click="envFormRef?.submit()">
          {{ envFormRef?.isEdit?.() ? t('codex.saveChanges') : t('codex.createEnvironment') }}
        </UButton>
      </template>
    </UModal>

    <!-- 通用配置管理（置于末尾以获得更高层级） -->
    <UModal v-model:open="generalModalOpen" :title="t('codex.generalConfigManagement')" :ui="{ content: 'sm:max-w-4xl w-full', footer: 'justify-end' }">
      <template #body>
        <CodexGeneralConfigForm
          ref="generalFormRef"
          :initial-value="generalConfig?.payload"
        />
      </template>
      <template #footer>
        <UButton variant="outline" @click="closeGeneralModal">{{ t('common.cancel') }}</UButton>
        <UButton :loading="generalFormRef?.isSubmitting?.()" :disabled="generalFormRef?.hasCodeError?.()" @click="onSaveGeneral()">
          {{ t('common.save') }}
        </UButton>
      </template>
    </UModal>

    <!-- 删除确认对话框 -->
    <UModal v-model:open="confirmDialog.open" :ui="{ content: 'sm:max-w-md w-full' }">
      <template #content>
        <UCard class="max-h-[85dvh] overflow-y-auto">
          <template #header>
            <h3 class="text-xl font-semibold">
              {{ confirmDialog.mode === 'env' ? t('codex.deleteEnvironment') : t('codex.deleteMcp') }}
            </h3>
          </template>

          <p class="mb-6 text-gray-700 dark:text-gray-300">
            {{ t('codex.deleteConfirmMessage', {
              name: confirmDialog.mode === 'env'
                ? confirmDialog.env?.title || t('codex.unnamedEnvironment')
                : confirmDialog.mcp?.displayName || confirmDialog.mcp?.name
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
              {{ t('codex.confirmDelete') }}
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>

    <!-- 全局数据请求等待框 -->
    <Transition name="fade">
      <div
        v-if="loading"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <UCard class="flex items-center gap-3">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
          <span class="text-sm text-gray-700 dark:text-gray-200">
            {{ t('codex.loading') }}
          </span>
        </UCard>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent, ref, watch, computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
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
  mcpServers,
  loading,
  error,
} = storeToRefs(codexStore)
const { fetchOverview, activateEnvironment, toggleMcpServer, deleteEnvironment } = codexStore
const toast = useToast()

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

const selectedScope = ref(envScopeStore.scope)
// 生命周期
onMounted(async () => {
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
// UTable 列定义（Nuxt UI v4）
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const envColumns: TableColumn<CodexEnvironmentRecord>[] = [
  {
    accessorKey: 'title',
    header: t('codex.name'),
    cell: ({ row }) => h('div', {}, [
      h('p', { class: 'font-semibold text-gray-900 dark:text-gray-100' }, row.original.title || t('codex.unnamed')),
      row.original.description
        ? h('p', { class: 'text-sm text-gray-500 dark:text-gray-400 mt-1' }, row.original.description)
        : null
    ])
  },
  {
    accessorKey: 'homepage',
    header: t('codex.homepage'),
    cell: ({ row }) => row.original.homepage
      ? h('a', {
        href: row.original.homepage,
        target: '_blank',
        rel: 'noreferrer',
        class: 'text-primary hover:underline text-sm'
      }, row.original.homepage)
      : h('span', { class: 'text-sm text-gray-500 dark:text-gray-400' }, t('codex.notProvided'))
  },
  {
    id: 'enabled',
    header: t('codex.enabled'),
    cell: ({ row }) => h(USwitch as any, {
      modelValue: row.original.status === 'active',
      'onUpdate:modelValue': (val: boolean) => handleToggleEnv(row.original, val),
      disabled: loading.value,
      size: 'lg'
    })
  },
  {
    id: 'balance',
    header: () => h('div', { class: 'flex items-center gap-2' }, [
      h('span', {}, t('codex.balance')),
      h(
        UButton as any,
        {
          size: 'xs',
          variant: 'ghost',
          icon: 'i-heroicons-arrow-path',
          title: t('codex.refreshAllBalances'),
          onClick: () => handleQueryAllBalances(),
          disabled: loading.value,
        }
      )
    ]),
    cell: ({ row }) => {
      const env = row.original as CodexEnvironmentRecord
      if (!env.balanceUrl) {
        return h('span', { class: 'text-sm text-gray-500 dark:text-gray-400' }, t('codex.notConfigured'))
      }
      const parts: any[] = []
      const text = typeof (env as any).currentBalance === 'number' ? `${formatCurrency((env as any).currentBalance)}` : t('codex.notQueried')
      parts.push(h('span', { class: 'text-sm' }, text))
      parts.push(
        h(
          UButton as any,
          {
            size: 'xs',
            variant: 'ghost',
            icon: 'i-heroicons-arrow-path',
            title: t('codex.refreshBalance'),
            disabled: loading.value,
            onClick: () => handleQueryBalance(env)
          },
          {}
        )
      )
      return h('div', { class: 'flex items-center gap-2' }, parts)
    }
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, t('codex.actions')),
    cell: ({ row }) => h('div', { class: 'flex gap-2 justify-end' }, [
      h(UButton as any, { size: 'xs', variant: 'ghost', onClick: () => openEnvModal(row.original) }, { default: () => t('common.edit') }),
      h(UButton as any, { size: 'xs', variant: 'ghost', onClick: () => openEnvModal({ ...row.original, title: `${row.original.title}(副本)` } as CodexEnvironmentRecord, true) }, { default: () => t('codex.copy') }),
      h(UButton as any, { size: 'xs', variant: 'ghost', color: 'red', disabled: row.original.status === 'active', onClick: () => handleDeleteEnv(row.original) }, { default: () => t('common.delete') })
    ])
  }
]

const USwitch = resolveComponent('USwitch')

const mcpColumns: TableColumn<CodexMcpRecord>[] = [
  {
    id: 'name',
    header: t('codex.name'),
    cell: ({ row }) => h('p', { class: 'font-semibold text-gray-900 dark:text-gray-100' }, row.original.displayName || row.original.name)
  },
  {
    id: 'doc',
    header: t('codex.doc'),
    cell: ({ row }) => row.original.docUrl
      ? h('a', {
        href: row.original.docUrl,
        target: '_blank',
        rel: 'noreferrer',
        class: 'text-primary hover:underline text-sm'
      }, row.original.docUrl)
      : h('span', { class: 'text-sm text-gray-500 dark:text-gray-400' }, t('codex.noDocLink'))
  },
  {
    id: 'enabled',
    header: t('codex.enabled'),
    cell: ({ row }) => h(USwitch as any, {
      modelValue: row.original.enabled,
      'onUpdate:modelValue': (val: boolean) => handleToggleMcp(row.original, val),
      disabled: loading.value,
      size: 'lg'
    })
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, t('codex.actions')),
    cell: ({ row }) => h('div', { class: 'flex gap-2 justify-end' }, [
      h(UButton as any, { size: 'xs', variant: 'ghost', onClick: () => openMcpModal(row.original) }, { default: () => t('common.edit') }),
      h(UButton as any, { size: 'xs', variant: 'ghost', color: 'red', disabled: row.original.enabled, onClick: () => handleDeleteMcp(row.original) }, { default: () => t('common.delete') })
    ])
  }
]

const handleActivateEnv = async (record: CodexEnvironmentRecord) => {
  try {
    await activateEnvironment(record.id)
  }
  catch (err: any) {
    console.error('激活环境失败:', err.message)
  }
}

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
      toast.add({
        title: t('codex.activateSuccess'),
        description: t('codex.environmentActivated', { name: record.title }),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    } else {
      // 目前不支持直接禁用
      toast.add({
        title: t('codex.cannotDisable'),
        description: t('codex.switchByEnabling'),
        color: 'orange',
        icon: 'i-heroicons-information-circle',
      })
    }
  } catch (err: any) {
    toast.add({
      title: t('codex.operationError'),
      description: err.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
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
  try {
    const res = await codexStore.queryBalance(record.id)
    if (res.error) {
      toast.add({
        title: t('codex.queryError'),
        description: res.error,
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
    } else {
      toast.add({
        title: t('codex.querySuccess'),
        description: `${t('codex.balance')}: ${res.balance} (${res.raw})`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
  } catch (err: any) {
    toast.add({
      title: t('codex.queryError'),
      description: err.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

const handleQueryAllBalances = async () => {
  const list = environments.value.filter(e => e.balanceUrl)
  for (const env of list) {
    try {
      await codexStore.queryBalance(env.id)
    } catch {}
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
    toast.add({
      title: t('codex.cannotDelete'),
      description: t('codex.disableMcpFirst'),
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
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
      toast.add({
        title: t('codex.deleteSuccess'),
        description: t('codex.environmentDeleted', { name: confirmDialog.value.env.title }),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
    else if (confirmDialog.value.mode === 'mcp' && confirmDialog.value.mcp) {
      await codexStore.deleteMcpServer(confirmDialog.value.mcp.id)
      toast.add({
        title: t('codex.deleteSuccess'),
        description: t('codex.mcpDeleted', { name: confirmDialog.value.mcp.displayName || confirmDialog.value.mcp.name }),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }

    confirmDialog.value = { open: false }
  }
  catch (error: any) {
    toast.add({
      title: t('codex.deleteError'),
      description: error.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
  finally {
    confirmLoading.value = false
  }
}
</script>
