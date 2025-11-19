# AI Switch

<div align="center">

**AI 环境控制台 - 面向开发者的 AI 配置管理工具**

将分散在本地和远程服务器上的 AI 配置集中管理，统一管理 Claude / Codex 环境、MCP 服务、余额查询与通用配置，让日常切环境像切标签页一样轻松。

[![Nuxt](https://img.shields.io/badge/Nuxt-4.2.1-00DC82?logo=nuxt.js)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5.24-4FC08D?logo=vue.js)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Nuxt UI](https://img.shields.io/badge/Nuxt_UI-4.1.0-00DC82)](https://ui.nuxt.com)

</div>

## 📖 目录

- [功能特性](#-功能特性)
- [快速开始](#-快速开始)
- [技术栈](#-技术栈)
- [项目结构](#-项目结构)
- [功能详解](#-功能详解)
- [开发指南](#-开发指南)
- [常见问题](#-常见问题)

## ✨ 功能特性

### 核心能力

- **🔧 环境配置管理** - 创建、编辑、激活多个 Claude 和 Codex 环境配置
- **🛠️ MCP 服务管理** - 灵活配置与启用/禁用 Model Context Protocol 服务器
- **💰 余额查询** - 自动请求并展示 API 余额，支持自定义查询接口
- **🌐 远程操作** - 通过 SSH 连接远程主机，集中管理多台服务器的 AI 配置
- **📦 通用配置** - 可复用的配置片段系统，便于跨环境共享配置
- **🎨 现代化 UI** - 基于 Nuxt UI 构建，支持深色模式，响应式设计

### 支持的 AI 工具

| 工具 | 配置文件路径 | 功能支持 |
|------|------------|---------|
| **Claude Code** | `~/.claude/` | ✅ 环境管理、MCP 配置、余额查询 |
| **Codex** | `~/.codex/` | ✅ 环境管理、MCP 配置、余额查询 |
| **Gemini** | `~/.gemini/` | ✅ 环境管理、MCP 配置、余额查询 |

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- pnpm / npm / yarn

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 http://localhost:3000

### 生产构建

```bash
# 构建应用
pnpm build

# 预览生产版本
pnpm preview
```

### 静态部署

```bash
# 生成静态站点
pnpm generate
```

## 🛠 技术栈

### 前端框架

- **[Nuxt 4](https://nuxt.com)** - Vue 3 全栈框架
- **[Vue 3](https://vuejs.org)** - 渐进式 JavaScript 框架
- **[TypeScript](https://www.typescriptlang.org)** - 类型安全的 JavaScript 超集

### UI 与样式

- **[Nuxt UI](https://ui.nuxt.com)** v4 - 基于 Tailwind CSS 的 Vue 组件库
- **[Tailwind CSS](https://tailwindcss.com)** v4 - 实用优先的 CSS 框架
- **[Lucide Icons](https://lucide.dev)** - 现代化图标库

### 状态管理与工具

- **[Pinia](https://pinia.vuejs.org)** - Vue 官方推荐的状态管理库
- **[CodeMirror](https://codemirror.net)** - 高性能代码编辑器
- **[ssh2](https://github.com/mscdex/ssh2)** - SSH2 客户端（Node.js）
- **[@iarna/toml](https://www.npmjs.com/package/@iarna/toml)** - TOML 解析器

## 📁 项目结构

```
ai-switch-nust/
├── app/                          # Nuxt 4 源码目录
│   ├── assets/                   # 静态资源
│   │   └── css/
│   │       └── main.css         # 全局样式入口
│   ├── components/              # Vue 组件
│   │   ├── claude/              # Claude 环境相关组件
│   │   │   ├── GeneralConfigForm.vue    # 通用配置表单
│   │   │   ├── EnvironmentForm.vue      # 环境配置表单
│   │   │   └── McpForm.vue              # MCP 服务表单
│   │   ├── codex/               # Codex 环境相关组件
│   │   │   ├── GeneralConfigForm.vue
│   │   │   ├── EnvironmentForm.vue
│   │   │   └── McpForm.vue
│   │   ├── gemini/              # Gemini 环境相关组件
│   │   │   ├── GeneralConfigForm.vue
│   │   │   ├── EnvironmentForm.vue
│   │   │   └── McpForm.vue
│   │   ├── remote/              # 远程主机组件
│   │   │   └── HostForm.vue
│   │   └── shared/              # 共享组件
│   │       ├── CodeEditor.vue           # CodeMirror 编辑器封装
│   │       └── PrimaryColorSwitcher.vue # 主题色切换器
│   ├── composables/             # 组合式函数
│   │   └── useBalance.ts        # 余额查询逻辑
│   ├── pages/                   # 页面路由
│   │   ├── index.vue            # 首页
│   │   ├── claude.vue           # Claude 控制面板
│   │   ├── codex.vue            # Codex 控制面板
│   │   └── remote.vue           # 远程主机管理
│   ├── stores/                  # Pinia 状态管理
│   │   ├── claude.ts            # Claude 状态
│   │   ├── codex.ts             # Codex 状态
│   │   ├── remote.ts            # 远程主机状态
│   │   └── envScope.ts          # 环境作用域状态
│   ├── app.vue                  # 应用根组件
│   └── app.config.ts            # 应用配置
├── server/                      # Nitro 服务端
│   ├── api/                     # API 路由
│   │   ├── claude/              # Claude 相关 API
│   │   │   ├── overview.get.ts           # 获取概览
│   │   │   ├── common.put.ts             # 更新通用配置
│   │   │   ├── environments/
│   │   │   │   ├── index.post.ts         # 创建环境
│   │   │   │   └── [id]/
│   │   │   │       ├── index.put.ts      # 更新环境
│   │   │   │       ├── index.delete.ts   # 删除环境
│   │   │   │       ├── activate.post.ts  # 激活环境
│   │   │   │       └── balance.get.ts    # 查询余额
│   │   │   └── mcp/
│   │   │       ├── index.put.ts          # 更新 MCP 服务
│   │   │       └── [id]/
│   │   │           ├── index.put.ts
│   │   │           ├── index.delete.ts
│   │   │           └── toggle.post.ts    # 启用/禁用 MCP
│   │   ├── codex/               # Codex 相关 API（结构同 claude）
│   │   ├── remote/              # 远程主机 API
│   │   │   ├── overview.get.ts
│   │   │   └── environments/
│   │   │       ├── index.post.ts
│   │   │       └── [id]/
│   │   │           ├── index.put.ts
│   │   │           ├── index.delete.ts
│   │   │           └── test.post.ts      # 测试 SSH 连接
│   │   └── [scope]/             # 动态作用域 API（本地/远程）
│   │       ├── claude/
│   │       └── codex/
│   └── utils/                   # 服务端工具函数
│       ├── api/
│       │   ├── responses.ts     # 统一响应格式
│       │   └── balance.ts       # 余额查询通用逻辑
│       ├── claude/
│       │   ├── service.ts       # Claude 配置服务
│       │   └── constants.ts     # 常量定义
│       ├── codex/
│       │   ├── service.ts       # Codex 配置服务
│       │   └── constants.ts
│       ├── remote/
│       │   ├── service.ts       # 远程主机服务
│       │   ├── ssh-pool.ts      # SSH 连接池
│       │   ├── sftp.ts          # SFTP 文件操作
│       │   ├── claude-service.ts # 远程 Claude 配置服务
│       │   └── codex-service.ts  # 远程 Codex 配置服务
│       ├── paths.ts             # 路径工具
│       └── fs.ts                # 文件系统工具
├── shared/                      # 前后端共享
│   └── types/                   # TypeScript 类型定义
│       ├── claude.ts
│       ├── codex.ts
│       └── remote.ts
├── public/                      # 静态资源
│   └── favicon.svg
├── nuxt.config.ts              # Nuxt 配置
├── package.json                # 项目依赖
├── tsconfig.json               # TypeScript 配置
└── README.md                   # 项目文档
```

## 🎯 功能详解

### 1. Claude 环境管理

管理本地 `~/.claude/` 目录下的 Claude Code 配置文件。

#### 主要功能

- **环境配置** - 存储和管理多个 Claude API 配置（`~/.claude/environments/`）
- **一键切换** - 通过激活操作将选定环境写入 `~/.claude/claude_code.json`
- **MCP 服务** - 管理 `~/.claude/claude.json` 中的 `mcpServers` 配置
- **余额查询** - 支持自定义余额查询接口和 JSONPath 提取

#### 配置示例

```json
{
  "title": "Anthropic 官方",
  "homepage": "https://console.anthropic.com",
  "description": "官方 Claude API",
  "requestUrl": "https://api.anthropic.com",
  "apiKey": "sk-ant-xxxx",
  "balanceUrl": "https://api.anthropic.com/v1/organization/balance",
  "balanceJsonPath": "data.balance.remaining",
  "balanceFormula": "value/1000000",
  "codeConfig": {
    "env": {
      "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
      "ANTHROPIC_AUTH_TOKEN": "sk-ant-xxxx"
    }
  }
}
```

### 2. Codex 环境管理

管理本地 `~/.codex/` 目录下的 Codex 配置文件，功能与 Claude 环境管理类似。

#### 配置文件

- **环境配置** - `~/.codex/environments/`
- **通用配置** - `~/.codex/common.toml`
- **MCP 配置** - `~/.codex/mcp.json`

### 3. 远程主机管理

通过 SSH 连接管理远程服务器上的 AI 配置，支持密码和私钥两种认证方式。

#### 主要功能

- **SSH 连接管理** - 添加、编辑、删除远程主机配置
- **连接测试** - 测试 SSH 连接状态和延迟
- **连接池** - 复用 SSH 连接，提高性能
- **远程操作** - 在远程主机上管理 Claude 和 Codex 配置

#### 配置示例

```json
{
  "title": "生产服务器",
  "host": "192.168.1.100",
  "port": 22,
  "username": "developer",
  "auth": {
    "type": "privateKey",
    "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...",
    "passphrase": "optional"
  }
}
```

#### SSH 连接池

使用 `generic-pool` 实现 SSH 连接池管理：

- 最小连接数: 0
- 最大连接数: 5
- 空闲超时: 60秒
- 连接复用，提高操作效率

### 4. MCP 服务管理

管理 Model Context Protocol 服务器配置，支持启用/禁用、编辑和删除操作。

#### MCP 配置示例

```json
{
  "name": "filesystem",
  "displayName": "文件系统",
  "docUrl": "https://example.com/mcp/filesystem",
  "enabled": true,
  "config": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
  }
}
```

### 5. 余额查询

支持自定义余额查询接口，通过 JSONPath 和公式提取余额信息。

#### 查询流程

1. 发送 HTTP 请求到 `balanceUrl`
2. 使用 `balanceJsonPath` 提取 JSON 响应中的余额值（如 `data.quota.remaining`）
3. 应用 `balanceFormula` 计算最终余额（如 `value/1000000`）
4. 显示在控制面板中

#### 支持的公式运算符

- `+`, `-`, `*`, `/` - 四则运算
- `value` - 表示提取的原始值

#### 示例配置

```json
{
  "balanceUrl": "https://api.example.com/v1/balance",
  "balanceRequest": {
    "method": "GET",
    "headers": {
      "Authorization": "Bearer {{apiKey}}"
    }
  },
  "balanceJsonPath": "data.quota.remaining",
  "balanceFormula": "value / 1000000"
}
```

### 6. 通用配置管理

提供可复用的配置片段系统，便于跨环境共享配置。

#### Claude 通用配置

存储在 `~/.claude/common/claude_code.json`，可被多个环境引用。

#### Codex 通用配置

存储在 `~/.codex/common.toml`，使用 TOML 格式。

## 💻 开发指南

### 添加新的 AI 工具支持

要添加新的 AI 工具（如 OpenAI、Gemini 等），需要以下步骤：

1. **创建类型定义** - 在 `shared/types/` 创建新的类型文件

```typescript
// shared/types/openai.ts
export interface OpenAIEnvironmentRecord {
  id: string;
  title: string;
  apiKey: string;
  organization?: string;
  status: "active" | "inactive";
  // ...
}
```

2. **创建服务层** - 在 `server/utils/` 创建服务类

```typescript
// server/utils/openai/service.ts
export class OpenAIService {
  async getOverview() { /* ... */ }
  async createEnvironment(payload: OpenAIEnvironmentPayload) { /* ... */ }
  async activateEnvironment(id: string) { /* ... */ }
  // ...
}
```

3. **创建 API 路由** - 在 `server/api/` 创建对应的 API

```typescript
// server/api/openai/overview.get.ts
export default defineEventHandler(async () => {
  const service = new OpenAIService();
  return service.getOverview();
});
```

4. **创建 Pinia Store** - 在 `app/stores/` 创建状态管理

```typescript
// app/stores/openai.ts
export const useOpenAIStore = defineStore('openai', () => {
  const environments = ref<OpenAIEnvironmentRecord[]>([]);
  // ...
  return { environments, /* ... */ };
});
```

5. **创建前端组件** - 在 `app/components/` 和 `app/pages/` 创建 UI

```vue
<!-- app/pages/openai.vue -->
<template>
  <div>
    <!-- OpenAI 控制面板 -->
  </div>
</template>
```

6. **添加导航** - 更新 `app/pages/index.vue` 中的快速入口

### 代码规范

- **TypeScript** - 启用严格模式（`strict: true`）
- **Vue 组合式 API** - 使用 `<script setup>` 语法
- **命名规范**
  - 组件: PascalCase（如 `EnvironmentForm.vue`）
  - 文件: kebab-case 或 camelCase
  - 变量/函数: camelCase
  - 类型: PascalCase
- **类型安全** - 充分利用 TypeScript 类型系统

### 目录组织原则

- **按功能模块划分** - `claude/`, `codex/`, `remote/` 等
- **共享代码提取** - 通用逻辑放在 `shared/` 和 `server/utils/`
- **组件复用** - 共享组件放在 `components/shared/`

### 调试技巧

```bash
# 启用详细日志
DEBUG=* pnpm dev

# 仅服务端日志
DEBUG=nitro:* pnpm dev

# TypeScript 类型检查
pnpm exec vue-tsc --noEmit
```

## 🤔 常见问题

### Q1: 启动后页面没有样式？

**A:** 确保 `nuxt.config.ts` 中配置了全局样式：

```typescript
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  // ...
});
```

并且 `app/assets/css/main.css` 中引入了 Tailwind CSS：

```css
@import "tailwindcss";
```

### Q2: SSH 连接失败？

**A:** 检查以下几点：

1. 确保远程主机 SSH 服务正常运行
2. 检查防火墙是否开放 SSH 端口
3. 验证用户名和认证信息是否正确
4. 私钥格式必须是 OpenSSH 格式（不是 PuTTY 格式）

### Q3: 余额查询失败？

**A:** 常见原因：

1. `balanceUrl` 配置错误
2. `balanceJsonPath` 提取路径不正确
3. API 请求头缺失或错误（如 `Authorization`）
4. 网络连接问题或 API 服务不可用

调试建议：查看浏览器控制台或服务端日志中的详细错误信息。

### Q4: 如何备份配置？

**A:** 配置文件位置：

- **Claude**: `~/.claude/environments/`, `~/.claude/common/`
- **Codex**: `~/.codex/environments/`, `~/.codex/common.toml`
- **远程主机**: `~/.ai-switch/remote-hosts.json`（本地存储）

定期备份这些目录即可。

### Q5: 支持 Docker 部署吗？

**A:** 是的，可以使用 Docker 部署。示例 Dockerfile：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

构建和运行：

```bash
docker build -t ai-switch .
docker run -p 3000:3000 -v ~/.claude:/root/.claude -v ~/.codex:/root/.codex ai-switch
```

### Q6: 如何禁用某个功能模块？

**A:** 可以通过路由权限或简单地从导航中移除入口：

1. 编辑 `app/pages/index.vue`，注释掉不需要的 `quickLinks` 项
2. 或者删除对应的页面文件（如 `app/pages/codex.vue`）

### Q7: 配置文件损坏怎么办？

**A:** 系统会在修改配置前自动备份：

- 备份位置: `~/.claude/backups/`, `~/.codex/backups/`
- 手动恢复: 从备份目录复制文件到对应位置

## 📄 许可证

[MIT License](LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📮 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 GitHub Issue
- 发送邮件至项目维护者

---

<div align="center">

**感谢使用 AI Switch！**

如果这个项目对你有帮助，请给一个 ⭐️ Star 支持一下！

</div>
