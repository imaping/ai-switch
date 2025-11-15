import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

// 参考 naive-ui-admin 的设计设置，裁剪出：主题、系统主题色、路由动画
const DEFAULT_APP_THEME_LIST: string[] = [
  '#2d8cf0',
  '#0960bd',
  '#0084f4',
  '#009688',
  '#536dfe',
  '#ff5c93',
  '#ee4f12',
  '#0096c7',
  '#9c27b0',
  '#ff9800',
  '#FF3D68',
  '#00C1D4',
  '#71EFA3',
  '#171010',
  '#78DEC7',
  '#1768AC',
  '#FB9300',
  '#FC5404'
]

const DEFAULT_APP_THEME = '#2d8cf0'
const DEFAULT_PAGE_ANIMATE_TYPE = 'zoom-fade'

export type PageAnimateType =
  | 'zoom-fade'
  | 'zoom-out'
  | 'fade-slide'
  | 'fade'
  | 'fade-bottom'
  | 'fade-scale'

interface UiState {
  // 主题模式（包含跟随系统）
  themeMode: ThemeMode
  // 是否为深色主题（由 themeMode + 系统偏好计算）
  isDark: boolean
  // 系统主题色
  appTheme: string
  // 系统内置主题色列表
  appThemeList: string[]
  // 是否启用页面动画
  enablePageTransition: boolean
  // 页面动画类型
  pageAnimateType: PageAnimateType
  // 系统是否偏好深色
  systemPrefersDark: boolean
}

interface PersistedSettings {
  themeMode: ThemeMode
  enablePageTransition: boolean
  appTheme: string
  pageAnimateType: PageAnimateType
}

const STORAGE_KEY = 'ai-switch-ui-settings'

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    themeMode: 'light',
    isDark: false,
    appTheme: DEFAULT_APP_THEME,
    appThemeList: DEFAULT_APP_THEME_LIST,
    enablePageTransition: true,
    pageAnimateType: DEFAULT_PAGE_ANIMATE_TYPE,
    systemPrefersDark: false
  }),
  actions: {
    init() {
      if (!import.meta.client) return

      // 读取本地持久化设置
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedSettings>
          if (
            parsed.themeMode === 'light' ||
            parsed.themeMode === 'dark' ||
            parsed.themeMode === 'system'
          ) {
            this.themeMode = parsed.themeMode
          }
          if (typeof parsed.enablePageTransition === 'boolean') {
            this.enablePageTransition = parsed.enablePageTransition
          }
          if (typeof parsed.appTheme === 'string') {
            this.appTheme = parsed.appTheme
          }
          if (
            parsed.pageAnimateType &&
            [
              'zoom-fade',
              'zoom-out',
              'fade-slide',
              'fade',
              'fade-bottom',
              'fade-scale'
            ].includes(parsed.pageAnimateType)
          ) {
            this.pageAnimateType = parsed.pageAnimateType as PageAnimateType
          }
        }
      } catch (err) {
        console.warn('[ui-store] 读取本地设置失败', err)
      }

      const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
      if (mq) {
        this.systemPrefersDark = mq.matches
        // 跟随系统主题变化
        mq.addEventListener?.('change', (e) => {
          this.systemPrefersDark = e.matches
          if (this.themeMode === 'system') {
            this.syncTheme()
          }
        })
      }

      this.syncTheme()
    },

    setThemeMode(mode: ThemeMode) {
      this.themeMode = mode
      this.persist()
      this.syncTheme()
    },

    setAppTheme(color: string) {
      this.appTheme = color
      this.persist()
    },

    setEnablePageTransition(value: boolean) {
      this.enablePageTransition = value
      this.persist()
    },

    setPageAnimateType(type: PageAnimateType) {
      this.pageAnimateType = type
      this.persist()
    },

    syncTheme() {
      const isDark =
        this.themeMode === 'dark' ||
        (this.themeMode === 'system' && this.systemPrefersDark)

      this.isDark = isDark

      if (!import.meta.client) return

      // 切换 html 的 dark class，便于 Tailwind 等使用
      document.documentElement.classList.toggle('dark', isDark)
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light')
    },

    persist() {
      if (!import.meta.client) return
      const data: PersistedSettings = {
        themeMode: this.themeMode,
        enablePageTransition: this.enablePageTransition,
        appTheme: this.appTheme,
        pageAnimateType: this.pageAnimateType
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (err) {
        console.warn('[ui-store] 持久化设置失败', err)
      }
    }
  }
})
