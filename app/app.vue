<script setup lang="ts">
import {
  NButton,
  NConfigProvider,
  NDialogProvider,
  NGlobalStyle,
  NLoadingBarProvider,
  NMessageProvider,
  NNotificationProvider
} from 'naive-ui'

const route = useRoute()
const appConfig = useAppConfig()
const { t } = useI18n()

interface NavItem {
  label: string
  to: string
  active: boolean
}

const items = computed<NavItem[]>(() => [
  {
    label: t('nav.claude'),
    to: '/claude',
    active: route.path.startsWith('/claude')
  },
  {
    label: t('nav.codex'),
    to: '/codex',
    active: route.path.startsWith('/codex')
  },
  {
    label: t('nav.remote'),
    to: '/remote',
    active: route.path.startsWith('/remote')
  }
])

const version = appConfig.version

// Naive UI 主题（暗色/亮色 + 主色/圆角）
</script>

<template>
  <!-- 全局 Naive UI Provider：主题 + 消息/通知/对话框/加载条 -->
  <n-config-provider>
    <n-dialog-provider>
      <n-notification-provider>
        <n-message-provider>
          <n-loading-bar-provider>
            <div class="min-h-[100dvh] flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
              <!-- 顶部导航栏 -->
              <header class="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800/80 dark:bg-neutral-950/80">
                <div class="container mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold">{{ t('app.title') }}</span>
                  </div>

                  <nav class="flex items-center gap-3">
                    <NuxtLink
                      v-for="item in items"
                      :key="item.to"
                      :to="item.to"
                      :class="[
                        'text-sm transition-colors',
                        item.active
                          ? 'text-primary-500 font-medium'
                          : 'text-muted hover:text-neutral-100'
                      ]"
                    >
                      {{ item.label }}
                    </NuxtLink>

                    <SharedPrimaryColorSwitcher />
                  </nav>
                </div>
              </header>

              <!-- 主内容区域 -->
              <main class="flex-1">
                <NuxtLayout>
                  <NuxtPage />
                </NuxtLayout>
              </main>

              <!-- 顶部分隔线 -->
              <div class="h-px border-t border-dashed border-neutral-800/80" />

              <!-- 页脚 -->
              <footer
                class="flex h-[var(--app-footer-h,64px)] items-center bg-white/95 px-4 text-sm text-muted dark:bg-neutral-950/95"
              >
                <div class="container mx-auto flex max-w-7xl items-center justify-between">
                  <p>
                    {{ t('footer.copyright') }} ©
                    {{ new Date().getFullYear() }} · v{{ version }}
                  </p>

                  <div class="flex items-center gap-3">
                    <NButton
                      quaternary
                      size="small"
                      tag="a"
                      href="https://github.com/imaping/ai-switch"
                      target="_blank"
                      aria-label="GitHub"
                    >
                      <span class="i-simple-icons-github mr-1 inline-block h-4 w-4" />
                      GitHub
                    </NButton>
                    <SharedLanguageSwitcher />
                  </div>
                </div>
              </footer>
            </div>

            <!-- 同步全局样式（如 body 背景等） -->
            <NGlobalStyle />
          </n-loading-bar-provider>
        </n-message-provider>
      </n-notification-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
