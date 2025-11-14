<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const appConfig = useAppConfig()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Claude',
    to: '/claude',
    active: route.path.startsWith('/claude')
  },
  {
    label: 'Codex',
    to: '/codex',
    active: route.path.startsWith('/codex')
  },
  {
    label: '远程管理',
    to: '/remote',
    active: route.path.startsWith('/remote')
  }
])

const version = appConfig.version
</script>

<template>
  <UApp>
    <UHeader title="AI SWITCH">

      <template #right>
        <UNavigationMenu :items="items" />
        <SharedPrimaryColorSwitcher />
      </template>
    </UHeader>

    <!-- 覆盖 UMain 最小高度，扣除 Header、Footer 与分隔条高度，避免首页出现滚动条 -->
    <UMain class="min-h-[calc(100dvh-var(--ui-header-height)-var(--app-footer-h,64px)-var(--app-sep-h,1px))]">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>

    <USeparator icon="i-simple-icons-nuxtdotjs" type="dashed" class="h-px" />

    <UFooter>
      <template #left>
        <p class="text-muted text-sm">
          Copyright © {{ new Date().getFullYear() }} · v{{ version }}
        </p>
      </template>

      <template #right>
        <UButton
          icon="i-simple-icons-github"
          color="neutral"
          variant="ghost"
          to="https://github.com/imaping/ai-switch"
          target="_blank"
          aria-label="GitHub"
        />
      </template>
    </UFooter>
  </UApp>
</template>
