<template>
  <NCard>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="text-2xl">💻</div>
        <div>
          <h3 class="text-lg font-semibold">{{ distro.name }}</h3>
          <div class="flex items-center gap-2 mt-1">
            <NTag :type="stateColor" size="small" :bordered="false">
              {{ distro.state }}
            </NTag>
            <NTag type="info" size="small" :bordered="false">
              WSL {{ distro.version }}
            </NTag>
            <NTag v-if="distro.isDefault" type="primary" size="small" :bordered="false">
              默认
            </NTag>
          </div>
        </div>
      </div>

      <NButton
        v-if="!isAdded"
        type="primary"
        size="small"
        :loading="adding"
        @click="handleAdd"
      >
        添加到管理
      </NButton>
      <NTag v-else type="success" size="small">
        ✓ 已添加
      </NTag>
    </div>

    <div v-if="distro.homePath" class="text-sm text-gray-600 dark:text-gray-400">
      <div class="flex items-start gap-2">
        <span class="text-gray-500">📁</span>
        <div class="flex-1 break-all font-mono text-xs">
          {{ distro.homePath }}
        </div>
      </div>
    </div>

    <div v-if="existingEnv" class="mt-2 text-sm text-green-600 dark:text-green-400">
      ✓ 已在管理列表中
    </div>
  </NCard>
</template>

<script setup lang="ts">
import { NCard, NTag, NButton } from 'naive-ui'
import type { WslDistroInfo } from '#shared/types/remote'
import { useRemoteStore } from '~/stores/remote'

interface Props {
  distro: WslDistroInfo
}

const props = defineProps<Props>()
const emit = defineEmits<{
  added: [distroName: string]
}>()

const remoteStore = useRemoteStore()
const adding = ref(false)

// 检查是否已添加
const existingEnv = computed(() => {
  return remoteStore.wslEnvironments.find(
    env => env.wslConfig?.distroName === props.distro.name
  )
})

const isAdded = computed(() => Boolean(existingEnv.value))

// 状态颜色
const stateColor = computed(() => {
  return props.distro.state === 'Running' ? 'success' : 'default'
})

// 添加到管理
const handleAdd = async () => {
  if (isAdded.value) return

  adding.value = true
  try {
    await remoteStore.createWslEnvironment(
      props.distro.name,
      `WSL ${props.distro.name}`
    )
    emit('added', props.distro.name)
  } catch (error) {
    console.error('添加 WSL 环境失败:', error)
  } finally {
    adding.value = false
  }
}
</script>
