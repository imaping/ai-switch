// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
)

export default defineNuxtConfig({
  // Nuxt 4 默认 srcDir 为 app/，这里显式指定，便于团队理解目录结构
  srcDir: 'app',
  compatibilityDate: '2025-07-15',

  modules: ['@pinia/nuxt', '@nuxtjs/i18n', 'nuxtjs-naive-ui'],

  i18n: {
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'zh', language: 'zh-CN', name: '简体中文', file: 'zh.json' }
    ],
    defaultLocale: 'zh',
    strategy: 'no_prefix',
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root'
    }
  },

  appConfig: {
    version: packageJson.version
  },

  // 全局样式：引入 Tailwind 与 Nuxt UI 的样式入口。
  // 若未配置该项，页面将呈现为未样式化的纯 HTML（你看到的现象）。
  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  typescript: {
    strict: true,
    typeCheck: false  // 开发时禁用以提高性能,构建前启用
  },

  nitro: {
    externals: {
      inline: []
    },
    moduleSideEffects: ['ssh2', 'cpu-features'],
    experimental: {
      wasm: false
    },
    rollupConfig: {
      external: ['ssh2']
    }
  },

  vite: {
    // Vite 相关配置：保留原有 optimizeDeps，并为 Naive UI 配置 SSR noExternal
    optimizeDeps: {
      // 排除 native 模块和服务器端依赖
      exclude: ['ssh2', 'cpu-features'],
      // 确保在客户端预打包 CJS 模块，避免浏览器端 exports 报错
      include: ['@iarna/toml']
    },
    ssr: {
      // Naive UI 官方建议在 SSR/SSG 中不要 external 这些包
      noExternal: ['naive-ui', 'vueuc', 'date-fns']
    }
  },
  app: {
    head: {
      title: 'AI Switch - Environment Manager',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Claude & Codex Environment Manager' }
      ],
      link: [
        // SVG 版本（现代浏览器）
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg'
        }
      ]
    }
  }
})
