<script setup lang="ts">
import {
  NButton,
  NConfigProvider,
  NDialogProvider,
  NGlobalStyle,
  NLoadingBarProvider,
  NLayoutContent,
  NLayoutFooter,
  NLayoutHeader,
  NMessageProvider,
  NIcon,
  NNotificationProvider,
  NMenu,
  darkTheme,
  type GlobalThemeOverrides
} from 'naive-ui'
LogoGithub
import { LogoGithub } from '@vicons/ionicons5'
import type { MenuOption } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useUiStore } from '~/stores/ui'

const appConfig = useAppConfig()
const { t } = useI18n()

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

const uiStore = useUiStore()
const { isDark, enablePageTransition, appTheme, pageAnimateType } = storeToRefs(uiStore)

onMounted(() => {
  uiStore.init()
})

const naiveTheme = computed(() => (isDark.value ? darkTheme : null))

const themeOverrides = computed<GlobalThemeOverrides>(() => ({
  common: {
    primaryColor: appTheme.value,
    primaryColorHover: appTheme.value,
    primaryColorPressed: appTheme.value,
    primaryColorSuppl: appTheme.value
  }
}))

const pageTransition = computed(() =>
  enablePageTransition.value
    ? { name: pageAnimateType.value, mode: 'out-in' as const }
    : false
)
</script>

<template>
  <n-config-provider
    :theme="naiveTheme"
    :theme-overrides="themeOverrides"
  >
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

                  <div class="flex items-center gap-3">
                    <nav class="flex gap-1">
                      <n-menu :options="items" mode="horizontal" />
                    </nav>
                    <SharedProjectSetting />
                  </div>
                </div>
              </n-layout-header>

              <n-layout-content>
                <main class="w-full max-w-7xl mx-auto px-6 pt-8 pb-0">
                  <NuxtLayout>
                    <NuxtPage :transition="pageTransition" />
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
                        <template #icon>
                          <n-icon><LogoGithub /></n-icon>
                        </template>
                      </NButton>
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
