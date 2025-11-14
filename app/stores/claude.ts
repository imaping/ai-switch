import { defineStore } from 'pinia'
import type {
  ClaudeEnvironmentRecord,
  ClaudeGeneralConfig,
  ClaudeMcpRecord,
} from '#shared/types/claude'
import { useEnvScopeStore } from '~/stores/envScope'
import { $fetch } from 'ofetch'

interface ClaudeOverview {
  environments: ClaudeEnvironmentRecord[]
  generalConfig?: ClaudeGeneralConfig
  mcpServers: ClaudeMcpRecord[]
  activeId?: string
}

export const useClaudeStore = defineStore('claude', {
  state: () => ({
    environments: [] as ClaudeEnvironmentRecord[],
    generalConfig: undefined as ClaudeGeneralConfig | undefined,
    mcpServers: [] as ClaudeMcpRecord[],
    activeId: undefined as string | undefined,
    loading: false,
    error: undefined as string | undefined,
  }),
  actions: {
    async fetchOverview() {
      this.loading = true
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const data = await $fetch<ClaudeOverview>(scopeStore.buildClaudePath('overview'))
        this.environments = data.environments
        this.generalConfig = data.generalConfig
        this.mcpServers = data.mcpServers
        this.activeId = data.activeId
      } catch (err: any) {
        this.error = err?.message || '获取 Claude 概览失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async createEnvironment(payload: Omit<ClaudeEnvironmentRecord, 'id'>) {
      this.loading = true
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const created = await $fetch<ClaudeEnvironmentRecord>(
          scopeStore.buildClaudePath('environments'),
          { method: 'POST', body: payload as any },
        )
        this.environments.push(created)
        return created
      } catch (err: any) {
        this.error = err?.message || '创建 Claude 环境失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async updateEnvironment(id: string, payload: Partial<ClaudeEnvironmentRecord>) {
      this.loading = true
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const updated = await $fetch<ClaudeEnvironmentRecord>(
          scopeStore.buildClaudePath(`environments/${id}`),
          { method: 'PUT', body: payload },
        )
        const index = this.environments.findIndex(env => env.id === id)
        if (index !== -1) this.environments[index] = updated
        return updated
      } catch (err: any) {
        this.error = err?.message || '更新 Claude 环境失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async deleteEnvironment(id: string) {
      this.loading = true
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        await $fetch(scopeStore.buildClaudePath(`environments/${id}`), {
          method: 'DELETE',
        })
        this.environments = this.environments.filter(env => env.id !== id)
        if (this.activeId === id) this.activeId = undefined
      } catch (err: any) {
        this.error = err?.message || '删除 Claude 环境失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async activateEnvironment(id: string) {
      this.loading = true
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const activated = await $fetch<ClaudeEnvironmentRecord>(
          scopeStore.buildClaudePath(`environments/${id}/activate`),
          { method: 'POST' },
        )
        this.activeId = id
        const index = this.environments.findIndex(env => env.id === id)
        if (index !== -1) this.environments[index] = activated
        return activated
      } catch (err: any) {
        this.error = err?.message || '激活 Claude 环境失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async queryBalance(id: string) {
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const result = await $fetch<{
          balance?: number
          raw?: number
          updatedAt: string
          error?: string
        }>(scopeStore.buildClaudePath(`environments/${id}/balance`))
        const index = this.environments.findIndex(env => env.id === id)
        if (index !== -1) {
          const env = this.environments[index]
          this.environments[index] = {
            ...env,
            currentBalance: result.balance,
            balanceUpdatedAt: result.updatedAt,
          }
        }
        return result
      } catch (err: any) {
        this.error = err?.message || '查询余额失败'
        throw err
      }
    },

    async updateGeneralConfig(content: Record<string, unknown>) {
      this.loading = true
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const updated = await $fetch<ClaudeGeneralConfig>(
          scopeStore.buildClaudePath('common'),
          {
            method: 'PUT',
            body: { content },
          },
        )
        this.generalConfig = updated
        return updated
      } catch (err: any) {
        this.error = err?.message || '更新通用配置失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async upsertMcpServer(payload: any) {
      this.loading = true
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        // 与原实现保持一致（若无 id 使用 /api/claude/mcp，存在 id 走 /api/claude/mcp/:id）
        const path = payload?.id
          ? scopeStore.buildClaudePath(`mcp/${payload.id}`)
          : scopeStore.buildClaudePath('mcp')
        const saved = await $fetch<ClaudeMcpRecord>(path, {
          method: 'PUT',
          body: payload,
        })
        const index = this.mcpServers.findIndex(mcp => mcp.id === saved.id)
        if (index !== -1) this.mcpServers[index] = saved
        else this.mcpServers.push(saved)
        return saved
      } catch (err: any) {
        this.error = err?.message || '保存 MCP 服务失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async toggleMcpServer(id: string, enabled: boolean) {
      this.loading = true
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const updated = await $fetch<ClaudeMcpRecord>(
          scopeStore.buildClaudePath(`mcp/${id}/toggle`),
          {
            method: 'POST',
            body: { enabled },
          },
        )
        const index = this.mcpServers.findIndex(mcp => mcp.id === id)
        if (index !== -1) this.mcpServers[index] = updated
        return updated
      } catch (err: any) {
        this.error = err?.message || '切换 MCP 服务状态失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async deleteMcpServer(id: string) {
      this.loading = true
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        await $fetch(scopeStore.buildClaudePath(`mcp/${id}`), {
          method: 'DELETE',
        })
        this.mcpServers = this.mcpServers.filter(mcp => mcp.id !== id)
      } catch (err: any) {
        this.error = err?.message || '删除 MCP 服务失败'
        throw err
      } finally {
        this.loading = false
      }
    },
  },
})
