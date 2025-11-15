<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NButton,
  NDrawer,
  NDrawerContent,
  NDivider,
  NIcon,
  NSelect,
  NSwitch,
  NTooltip
} from 'naive-ui'
import { Checkmark, Moon, SunnySharp, Settings } from '@vicons/ionicons5'
import { useI18n } from '#imports'
import { useUiStore } from '~/stores/ui'

const uiStore = useUiStore()
const { t, locale, locales, setLocale } = useI18n()

const isDrawer = ref(false)
const width = 320

const animateOptions = computed(() => [
  { value: 'zoom-fade', label: t('projectSetting.animates.zoomFade') },
  { value: 'zoom-out', label: t('projectSetting.animates.zoomOut') },
  { value: 'fade-slide', label: t('projectSetting.animates.fadeSlide') },
  { value: 'fade', label: t('projectSetting.animates.fade') },
  { value: 'fade-bottom', label: t('projectSetting.animates.fadeBottom') },
  { value: 'fade-scale', label: t('projectSetting.animates.fadeScale') }
])

const handleDarkChange = (value: boolean) => {
  uiStore.setThemeMode(value ? 'dark' : 'light')
}

const handleThemeColorClick = (color: string) => {
  uiStore.setAppTheme(color)
}

const handleAnimateSwitchChange = (value: boolean) => {
  uiStore.setEnablePageTransition(value)
}

const handleAnimateTypeChange = (value: string) => {
  uiStore.setPageAnimateType(value as any)
}

const localeOptions = computed(() =>
  locales.value.map((loc: any) => ({
    label: (loc as any).name || (loc as any).code,
    value: loc.code
  }))
)

const handleLocaleChange = (value: string) => {
  setLocale(value)
}
</script>

<template>
  <div class="flex items-center">
    <NButton
      quaternary
      circle
      size="small"
      :aria-label="t('projectSetting.title')"
      @click="isDrawer = true"
    >
      <template #icon>
        <n-icon><Settings /></n-icon>
      </template>
    </NButton>

    <NDrawer
      v-model:show="isDrawer"
      :width="width"
      placement="right"
    >
      <NDrawerContent :title="t('projectSetting.title')" :native-scrollbar="false">
        <div class="space-y-4">
          <NDivider title-placement="center">
            {{ t('projectSetting.theme') }}
          </NDivider>

          <div class="flex justify-center">
            <NTooltip placement="bottom">
              <template #trigger>
                <NSwitch
                  :value="uiStore.isDark"
                  class="dark-theme-switch"
                  @update:value="handleDarkChange"
                >
                  <template #checked>
                    <NIcon size="14" color="#ffd93b">
                      <SunnySharp />
                    </NIcon>
                  </template>
                  <template #unchecked>
                    <NIcon size="14" color="#ffd93b">
                      <Moon />
                    </NIcon>
                  </template>
                </NSwitch>
              </template>
              <span>
                {{
                  uiStore.isDark
                    ? t('projectSetting.darkTheme')
                    : t('projectSetting.lightTheme')
                }}
              </span>
            </NTooltip>
          </div>

          <NDivider title-placement="center">
            {{ t('projectSetting.systemTheme') }}
          </NDivider>

          <div class="flex flex-wrap gap-1">
            <button
              v-for="(item, index) in uiStore.appThemeList"
              :key="index"
              type="button"
              class="w-5 h-5 rounded border border-gray-200 flex items-center justify-center"
              :style="{ backgroundColor: item }"
              @click="handleThemeColorClick(item)"
            >
              <NIcon
                v-if="item === uiStore.appTheme"
                size="12"
                class="text-white"
              >
                <Checkmark />
              </NIcon>
            </button>
          </div>

          <NDivider title-placement="center">
            {{ t('projectSetting.language') }}
          </NDivider>

          <div class="flex items-center justify-between gap-3">
            <div class="text-sm whitespace-nowrap">
              {{ t('projectSetting.uiLanguage') }}
            </div>
            <div class="flex-1">
              <NSelect
                size="small"
                :value="locale"
                :options="localeOptions"
                @update:value="handleLocaleChange"
              />
            </div>
          </div>

          <NDivider title-placement="center">
            {{ t('projectSetting.animation') }}
          </NDivider>

          <div class="flex items-center justify-between">
            <div class="text-sm">
              {{ t('projectSetting.enableAnimation') }}
            </div>
            <NSwitch
              :value="uiStore.enablePageTransition"
              @update:value="handleAnimateSwitchChange"
            />
          </div>

          <div class="flex items-center justify-between gap-3">
            <div class="text-sm whitespace-nowrap">
              {{ t('projectSetting.animationType') }}
            </div>
            <div class="flex-1">
              <NSelect
                size="small"
                :value="uiStore.pageAnimateType"
                :options="animateOptions"
                @update:value="handleAnimateTypeChange"
              />
            </div>
          </div>
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
