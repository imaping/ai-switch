<script setup lang="ts">
import { NCard } from 'naive-ui'

const { t } = useI18n()

definePageMeta({
  title: 'AI Switch - 首页',
})

const quickLinks = computed(() => [
  {
    label: t('home.manageClaude'),
    description: t('home.manageClaudeDesc'),
    to: '/claude',
    icon: '🤖',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    hoverColor: 'hover:border-blue-300',
  },
  {
    label: t('home.manageCodex'),
    description: t('home.manageCodexDesc'),
    to: '/codex',
    icon: '⬡',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    hoverColor: 'hover:border-purple-300',
  },
  {
    label: t('home.manageRemote'),
    description: t('home.manageRemoteDesc'),
    to: '/remote',
    icon: '🖥️',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    hoverColor: 'hover:border-green-300',
  },
])

const coreFeatures = computed(() => [
  { text: t('home.feature1'), icon: '⚙️' },
  { text: t('home.feature2'), icon: '🔌' },
  { text: t('home.feature3'), icon: '💰' },
  { text: t('home.feature4'), icon: '🌐' },
  { text: t('home.feature5'), icon: '📋' },
])
</script>

<template>
  <div class="space-y-12">
    <!-- Hero 区域 -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 md:p-12 shadow-lg border border-gray-100">
      <div class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-200/30 via-purple-200/20 to-transparent rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-200/20 via-blue-200/20 to-transparent rounded-full blur-3xl"></div>

      <div class="relative z-10 space-y-6">
        <div class="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-gray-700 shadow-sm border border-gray-200">
          <span class="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>{{ t('home.tagline') }}</span>
        </div>

        <div>
          <h1 class="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-3">
            {{ t('home.heroTitle') }}
          </h1>
          <p class="text-xl md:text-2xl font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {{ t('home.heroSubtitle') }}
          </p>
        </div>

        <p class="max-w-2xl text-base leading-relaxed text-gray-600">
          {{ t('home.heroDescription') }}
        </p>
      </div>
    </div>

    <!-- 快速入口 -->
    <section class="space-y-6">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 mb-1">
            {{ t('home.quickAccess') }}
          </h2>
          <p class="text-sm text-gray-500">
            {{ t('home.quickAccessDesc') }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <NuxtLink
          v-for="item in quickLinks"
          :key="item.to"
          :to="item.to"
          :class="[
            'group relative overflow-hidden rounded-xl bg-white p-6 border-2 border-gray-200 transition-all duration-300',
            'hover:-translate-y-1 hover:shadow-xl',
            item.hoverColor
          ]"
        >
          <div class="flex flex-col gap-4 h-full">
            <div class="flex items-center gap-3">
              <div :class="['flex h-12 w-12 items-center justify-center rounded-xl text-2xl', item.bgColor]">
                {{ item.icon }}
              </div>
              <h3 class="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {{ item.label }}
              </h3>
            </div>

            <p class="flex-1 text-sm leading-relaxed text-gray-600">
              {{ item.description }}
            </p>

            <div class="flex items-center text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
              <span>{{ t('home.enterManagement') }}</span>
              <span class="transform group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- 核心功能列表 -->
    <section class="space-y-6">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl shadow-lg">
          ✨
        </div>
        <h2 class="text-2xl font-bold text-gray-900">
          {{ t('home.coreFeatures') }}
        </h2>
      </div>

      <div class="rounded-xl bg-gradient-to-br from-gray-50 to-blue-50/30 p-8 border border-gray-200">
        <ul class="grid gap-4 md:grid-cols-2">
          <li
            v-for="(feature, index) in coreFeatures"
            :key="index"
            class="flex items-start gap-3 bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow"
          >
            <span class="flex-shrink-0 text-2xl">
              {{ feature.icon }}
            </span>
            <span class="text-sm text-gray-700 leading-relaxed pt-1">
              {{ feature.text }}
            </span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
