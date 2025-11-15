<script setup lang="ts">
import { NButton, NCard } from 'naive-ui'

const { t } = useI18n()

definePageMeta({
  title: 'AI Switch - 首页',
})

const quickLinks = computed(() => [
  {
    label: t('home.manageClaude'),
    description: t('home.manageClaudeDesc'),
    to: '/claude',
    icon: 'i-lucide-bot',
  },
  {
    label: t('home.manageCodex'),
    description: t('home.manageCodexDesc'),
    to: '/codex',
    icon: 'i-lucide-hexagon',
  },
  {
    label: t('home.manageRemote'),
    description: t('home.manageRemoteDesc'),
    to: '/remote',
    icon: 'i-lucide-server',
  },
])

const coreFeatures = computed(() => [
  t('home.feature1'),
  t('home.feature2'),
  t('home.feature3'),
  t('home.feature4'),
  t('home.feature5'),
])
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-10 py-10">
    <!-- Hero 区域 -->
    <NCard
      class="relative overflow-hidden border-0 bg-gradient-to-br from-primary-50/80 to-neutral-50 ring-1 ring-border/60 dark:from-primary-950/40 dark:to-neutral-950/60"
    >
      <div
        class="pointer-events-none absolute inset-y-0 -right-20 w-64 bg-gradient-to-tl from-primary-500/10 via-primary-400/10 to-transparent blur-3xl"
      />

      <div class="flex flex-col gap-6 md:flex-row md:items-center">
        <div class="flex-1 space-y-4">
          <div class="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-neutral-700 ring-1 ring-primary-200/60 dark:bg-neutral-900/70 dark:text-neutral-200 dark:ring-primary-500/40">
            <span class="inline-flex h-1.5 w-1.5 rounded-full bg-primary-500" />
            <span>{{ t('home.tagline') }}</span>
          </div>

          <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            <span class="block text-neutral-900 dark:text-white">{{ t('home.heroTitle') }}</span>
            <span
              class="mt-2 bg-gradient-to-r from-primary-500 via-emerald-500 to-sky-500 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl"
            >
              {{ t('home.heroSubtitle') }}
            </span>
          </h1>

          <p class="max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {{ t('home.heroDescription') }}
          </p>
        </div>
      </div>
    </NCard>

    <!-- 快速入口 -->
    <section class="space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {{ t('home.quickAccess') }}
        </h2>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t('home.quickAccessDesc') }}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NCard
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

            <NButton
              type="primary"
              size="small"
              class="mt-1 w-full"
              tag="a"
              :href="item.to"
            >
              {{ t('home.enterManagement') }}
            </NButton>
          </div>
        </NCard>
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
          {{ t('home.coreFeatures') }}
        </h2>
      </div>

      <NCard class="border-dashed bg-neutral-50/60 dark:bg-neutral-900/60">
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
      </NCard>
    </section>
  </div>
</template>
