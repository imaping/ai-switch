# 从 Nuxt UI 迁移到 Naive UI 规划（ai-switch-nust）

> 本文只规划迁移方案，不包含具体代码改动实现。目标是**完全替换 Nuxt UI，为 Naive UI 重写 UI 层，不做兼容层**。

## 一、现状梳理

### 1.1 依赖与配置

- 依赖：`package.json` 中引用 `@nuxt/ui`。
- Nuxt 模块：`nuxt.config.ts` 中 `modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxtjs/i18n']`。
- 颜色模式：`nuxt.config.ts` 中使用 `colorMode`（可继续沿用）。
- 全局样式：
  - `app/assets/css/main.css` 引入 `@nuxt/ui`，并基于 `--ui-*` 变量实现 `primary / neutral / radius` 三套主题配置。
- App 配置：
  - `app/app.config.ts` 中通过 `appConfig.ui.colors.primary / neutral` 定义默认主题色。

### 1.2 Nuxt UI 组件使用范围

主要集中在：

- 全局布局（`app/app.vue`）
  - `<UApp>`, `<UHeader>`, `<UMain>`, `<UFooter>`, `<USeparator>`, `<UNavigationMenu>`。
- 主题切换（`app/components/shared/PrimaryColorSwitcher.vue`）
  - 使用 `<UPopover>`, `<UButton>`, `<UIcon>`，并通过 `data-primary / data-neutral / data-radius` + `appConfig.ui.colors` 控制主题。
- 表单组件
  - `<UForm>`, `<UFormField>`, `<UInput>`, `<UTextarea>`, `<USelect>`, `<UCheckbox>`, `<USwitch>`, `<UCollapsible>` 等。
  - 典型文件：
    - `app/components/claude/EnvironmentForm.vue`
    - `app/components/claude/McpForm.vue`
    - `app/components/codex/EnvironmentForm.vue`
    - `app/components/codex/McpForm.vue`
    - `app/components/codex/GeneralConfigForm.vue`
    - `app/components/remote/HostForm.vue`
- 列表与卡片
  - `<UCard>`, `<UTable>`, `<UBadge>` 等。
  - 典型文件：
    - `app/pages/claude.vue`
    - `app/pages/codex.vue`
    - `app/pages/remote.vue`
- 弹窗与反馈
  - `<UModal>`, `<UAlert>`, `<USwitch>` 等。
  - 使用 Nuxt UI 的 `useToast()` 提示：
    - `app/pages/claude.vue`
    - `app/pages/codex.vue`
    - `app/pages/remote.vue`
    - 各环境 / MCP 表单组件中。

### 1.3 类型与工具

- 类型：`NavigationMenuItem`, `TableColumn` 等类型从 `@nuxt/ui` 引入：
  - `app/app.vue`：`NavigationMenuItem`
  - `app/pages/*.vue`：`TableColumn`
- 工具：`useToast`（Nuxt UI 提示 API）。

## 二、目标与技术选型

### 2.1 目标

- 从 UI 层完全移除 `@nuxt/ui` 及其样式。
- 统一改为使用 Naive UI：
  - 组件：使用 Naive UI 官方组件（`n-button`, `n-card`, `n-data-table`, `n-modal` 等）。
  - 全局反馈：使用 `useMessage / useNotification / useDialog / useLoadingBar`。
  - 主题：基于 `NConfigProvider` + `theme` / `theme-overrides` 实现暗色模式和基础主题色。
- 保持业务逻辑、接口层、Store、i18n 不变。

### 2.2 集成方式选型

参考 Naive UI 官方 Nuxt 集成文档（Context7 /tusen-ai/naive-ui）：

- 安装 Nuxt 模块 `nuxtjs-naive-ui`（官方示例）：

  ```bash
  # npm
  npx nuxi module add nuxtjs-naive-ui

  # pnpm
  pnpm dlx nuxi module add nuxtjs-naive-ui
  ```

- 在 `nuxt.config.ts` 中使用模块并配置 Vite 插件，实现 API / 组件自动导入：

  ```ts
  import AutoImport from 'unplugin-auto-import/vite'
  import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
  import Components from 'unplugin-vue-components/vite'

  export default defineNuxtConfig({
    modules: [
      'nuxtjs-naive-ui',
      '@pinia/nuxt',
      '@nuxtjs/i18n',
    ],
    vite: {
      plugins: [
        AutoImport({
          imports: [
            {
              'naive-ui': [
                'useDialog',
                'useMessage',
                'useNotification',
                'useLoadingBar',
              ],
            },
          ],
        }),
        Components({
          resolvers: [NaiveUiResolver()],
        }),
      ],
      ssr: {
        // 参考官方 SSR 指南，确保 Naive UI 相关包不被 external 掉
        noExternal: ['naive-ui', 'vueuc', 'date-fns'],
      },
    },
  })
  ```

> 实际落地时需要将上述配置与当前 `nuxt.config.ts` 合并，并删除 `@nuxt/ui` 模块。

## 三、全局布局与主题方案

### 3.1 顶层布局重写（app/app.vue）

现状：

- 使用 Nuxt UI 布局组件：`<UApp> + <UHeader> + <UMain> + <UFooter> + <USeparator>`。
- 使用 `<UNavigationMenu>` 渲染导航。

规划：

- 改用 Naive UI Provider + 自定义 HTML 布局（+ Tailwind）：
  - 外层使用 `<n-config-provider>` 负责主题与全局样式。
  - 内层使用 Naive UI 的 Provider：
    - `<n-message-provider>`
    - `<n-notification-provider>`
    - `<n-dialog-provider>`
    - `<n-loading-bar-provider>`
  - 布局结构可以改为：
    - `<header>`：标题、导航、主题切换按钮。
    - `<main>`：`<NuxtLayout><NuxtPage /></NuxtLayout>`。
    - `<footer>`：版权信息、语言切换等。
- 导航菜单：
  - 从 `NavigationMenuItem` + `<UNavigationMenu>` 改为：
    - 方案 A：使用 `<n-menu>`（基于 options 定义菜单）。
    - 方案 B：保留现有 `items` 计算逻辑，使用 `<nav>` + `<NuxtLink>` 手写导航（配合 Tailwind）。
  - 鉴于导航结构简单（3 个入口），建议优先采用方案 B，减少对 Naive UI 菜单 API 的依赖。

### 3.2 主题与暗色模式

现状：

- 暗色模式：依赖 Nuxt `colorMode` 模块（`useColorMode`），配合 `data-theme` 与 Nuxt UI 的 dark 主题。
- 主题色：
  - `PrimaryColorSwitcher` 控制 `data-primary / data-neutral / data-radius`。
  - `app/assets/css/main.css` 通过 `--ui-*` 变量（来自 Nuxt UI）实现主题变体。

规划：

1. 沿用 `useColorMode`，在 `app/app.vue` 中根据 `colorMode.value` 切换 Naive UI 主题：
   - `theme = colorMode.value === 'dark' ? darkTheme : null`。
   - `<n-config-provider :theme="theme">...</n-config-provider>`。
2. 主色 / 中性色 / 圆角：
   - 使用 Naive UI 的 `theme-overrides`：
     - `GlobalThemeOverrides['common'].primaryColor`
     - `GlobalThemeOverrides['common'].borderRadius` 等。
   - 规划新增一个组合式函数，例如 `useNaiveThemeConfig`：
     - 负责维护 `primary`, `neutral`, `radius` 三个状态（可与现有 `PrimaryColorSwitcher` 对接）。
     - 输出 `themeOverrides: GlobalThemeOverrides` 供 `<n-config-provider :theme-overrides="themeOverrides">` 使用。
3. 原本依赖 `--ui-*` 的 CSS：
   - 第一阶段：保留 `data-primary / data-neutral / data-radius` 的数据结构，但不再依赖 `--ui-*` 变量（避免无效样式）。
   - 第二阶段（可选优化）：按需改写 `app/assets/css/main.css`，直接使用 Tailwind 类或 Naive UI 的 `useThemeVars` 做定制。

### 3.3 PrimaryColorSwitcher 改造

现状：

- 使用 `<UPopover> + <UButton> + <UIcon>` 渲染面板。
- 通过操作 `document.documentElement.dataset` + `appConfig.ui.colors` 间接影响 Nuxt UI。

规划：

- UI 层迁移：
  - `<UPopover>` 改为 `<n-popover>`。
  - 触发按钮 `<UButton>` 改为 `<n-button>` 或 `<button>` + Tailwind。
  - `UIcon` 改为任意图标方案（若继续用 UnoCSS 图标，只保留类名）。
- 状态管理：
  - 不再依赖 `appConfig.ui`，改为依赖 `useNaiveThemeConfig`（见 3.2）。
  - 保留当前 `primaryOptions / neutralOptions / radiusOptions / themeOptions` 数据结构，仅更新触发函数：
    - `setPrimary`：更新主题配置中的 `primaryColor`。
    - `setRadius`：更新 `GlobalThemeOverrides.common.borderRadius`。
    - `setTheme`：更新 `colorMode.preference`（沿用现有逻辑）。

## 四、组件映射与替换策略

### 4.1 组件映射一览（方向性）

| 场景           | Nuxt UI                   | Naive UI / 其他                         | 说明 |
| -------------- | ------------------------- | --------------------------------------- | ---- |
| 布局容器       | `UApp`, `UMain`          | `<n-layout>` 或普通 `<div>`+Tailwind    | 建议用普通 HTML，减少耦合 |
| 页头 / 页脚    | `UHeader`, `UFooter`     | `<header>`, `<footer>` + Tailwind       | 保留现有样式类 |
| 分隔线         | `USeparator`             | `<n-divider>` 或 `<hr>`                 | 取决于是否需要 Naive UI 风格 |
| 导航菜单       | `UNavigationMenu`        | `<nav>` + `<NuxtLink>` 或 `<n-menu>`    | 当前导航较简单，可手写 |
| 卡片           | `UCard`                  | `<n-card>`                              | 保留 header slot 结构 |
| 表格           | `UTable` + `TableColumn` | `<n-data-table>` + `DataTableColumns`   | 需重写列定义类型与 `h` 渲染函数 |
| 表单根         | `UForm`                  | `<n-form>`                              | 手动控制校验与提交逻辑 |
| 表单项         | `UFormField`             | `<n-form-item>`                         | label / path 对应 |
| 输入框         | `UInput`                 | `<n-input>`                             | 文本与密码等 |
| 多行输入       | `UTextarea`              | `<n-input type="textarea">`             | 调整 props |
| 下拉选择       | `USelect`                | `<n-select>`                            | `items` → `options`，`label/value` 对应 |
| 复选框         | `UCheckbox`              | `<n-checkbox>`                          | API 相对接近 |
| 开关           | `USwitch`                | `<n-switch>`                            | 注意 `v-model`/`checked` 差异 |
| 折叠面板       | `UCollapsible`           | `<n-collapse>` + `<n-collapse-item>`    | 将单一内容改为 collapse item |
| 警告提示       | `UAlert`                 | `<n-alert>`                             | `type` / `title` / `closable` 对应 |
| 模态框         | `UModal`                 | `<n-modal>` 或 `useDialog`              | 可继续使用显式 `v-model` |
| Toast 提示     | `useToast().add()`       | `useMessage()` / `useNotification()`    | 见 4.3 |

> 映射表是方向性说明，实际迁移时需按组件 API 逐个对齐。

### 4.2 表格（UTable）迁移策略

现状：

- 使用 `TableColumn<T>` 类型，`cell` 回调中通过 `h(UButton, ...)` 等方式渲染操作列。
- 典型场景：环境列表、MCP 列表、远程主机列表。

规划：

- 将 `TableColumn<T>` 替换为 Naive UI 的 `DataTableColumns<T>`：
  - `header` → `title`。
  - `accessorKey` → `key`。
  - `cell` → `render(row)`。
- 将 `h(UButton, ...)` 等节点改为：
  - 使用 `<n-button>` 对应的渲染函数（通过 `h` 或 JSX）。
  - 或拆分为单独小组件，在模板中使用 `<n-data-table>` 的插槽进行渲染（可读性更好）。

### 4.3 Toast / 通知迁移策略

现状：

- `const toast = useToast()`。
- `toast.add({ title, description, color, icon })`。

规划：

- 使用自动导入的 `useMessage` 或 `useNotification`：

  ```ts
  const message = useMessage()
  // 成功
  message.success(t('xxx'), { duration: 3000 })
  // 失败
  message.error(error.message || t('xxx'))
  ```

- 若需要带标题与描述的复杂通知，可改用：

  ```ts
  const notification = useNotification()
  notification.success({
    title: t('xxx'),
    description: t('yyy'),
    duration: 3000,
  })
  ```

- 迁移策略：
  - 环境创建 / 更新 / 删除 → `message.success / message.error`。
  - 测试连接 / 查询余额等操作 → `message` 为主，如需更丰富信息再升级为 `notification`。

## 五、分阶段迁移步骤清单

> 建议按页面 / 功能块分批迁移，保证每一步都可运行、可回滚。

### 阶段 0：准备

1. 新建迁移分支（如 `feat/naive-ui-migration`）。
2. 锁定当前依赖版本，确保有可用的回滚点。

### 阶段 1：依赖与基础配置

1. 安装 Naive UI 相关依赖：
   - `naive-ui`
   - `nuxtjs-naive-ui`
   - `unplugin-auto-import`
   - `unplugin-vue-components`
2. 更新 `nuxt.config.ts`：
   - 从 `modules` 中移除 `@nuxt/ui`。
   - 增加 `nuxtjs-naive-ui` 模块。
   - 合并官方 Nuxt 集成示例中的 `vite.plugins` 与 `vite.ssr.noExternal` 配置。
   - 保留现有 `colorMode`, `i18n`, `pinia` 配置。
3. 确保开发环境能成功启动（即使 UI 尚未迁移完成）。

### 阶段 2：全局布局与 Provider

1. 重写 `app/app.vue`：
   - 去掉所有 `U*` 布局组件。
   - 增加 `<n-config-provider>`，并在内部使用：
     - `<n-dialog-provider>`
     - `<n-message-provider>`
     - `<n-notification-provider>`
     - `<n-loading-bar-provider>`
   - 使用 `<header>/<main>/<footer>` 或 `<n-layout>` 重建布局。
2. 导航区域改造：
   - 使用 `<nav>` + `<NuxtLink>` 或 `<n-menu>` 实现三项导航（Claude / Codex / Remote）。
3. 页面在 UI 尚未迁移前可以先用最简 HTML + Tailwind 占位，保证路由、数据流正常。

### 阶段 3：主题与 PrimaryColorSwitcher

1. 新增 `useNaiveThemeConfig` 组合式函数（路径待定，如 `app/composables/useNaiveThemeConfig.ts`）：
   - 封装：
     - `primary`, `neutral`, `radius` 状态。
     - 生成 `themeOverrides: GlobalThemeOverrides`。
   - 负责与 `colorMode` 协同（暗色 / 亮色下使用不同 overrides）。
2. 改造 `PrimaryColorSwitcher.vue`：
   - 替换 UI 组件为 Naive UI 或普通 HTML。
   - 调用 `useNaiveThemeConfig` 进行状态更新，不再写入 `appConfig.ui`。
3. 清理或重写 `app/assets/css/main.css` 中依赖 `--ui-*` 的部分：
   - 初期可以只移除 `@import "@nuxt/ui";`，保留 Tailwind 与必要自定义样式。
   - 若保留 `data-primary` 等属性，则需根据实际需要改写对应 CSS（可后置到视觉调优阶段）。

### 阶段 4：页面与表单组件迁移

按功能块逐步迁移，推荐顺序：

1. Remote 页面与 HostForm：
   - `app/pages/remote.vue`
   - `app/components/remote/HostForm.vue`
2. Claude 页面与相关表单：
   - `app/pages/claude.vue`
   - `app/components/claude/EnvironmentForm.vue`
   - `app/components/claude/McpForm.vue`
   - `app/components/claude/GeneralConfigForm.vue`
3. Codex 页面与相关表单：
   - `app/pages/codex.vue`
   - `app/components/codex/EnvironmentForm.vue`
   - `app/components/codex/McpForm.vue`
   - `app/components/codex/GeneralConfigForm.vue`

每个页面迁移时的具体步骤：

1. 将模板中的 `U*` 标签替换为对应的 Naive UI 组件或 HTML：
   - 按 4.1 的映射表逐一替换。
   - 尽量保留 Tailwind 类名，减少视觉差异。
2. 替换脚本部分的类型与 API：
   - `TableColumn` → `DataTableColumns`。
   - `useToast` → `useMessage / useNotification`。
   - 移除 `resolveComponent('UButton')` 等对 Nuxt UI 内部组件的动态解析。
3. 手动验证每个页面的核心流程：
   - 新增 / 编辑 / 删除环境或 MCP。
   - 远程连接测试。
   - 余额查询。

### 阶段 5：清理与收尾

1. 从 `package.json` 删除 `@nuxt/ui` 依赖，更新锁文件。
2. 全局搜索：
   - 所有 `U*` 组件引用是否已移除。
   - 所有 `@nuxt/ui` 类型与导入是否已删除。
   - 所有 `useToast` 是否已替换为 Naive UI 的消息 / 通知 API。
3. 清理无用样式：
   - `main.css` 中若仍残留与 Nuxt UI 强耦合的变量定义，视情况移除或重写。
4. 手动回归测试：
   - 中英文切换。
   - 深浅色主题切换。
   - Primary / Neutral / Radius 调整（若已按 3.2 完成接入）。

## 六、注意事项与风险点

- SSR 与打包：
  - 需确认在 `nuxt.config.ts` 中对 `naive-ui`, `vueuc`, `date-fns` 的 `noExternal` 配置与当前项目的 Nitro / Vite 配置不冲突。
- 主题一致性：
  - Nuxt UI 与 Naive UI 的设计语言不同，完全 1:1 视觉平移成本较高。
  - 本规划优先保证交互与功能，其次再进行视觉微调。
- API 差异：
  - 表格、表单的类型与校验 API 差异较大，迁移时建议分模块、配合单元测试或手工场景测试。

> 后续若需要，我可以基于本规划按模块逐步提交实际迁移代码（从 `app/app.vue` 与 Remote 模块开始）。

