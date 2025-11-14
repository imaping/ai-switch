<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- 页头 -->
    <div class="mb-8">
      <p class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Codex 环境
      </p>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-4xl font-bold">Codex 控制面板</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            读取 ~/.codex 配置,集中管理环境
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
            placeholder="选择环境范围"
          />
          <UButton
            icon="i-heroicons-cog-6-tooth"
            variant="outline"
            @click="openGeneralModal"
          >
            通用配置管理
          </UButton>
        </div>
      </div>
    </div>

    <!-- 环境管理卡片 -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold">环境管理</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              编辑、删除或一键启用配置
            </p>
          </div>
          <UButton icon="i-heroicons-plus" @click="openEnvModal()">
            新增
          </UButton>
        </div>
      </template>

      <div v-if="environments.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        暂无环境,请先创建。
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
            <h2 class="text-xl font-semibold">MCP 列表</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              管理 Codex 配置中的 MCP 服务
            </p>
          </div>
          <UButton icon="i-heroicons-plus" @click="openMcpModal()">
            新增
          </UButton>
        </div>
      </template>

      <div v-if="mcpServers.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        暂无 MCP 配置。
      </div>
      <div v-else>
        <UTable :data="mcpServers" :columns="mcpColumns"  sticky class="flex-1 h-60"/>
      </div>
    </UCard>

    <!-- MCP 表单模态框（对齐“新增环境”布局） -->
    <UModal v-model:open="mcpModalOpen" :title="editingMcp ? '编辑 MCP' : '新增 MCP'" :ui="{ content: 'sm:max-w-3xl w-full', footer: 'justify-end' }">
      <template #body>
        <CodexMcpForm ref="mcpFormRef" :initial-value="editingMcp" @close="closeMcpModal" />
      </template>
      <template #footer>
        <UButton variant="outline" @click="closeMcpModal">取消</UButton>
        <UButton :loading="mcpFormRef?.isSubmitting?.()" :disabled="mcpFormRef?.hasCodeError?.()" @click="mcpFormRef?.submit()">
          {{ mcpFormRef?.isEdit?.() ? '保存修改' : '创建 MCP' }}
        </UButton>
      </template>
    </UModal>
    <!-- 环境表单模态框 -->
    <UModal v-model:open="envModalOpen" :title="editingEnv && !envFormTreatAsNew ? '编辑环境' : '新增环境'" :ui="{ content: 'sm:max-w-5xl w-full', footer: 'justify-end' }">
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
        <UButton variant="outline" @click="closeEnvModal">取消</UButton>
        <UButton :loading="envFormRef?.isSubmitting?.()" :disabled="envFormRef?.hasCodeError?.()" @click="envFormRef?.submit()">
          {{ envFormRef?.isEdit?.() ? '保存修改' : '新增环境' }}
        </UButton>
      </template>
    </UModal>

    <!-- 通用配置管理（置于末尾以获得更高层级） -->
    <UModal v-model:open="generalModalOpen" title="通用配置管理" :ui="{ content: 'sm:max-w-4xl w-full', footer: 'justify-end' }">
      <template #body>
        <CodexGeneralConfigForm
          ref="generalFormRef"
          :initial-value="generalConfig?.payload"
        />
      </template>
      <template #footer>
        <UButton variant="outline" @click="closeGeneralModal">取消</UButton>
        <UButton :loading="generalFormRef?.isSubmitting?.()" :disabled="generalFormRef?.hasCodeError?.()" @click="onSaveGeneral()">
          保存
        </UButton>
      </template>
    </UModal>

    <!-- 删除确认对话框 -->
    <UModal v-model:open="confirmDialog.open" :ui="{ content: 'sm:max-w-md w-full' }">
      <template #content>
        <UCard class="max-h-[85dvh] overflow-y-auto">
          <template #header>
            <h3 class="text-xl font-semibold">
              {{ confirmDialog.mode === 'env' ? '删除环境' : '删除 MCP' }}
            </h3>
          </template>

          <p class="mb-6 text-gray-700 dark:text-gray-300">
            确认删除 "{{
              confirmDialog.mode === 'env'
                ? confirmDialog.env?.title || '未命名环境'
                : confirmDialog.mcp?.displayName || confirmDialog.mcp?.name
            }}" 吗?此操作不可恢复。
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

    <!-- 全局数据请求等待框 -->
    <Transition name="fade">
      <div
        v-if="loading"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <UCard class="flex items-center gap-3">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
          <span class="text-sm text-gray-700 dark:text-gray-200">
            数据请求中,请稍候...
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
    { label: '本地环境', value: 'local' },
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
    header: '名称',
    cell: ({ row }) => h('div', {}, [
      h('p', { class: 'font-semibold text-gray-900 dark:text-gray-100' }, row.original.title || '未命名'),
      row.original.description
        ? h('p', { class: 'text-sm text-gray-500 dark:text-gray-400 mt-1' }, row.original.description)
        : null
    ])
  },
  {
    accessorKey: 'homepage',
    header: '官网地址',
    cell: ({ row }) => row.original.homepage
      ? h('a', {
        href: row.original.homepage,
        target: '_blank',
        rel: 'noreferrer',
        class: 'text-primary hover:underline text-sm'
      }, row.original.homepage)
      : h('span', { class: 'text-sm text-gray-500 dark:text-gray-400' }, '未填写')
  },
  {
    id: 'enabled',
    header: '启用',
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
      h('span', {}, '余额'),
      h(
        UButton as any,
        {
          size: 'xs',
          variant: 'ghost',
          icon: 'i-heroicons-arrow-path',
          title: '刷新全部余额',
          onClick: () => handleQueryAllBalances(),
          disabled: loading.value,
        }
      )
    ]),
    cell: ({ row }) => {
      const env = row.original as CodexEnvironmentRecord
      if (!env.balanceUrl) {
        return h('span', { class: 'text-sm text-gray-500 dark:text-gray-400' }, '未配置')
      }
      const parts: any[] = []
      const text = typeof (env as any).currentBalance === 'number' ? `${formatCurrency((env as any).currentBalance)}` : '未查询'
      parts.push(h('span', { class: 'text-sm' }, text))
      parts.push(
        h(
          UButton as any,
          {
            size: 'xs',
            variant: 'ghost',
            icon: 'i-heroicons-arrow-path',
            title: '刷新余额',
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
    header: () => h('div', { class: 'text-right' }, '操作'),
    cell: ({ row }) => h('div', { class: 'flex gap-2 justify-end' }, [
      h(UButton as any, { size: 'xs', variant: 'ghost', onClick: () => openEnvModal(row.original) }, { default: () => '编辑' }),
      h(UButton as any, { size: 'xs', variant: 'ghost', onClick: () => openEnvModal({ ...row.original, title: `${row.original.title}(副本)` } as CodexEnvironmentRecord, true) }, { default: () => '复制' }),
      h(UButton as any, { size: 'xs', variant: 'ghost', color: 'red', disabled: row.original.status === 'active', onClick: () => handleDeleteEnv(row.original) }, { default: () => '删除' })
    ])
  }
]

const USwitch = resolveComponent('USwitch')

const mcpColumns: TableColumn<CodexMcpRecord>[] = [
  {
    id: 'name',
    header: '名称',
    cell: ({ row }) => h('p', { class: 'font-semibold text-gray-900 dark:text-gray-100' }, row.original.displayName || row.original.name)
  },
  {
    id: 'doc',
    header: '文档',
    cell: ({ row }) => h('p', { class: 'text-sm text-gray-500 dark:text-gray-400 truncate max-w-md' }, row.original.docUrl || '未提供文档链接')
  },
  {
    id: 'enabled',
    header: '启用',
    cell: ({ row }) => h(USwitch as any, {
      modelValue: row.original.enabled,
      'onUpdate:modelValue': (val: boolean) => handleToggleMcp(row.original, val),
      disabled: loading.value,
      size: 'lg'
    })
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, '操作'),
    cell: ({ row }) => h('div', { class: 'flex gap-2 justify-end' }, [
      h(UButton as any, { size: 'xs', variant: 'ghost', onClick: () => openMcpModal(row.original) }, { default: () => '编辑' }),
      h(UButton as any, { size: 'xs', variant: 'ghost', color: 'red', disabled: row.original.enabled, onClick: () => handleDeleteMcp(row.original) }, { default: () => '删除' })
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
    } else {
      // 目前不支持直接禁用
      useToast().add({
        title: '无法禁用',
        description: '请通过启用其他环境来切换。',
        color: 'orange',
        icon: 'i-heroicons-information-circle',
      })
    }
  } catch (err: any) {
    console.error('切换环境失败:', err.message)
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
      useToast().add({
        title: '查询失败',
        description: res.error,
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
    } else {
      useToast().add({
        title: '查询成功',
        description: `余额: ${res.balance} (原始: ${res.raw})`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
  } catch (err: any) {
    useToast().add({
      title: '查询失败',
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
      title: '无法删除',
      description: '请先禁用 MCP 服务',
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
        title: '删除成功',
        description: `环境 "${confirmDialog.value.env.title}" 已删除`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
    else if (confirmDialog.value.mode === 'mcp' && confirmDialog.value.mcp) {
      await codexStore.deleteMcpServer(confirmDialog.value.mcp.id)
      toast.add({
        title: '删除成功',
        description: `MCP "${confirmDialog.value.mcp.displayName || confirmDialog.value.mcp.name}" 已删除`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }

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
</script>
