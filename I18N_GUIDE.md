# 国际化 (i18n) 使用指南

本项目使用 `@nuxtjs/i18n` 模块实现国际化支持，目前支持**中文**和**英文**两种语言。

## 📁 文件结构

```
app/
  locales/           # 语言翻译文件目录
    zh.json         # 中文翻译
    en.json         # 英文翻译
  components/
    shared/
      LanguageSwitcher.vue  # 语言切换组件
```

## 🚀 快速开始

### 1. 在组件中使用 i18n

在 Vue 组件的 `<script setup>` 中引入 `useI18n`：

```vue
<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <h1>{{ t('home.title') }}</h1>
  <p>{{ t('home.description') }}</p>
</template>
```

### 2. 在计算属性中使用

对于需要响应式的翻译内容，使用 `computed`：

```vue
<script setup lang="ts">
const { t } = useI18n()

const items = computed(() => [
  {
    label: t('nav.claude'),
    to: '/claude'
  },
  {
    label: t('nav.codex'),
    to: '/codex'
  }
])
</script>
```

### 3. 带参数的翻译

在翻译文件中使用 `{变量名}` 占位符：

```json
{
  "claude": {
    "environmentActivated": "环境 \"{name}\" 已激活"
  }
}
```

在组件中使用：

```vue
<script setup lang="ts">
const { t } = useI18n()

const message = t('claude.environmentActivated', { name: '生产环境' })
// 输出: 环境 "生产环境" 已激活
</script>
```

## 📝 添加新的翻译

### 1. 在翻译文件中添加键值对

**app/locales/zh.json**:
```json
{
  "myFeature": {
    "title": "我的功能",
    "description": "这是功能描述",
    "button": "点击按钮"
  }
}
```

**app/locales/en.json**:
```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is the feature description",
    "button": "Click Button"
  }
}
```

### 2. 在组件中使用新的翻译键

```vue
<template>
  <div>
    <h1>{{ t('myFeature.title') }}</h1>
    <p>{{ t('myFeature.description') }}</p>
    <button>{{ t('myFeature.button') }}</button>
  </div>
</template>
```

## 🌐 已翻译的模块

当前已完成翻译的模块：

- ✅ **app**: 应用主标题
- ✅ **nav**: 导航菜单
- ✅ **footer**: 页脚
- ✅ **common**: 通用按钮和操作
- ✅ **home**: 首页内容
- ✅ **claude**: Claude 环境管理（翻译键已准备，组件待迁移）
- ✅ **codex**: Codex 环境管理（翻译键已准备，组件待迁移）
- ✅ **remote**: 远程环境管理（翻译键已准备，组件待迁移）

## 🔧 配置说明

### nuxt.config.ts 配置

```typescript
i18n: {
  locales: [
    { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    { code: 'zh', language: 'zh-CN', name: '简体中文', file: 'zh.json' }
  ],
  defaultLocale: 'zh',           // 默认语言为中文
  strategy: 'no_prefix',         // URL 中不添加语言前缀
  langDir: 'locales',           // 语言文件目录
  detectBrowserLanguage: {
    useCookie: true,            // 使用 Cookie 存储用户语言偏好
    cookieKey: 'i18n_locale',
    redirectOn: 'root'
  }
}
```

## 💡 最佳实践

### 1. 翻译键命名规范

使用层级结构组织翻译键：

```
模块名.功能.具体内容
```

示例：
- `claude.environment.title`
- `common.button.save`
- `remote.testConnection.success`

### 2. 保持一致性

- 按钮操作使用统一的翻译键（如 `common.save`, `common.cancel`）
- 状态信息使用统一的翻译键（如 `common.success`, `common.error`）

### 3. 避免硬编码

❌ 错误示例：
```vue
<button>保存</button>
```

✅ 正确示例：
```vue
<button>{{ t('common.save') }}</button>
```

## 🎯 迁移现有页面

要为现有页面添加国际化支持，请按以下步骤操作：

### 步骤 1: 提取所有硬编码文本

找出页面中所有的中文文本，例如：
- 标题、描述
- 按钮文本
- 表单标签
- 提示信息
- Toast 通知

### 步骤 2: 在翻译文件中添加对应的键

### 步骤 3: 引入 useI18n 并替换硬编码文本

```vue
<script setup lang="ts">
// 添加这一行
const { t } = useI18n()

// 原来的代码...
</script>

<template>
  <!-- 将硬编码文本替换为 t() 函数调用 -->
  <h1>{{ t('claude.pageTitle') }}</h1>
</template>
```

## 📚 参考示例

完整的国际化示例请参考：
- `app/pages/index.vue` - 首页（已完整迁移）
- `app/app.vue` - 主布局（导航和页脚）
- `app/components/shared/LanguageSwitcher.vue` - 语言切换器

## ⚙️ 语言切换

语言切换器已集成在页面顶部，用户可以通过点击下拉菜单切换语言：

- 简体中文
- English

用户选择的语言会保存在 Cookie 中，下次访问时自动应用。

## 🛠️ 开发工具

### VS Code 插件推荐

- **i18n Ally**: 在 VS Code 中可视化管理翻译文件，支持自动补全和内联显示翻译

### 检查遗漏的翻译

可以使用以下命令搜索项目中的硬编码中文：

```bash
# 在 Vue 文件中搜索中文字符
grep -r "[\u4e00-\u9fa5]" app/pages app/components --include="*.vue"
```

## 📖 更多资源

- [@nuxtjs/i18n 官方文档](https://i18n.nuxtjs.org/)
- [Vue I18n 文档](https://vue-i18n.intlify.dev/)
