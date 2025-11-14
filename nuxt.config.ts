// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Nuxt 4 默认 srcDir 为 app/，这里显式指定，便于团队理解目录结构
  srcDir: 'app',
  compatibilityDate: '2025-07-15',

  modules: ['@nuxt/ui', '@pinia/nuxt'],

  // 全局样式：引入 Tailwind 与 Nuxt UI 的样式入口。
  // 若未配置该项，页面将呈现为未样式化的纯 HTML（你看到的现象）。
  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  typescript: {
    strict: true,
    typeCheck: false  // 开发时禁用以提高性能,构建前启用
  },

  nitro: {
    // 将 native 模块标记为外部依赖
    externals: {
      inline: []
    },
    // 不打包这些模块
    moduleSideEffects: [],
    alias: {
      // 确保 ssh2 使用原生模块
      ssh2: 'ssh2'
    }
  },

  vite: {
    optimizeDeps: {
      // 排除 native 模块和服务器端依赖
      exclude: ['ssh2', 'cpu-features'],
      // 确保在客户端预打包 CJS 模块，避免浏览器端 exports 报错
      include: ['@iarna/toml']
    },
    ssr: {
      // 不要在 SSR 构建中尝试外部化这些包
      noExternal: []
    }
  },

  colorMode: {
    preference: 'dark'
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
