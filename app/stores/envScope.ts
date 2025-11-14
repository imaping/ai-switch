import { defineStore } from 'pinia'

// 当前管理作用域: 本地(local) 或 某个远程环境 ID
export type EnvScope = 'local' | string

export const useEnvScopeStore = defineStore('envScope', {
  state: () => ({
    scope: 'local' as EnvScope,
  }),
  actions: {
    setScope(scope: EnvScope) {
      this.scope = scope
    },

    /**
     * 构造带 scope 的 Claude API 路径
     * - 本地:   /api/local/claude/...
     * - 远程:   /api/{remoteId}/claude/...
     */
    buildClaudePath(path: string) {
      return this.buildScopedPath('claude', path)
    },

    /**
     * 构造带 scope 的 Codex API 路径
     * - 本地:   /api/local/codex/...
     * - 远程:   /api/{remoteId}/codex/...
     */
    buildCodexPath(path: string) {
      return this.buildScopedPath('codex', path)
    },

    /**
     * 通用带 scope 的 API 路径构造
     */
    buildScopedPath(service: 'claude' | 'codex', path: string) {
      const trimmed = path.replace(/^\/+/, '')
      if (this.scope === 'local') {
        return `/api/local/${service}/${trimmed}`
      }
      return `/api/${this.scope}/${service}/${trimmed}`
    },
  },
})

