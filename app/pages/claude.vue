<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- 页头 -->
    <div class="mb-8">
      <p class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Claude 环境
      </p>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-4xl font-bold">Claude 控制面板</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
            读取 ~/.claude 配置,集中管理环境
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
        <UTable :data="environments" :columns="envColumns" sticky class="flex-1 h-100"/>
      </div>
    </UCard>

    <!-- MCP 列表卡片 -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold">MCP 列表</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              管理 ~/.claude.json 中的 mcpServers 节点
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
        <UTable :data="mcpServers" :columns="mcpColumns" sticky class="flex-1 h-60"/>
      </div>
    </UCard>

    <!-- 环境表单模态框 -->
    <UModal v-model:open="envModalOpen" :title="editingEnv && !envFormTreatAsNew ? '编辑环境' : '新增环境'"  :ui="{ content: 'sm:max-w-5xl w-full', footer: 'justify-end' }">
      <template #body>
        <ClaudeEnvironmentForm
          ref="envFormRef"
          :initial-value="editingEnv"
          :treat-as-new="envFormTreatAsNew"
          @open-general="openGeneralModal"
          @saved="handleAfterEnvSaved"
          @close="closeEnvModal"
        />
      </template>
      <template #footer>
        <UButton
          variant="outline"
          @click="closeEnvModal"
        >取消</UButton>
        <UButton
          :loading="envFormRef?.isSubmitting?.()"
          :disabled="envFormRef?.hasCodeError?.()"
          @click="envFormRef?.submit()"
        >{{ envFormRef?.isEdit?.() ? '保存修改' : '新增环境' }}</UButton>
      </template>
    </UModal>

    <!-- 通用配置管理 -->
    <UModal v-model:open="generalModalOpen" title="通用配置管理" :ui="{ content: 'sm:max-w-4xl w-full', footer: 'justify-end' }">
      <template #body>
        <ClaudeGeneralConfigForm
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

    <!-- MCP 表单模态框（对齐“新增环境”布局） -->
    <UModal v-model:open="mcpModalOpen" :title="editingMcp ? '编辑 MCP' : '新增 MCP'" :ui="{ content: 'sm:max-w-3xl w-full', footer: 'justify-end' }">
      <template #body>
        <ClaudeMcpForm ref="mcpFormRef" :initial-value="editingMcp" @close="closeMcpModal" />
      </template>
      <template #footer>
        <UButton variant="outline" @click="closeMcpModal">取消</UButton>
        <UButton :loading="mcpFormRef?.isSubmitting?.()" :disabled="mcpFormRef?.hasCodeError?.()" @click="mcpFormRef?.submit()">
          {{ mcpFormRef?.isEdit?.() ? '保存修改' : '创建 MCP' }}
        </UButton>
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
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent, ref, watch, computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ClaudeEnvironmentRecord, ClaudeMcpRecord } from '#shared/types/claude'

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
  error,
} = storeToRefs(claudeStore)
const {
  fetchOverview,
  activateEnvironment,
  toggleMcpServer,
  deleteEnvironment,
  deleteMcpServer,
} = claudeStore

const toast = useToast()

interface ScopeOption {
  label: string
  value: string
}

// 本地 + 远程主机列表，用于面板内环境下拉
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

// 子表单引用（用于触发提交与读取状态）
const envFormRef = ref<any>()
const generalModalOpen = ref(false)
const generalFormRef = ref<any>()
const mcpFormRef = ref<any>()

// 状态
// UTable 列定义（Nuxt UI v4，使用 data+columns API）
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const envColumns: TableColumn<ClaudeEnvironmentRecord>[] = [
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
      const env = row.original
      if (!env.balanceUrl) {
        return h('span', { class: 'text-sm text-gray-500 dark:text-gray-400' }, '未配置')
      }
      const parts: any[] = []
      const text = typeof env.currentBalance === 'number' ? `${formatCurrency(env.currentBalance)}` : '未查询'
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
      h(UButton as any, { size: 'xs', variant: 'ghost', onClick: () => openEnvModal({ ...row.original, title: `${row.original.title}(副本)` }, true) }, { default: () => '复制' }),
      h(UButton as any, { size: 'xs', variant: 'ghost', color: 'red', disabled: row.original.status === 'active', onClick: () => handleDeleteEnv(row.original) }, { default: () => '删除' })
    ])
  }
]

const USwitch = resolveComponent('USwitch')

const mcpColumns: TableColumn<ClaudeMcpRecord>[] = [
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
      await deleteMcpServer(confirmDialog.value.mcp.id)
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

// 方法
const handleActivateEnv = async (record: ClaudeEnvironmentRecord) => {
  try {
    await activateEnvironment(record.id)
    toast.add({
      title: '激活成功',
      description: `环境 "${record.title}" 已激活`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  }
  catch (err: any) {
    toast.add({
      title: '激活失败',
      description: err.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

const handleToggleEnv = async (record: ClaudeEnvironmentRecord, next: boolean) => {
  try {
    if (next) {
      // 切到激活
      await activateEnvironment(record.id)
      toast.add({
        title: '激活成功',
        description: `环境 "${record.title}" 已激活`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    } else {
      // 目前不支持直接禁用，提示用户
      toast.add({
        title: '无法禁用',
        description: '请通过启用其他环境来切换。',
        color: 'orange',
        icon: 'i-heroicons-information-circle',
      })
    }
  } catch (err: any) {
    toast.add({
      title: '操作失败',
      description: err.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    // 同步最新状态，确保开关回到正确位置
    await fetchOverview()
  }
}

const handleToggleMcp = async (record: ClaudeMcpRecord, next?: boolean) => {
  try {
    await toggleMcpServer(record.id, typeof next === 'boolean' ? next : !record.enabled)
    toast.add({
      title: '操作成功',
      description: `MCP "${record.displayName || record.name}" 已${!record.enabled ? '启用' : '禁用'}`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  }
  catch (err: any) {
    toast.add({
      title: '操作失败',
      description: err.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
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
      toast.add({
        title: '查询失败',
        description: res.error,
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
    } else {
      toast.add({
        title: '查询成功',
        description: `余额: ${formatCurrency(res.balance)}`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
  } catch (err: any) {
    toast.add({
      title: '查询失败',
      description: err.message,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
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
