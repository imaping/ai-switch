<script setup lang="ts">
import { ref } from 'vue'
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
import { useUiStore } from '~/stores/ui'

const uiStore = useUiStore()

const isDrawer = ref(false)
const title = '项目配置'
const width = 280

const animateOptions = [
  { value: 'zoom-fade', label: '渐变' },
  { value: 'zoom-out', label: '闪现' },
  { value: 'fade-slide', label: '滑动' },
  { value: 'fade', label: '消退' },
  { value: 'fade-bottom', label: '底部消退' },
  { value: 'fade-scale', label: '缩放消退' }
]

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
</script>

<template>
  <div class="flex items-center">
    <NButton
      quaternary
      circle
      size="small"
      aria-label="项目设置"
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
      <NDrawerContent :title="title" :native-scrollbar="false">
        <div class="space-y-4">
          <NDivider title-placement="center">
            主题
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
              <span>{{ uiStore.isDark ? '深' : '浅' }}色主题</span>
            </NTooltip>
          </div>

          <NDivider title-placement="center">
            系统主题
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
            动画
          </NDivider>

          <div class="flex items-center justify-between">
            <div class="text-sm">
              启用动画
            </div>
            <NSwitch
              :value="uiStore.enablePageTransition"
              @update:value="handleAnimateSwitchChange"
            />
          </div>

          <div class="flex items-center justify-between gap-3">
            <div class="text-sm whitespace-nowrap">
              动画类型
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
