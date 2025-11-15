<script setup lang="ts">
import {
  NButton,
  NConfigProvider,
  NDialogProvider,
  NGlobalStyle,
  NLoadingBarProvider,
  NLayout,
  NLayoutContent,
  NLayoutFooter,
  NLayoutHeader,
  NMessageProvider,
  NNotificationProvider,
  NMenu
} from 'naive-ui'

import type { MenuOption } from 'naive-ui'
const route = useRoute()
const appConfig = useAppConfig()
const { t } = useI18n()

interface NavItem {
  label: string
  to: string
  active: boolean
}

const items = computed<MenuOption[]>(() => [
  {
    label: () =>
      h(
        NuxtLink,
        {
          to: '/claude'
        },
        { default: () => t('nav.claude') }
      ),
    key: 'claude'
  },{
    label: () =>
      h(
        NuxtLink,
        {
          to: '/codex'
        },
        { default: () => t('nav.codex') }
      ),
    key: 'codex'
  },{
    label: () =>
      h(
        NuxtLink,
        {
          to: '/remote'
        },
        { default: () => t('nav.remote') }
      ),
    key: 'remote'
  }
])

const version = appConfig.version

</script>

<template>
  <n-config-provider>
    <n-dialog-provider>
      <n-notification-provider>
        <n-message-provider>
          <n-loading-bar-provider>
            <div class="min-h-screen flex flex-col">
              <n-layout-header
                bordered
                class="h-16 flex items-center px-6 bg-white shadow-sm"
              >
                <div class="w-full max-w-7xl mx-auto flex items-center justify-between">
                  <NuxtLink
                    to="/"
                    class="text-xl font-bold text-gray-800 tracking-tight hover:text-blue-500 transition-colors cursor-pointer"
                  >
                    {{ t('app.title') }}
                  </NuxtLink>

                  <nav class="flex gap-1">
                    <n-menu :options="items" mode="horizontal"/>
                  </nav>
                </div>
              </n-layout-header>

              <n-layout-content>
                <main class="w-full max-w-7xl mx-auto px-6 pt-8 pb-0">
                  <NuxtLayout>
                    <NuxtPage />
                  </NuxtLayout>
                </main>
              </n-layout-content>

              <n-layout-footer
                bordered
                class="bg-gray-50 border-t border-gray-200"
              >
                <div class="w-full max-w-7xl mx-auto px-6 py-6">
                  <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p class="text-sm text-gray-600">
                      {{ t('footer.copyright') }} ©
                      {{ new Date().getFullYear() }} ·
                      <span class="text-gray-400 ml-1">v{{ version }}</span>
                    </p>

                    <div class="flex items-center gap-3">
                      <NButton
                        quaternary
                        size="small"
                        tag="a"
                        href="https://github.com/imaping/ai-switch"
                        target="_blank"
                        aria-label="GitHub"
                        class="text-gray-600! hover:text-gray-900! transition-colors"
                      >
                        <span class="i-carbon-logo-github text-lg mr-1"/>
                        GitHub
                      </NButton>
                      <div class="h-4 w-px bg-gray-300"></div>
                      <SharedLanguageSwitcher />
                    </div>
                  </div>
                </div>
              </n-layout-footer>
            </div>
            <NGlobalStyle />
          </n-loading-bar-provider>
        </n-message-provider>
      </n-notification-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
