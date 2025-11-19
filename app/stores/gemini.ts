import { defineStore } from 'pinia'
import type {
  GeminiEnvironmentRecord,
  GeminiGeneralConfig,
  GeminiMcpRecord,
} from '#shared/types/gemini'
import { useEnvScopeStore } from '~/stores/envScope'
import { $fetch } from 'ofetch'

interface GeminiOverview {
  environments: GeminiEnvironmentRecord[]
  generalConfig?: GeminiGeneralConfig
  mcpServers: GeminiMcpRecord[]
  activeId?: string
}

export const useGeminiStore = defineStore('gemini', {
  state: () => ({
    environments: [] as GeminiEnvironmentRecord[],
    generalConfig: undefined as GeminiGeneralConfig | undefined,
    mcpServers: [] as GeminiMcpRecord[],
    activeId: undefined as string | undefined,
    error: undefined as string | undefined,
  }),
  actions: {
    async fetchOverview() {
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const data = await $fetch<GeminiOverview>(
          scopeStore.buildGeminiPath('overview'),
        )
        this.environments = data.environments
        this.generalConfig = data.generalConfig
        this.mcpServers = data.mcpServers
        this.activeId = data.activeId
      } catch (err: any) {
        this.error = err?.message || '获取 Gemini 概览失败'
        throw err
      }
    },

    async createEnvironment(payload: Omit<GeminiEnvironmentRecord, 'id'>) {
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const created = await $fetch<GeminiEnvironmentRecord>(
          scopeStore.buildGeminiPath('environments'),
          { method: 'POST', body: payload as any },
        )
        this.environments.push(created)
        return created
      } catch (err: any) {
        this.error = err?.message || '创建 Gemini 环境失败'
        throw err
      }
    },

    async updateEnvironment(id: string, payload: Partial<GeminiEnvironmentRecord>) {
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const updated = await $fetch<GeminiEnvironmentRecord>(
          scopeStore.buildGeminiPath(`environments/${id}`),
          { method: 'PUT', body: payload },
        )
        const index = this.environments.findIndex(env => env.id === id)
        if (index !== -1) this.environments[index] = updated
        return updated
      } catch (err: any) {
        this.error = err?.message || '更新 Gemini 环境失败'
        throw err
      }
    },

    async deleteEnvironment(id: string) {
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        await $fetch(scopeStore.buildGeminiPath(`environments/${id}`), {
          method: 'DELETE',
        })
        this.environments = this.environments.filter(env => env.id !== id)
        if (this.activeId === id) this.activeId = undefined
      } catch (err: any) {
        this.error = err?.message || '删除 Gemini 环境失败'
        throw err
      }
    },

    async activateEnvironment(id: string) {
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const activated = await $fetch<GeminiEnvironmentRecord>(
          scopeStore.buildGeminiPath(`environments/${id}/activate`),
          { method: 'POST' },
        )
        this.activeId = id
        const index = this.environments.findIndex(env => env.id === id)
        if (index !== -1) this.environments[index] = activated
        return activated
      } catch (err: any) {
        this.error = err?.message || '激活 Gemini 环境失败'
        throw err
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
        }>(scopeStore.buildGeminiPath(`environments/${id}/balance`))
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

    async updateGeneralConfig(content: string) {
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const updated = await $fetch<GeminiGeneralConfig>(
          scopeStore.buildGeminiPath('common'),
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
      }
    },

    async upsertMcpServer(payload: any) {
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const path = payload?.id
          ? scopeStore.buildGeminiPath(`mcp/${payload.id}`)
          : scopeStore.buildGeminiPath('mcp')
        const saved = await $fetch<GeminiMcpRecord>(path, {
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
      }
    },

    async toggleMcpServer(id: string, enabled: boolean) {
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        const updated = await $fetch<GeminiMcpRecord>(
          scopeStore.buildGeminiPath(`mcp/${id}/toggle`),
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
      }
    },

    async deleteMcpServer(id: string) {
      this.error = undefined
      try {
        const scopeStore = useEnvScopeStore()
        await $fetch(scopeStore.buildGeminiPath(`mcp/${id}`), {
          method: 'DELETE',
        })
        this.mcpServers = this.mcpServers.filter(mcp => mcp.id !== id)
      } catch (err: any) {
        this.error = err?.message || '删除 MCP 服务失败'
        throw err
      }
    },
  },
})

