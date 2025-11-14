<script setup lang="ts">
definePageMeta({
  title: 'AI Switch - 首页',
})

const quickLinks = [
  {
    label: '管理 Claude 环境',
    description: '本地 ~/.claude / Claude Code 设置一站式维护',
    to: '/claude',
    icon: 'i-lucide-bot',
  },
  {
    label: '管理 Codex 环境',
    description: '统一管理 ~/.codex、MCP 与余额查询配置',
    to: '/codex',
    icon: 'i-lucide-hexagon',
  },
  {
    label: '管理远程主机',
    description: '通过 SSH 管理远程服务器上的 AI 配置',
    to: '/remote',
    icon: 'i-lucide-server',
  },
]

const coreFeatures = [
  '环境配置管理：创建、编辑、激活多个环境',
  'MCP 服务管理：灵活配置与启用 / 禁用',
  '余额查询：自动请求并展示 API 余额',
  '远程操作：通过 SSH 连接远程主机进行配置',
  '通用配置：可复用的配置片段系统',
]
</script>

<template>
  <div class="max-w-5xl mx-auto py-10 space-y-10">
    <!-- Hero 区域 -->
    <UCard
      class="relative overflow-hidden"
      :ui="{
        base: 'border-0 ring-1 ring-border/60 bg-gradient-to-br from-primary-50/80 to-neutral-50 dark:from-primary-950/40 dark:to-neutral-950/60',
      }"
    >
      <div
        class="pointer-events-none absolute inset-y-0 -right-20 w-64 bg-gradient-to-tl from-primary-500/10 via-primary-400/10 to-transparent blur-3xl"
      />

      <div class="flex flex-col gap-6 md:flex-row md:items-center">
        <div class="flex-1 space-y-4">
          <div class="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-neutral-700 ring-1 ring-primary-200/60 dark:bg-neutral-900/70 dark:text-neutral-200 dark:ring-primary-500/40">
            <span class="inline-flex h-1.5 w-1.5 rounded-full bg-primary-500" />
            <span>环境 / MCP / 远程 主机，一站式切换</span>
          </div>

          <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            <span class="block text-neutral-900 dark:text-white">AI Switch</span>
            <span
              class="mt-2 bg-gradient-to-r from-primary-500 via-emerald-500 to-sky-500 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl"
            >
              面向开发者的 AI 环境控制台
            </span>
          </h1>

          <p class="max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            将分散在本地和远程服务器上的 AI 配置集中起来：统一管理 Claude / Codex 环境、MCP
            服务、余额查询与通用配置，让日常切环境像切标签页一样轻松。
          </p>
        </div>
      </div>
    </UCard>

    <!-- 快速入口 -->
    <section class="space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          快速进入
        </h2>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          常用三个入口，支持在顶部导航随时切换
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UCard
          v-for="item in quickLinks"
          :key="item.to"
          class="h-full transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div class="flex h-full flex-col gap-3">
            <div class="flex items-center gap-2">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300"
              >
                <UIcon :name="item.icon" class="h-4 w-4" />
              </div>
              <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {{ item.label }}
              </h3>
            </div>

            <p class="flex-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              {{ item.description }}
            </p>

            <UButton
              :to="item.to"
              color="primary"
              variant="soft"
              size="xs"
              class="mt-1"
              block
            >
              进入管理
            </UButton>
          </div>
        </UCard>
      </div>
    </section>

    <!-- 核心功能列表 -->
    <section class="space-y-4">
      <div class="flex items-center gap-2">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300"
        >
          <UIcon name="i-lucide-settings-2" class="h-3.5 w-3.5" />
        </div>
        <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          核心能力一览
        </h2>
      </div>

      <UCard
        :ui="{
          base: 'bg-neutral-50/60 dark:bg-neutral-900/60 border-dashed',
        }"
      >
        <ul class="grid gap-3 text-xs text-neutral-700 dark:text-neutral-300 md:grid-cols-2">
          <li
            v-for="(feature, index) in coreFeatures"
            :key="feature"
            class="flex items-start gap-2"
          >
            <span
              class="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50 text-[10px] text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              {{ index + 1 }}
            </span>
            <span>
              {{ feature }}
            </span>
          </li>
        </ul>
      </UCard>
    </section>
  </div>
</template>
