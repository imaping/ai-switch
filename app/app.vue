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

</script>

<template>
  <n-config-provider>
    <n-dialog-provider>
      <n-notification-provider>
        <n-message-provider>
          <n-loading-bar-provider>
            <n-layout>
              <n-layout-header
                bordered
                class="h-14"
              >
                <div>
                  {{ t('app.title') }}

                  <nav >
                    <NuxtLink
                      v-for="item in items"
                      :key="item.to"
                      :to="item.to"
                    >
                      {{ item.label }}
                    </NuxtLink>
                  </nav>
                </div>
              </n-layout-header>

              <n-layout-content>
                <main>
                  <NuxtLayout>
                    <NuxtPage />
                  </NuxtLayout>
                </main>
              </n-layout-content>

              <n-layout-footer
                bordered
              >
                <div>
                  <p>
                    {{ t('footer.copyright') }} ©
                    {{ new Date().getFullYear() }} · v{{ version }}
                  </p>

                  <div>
                    <NButton
                      quaternary
                      size="small"
                      tag="a"
                      href="https://github.com/imaping/ai-switch"
                      target="_blank"
                      aria-label="GitHub"
                    >
                      <span/>
                      GitHub
                    </NButton>
                    <SharedLanguageSwitcher />
                  </div>
                </div>
              </n-layout-footer>
            </n-layout>
            <NGlobalStyle />
          </n-loading-bar-provider>
        </n-message-provider>
      </n-notification-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
