import { defineStore } from 'pinia'
import type {
  RemoteEnvironmentRecord,
  RemoteTestConnectionResult,
} from '#shared/types/remote'
import { $fetch } from 'ofetch'

interface RemoteOverview {
  environments: RemoteEnvironmentRecord[]
}

export const useRemoteStore = defineStore('remote', {
  state: () => ({
    environments: [] as RemoteEnvironmentRecord[],
    error: undefined as string | undefined,
  }),
  actions: {
    async fetchOverview() {
      this.error = undefined
      try {
        const data = await $fetch<RemoteOverview>('/api/remote/overview')
        this.environments = data.environments
      } catch (err: any) {
        this.error = err?.message || '获取远程环境概览失败'
        throw err
      }
    },

    async createEnvironment(payload: Omit<RemoteEnvironmentRecord, 'id'>) {
      this.error = undefined
      try {
        const created = await $fetch<RemoteEnvironmentRecord>('/api/remote/environments', {
          method: 'POST',
          body: payload as any,
        })
        this.environments.push(created)
        return created
      } catch (err: any) {
        this.error = err?.message || '创建远程环境失败'
        throw err
      }
    },

    async updateEnvironment(id: string, payload: Partial<RemoteEnvironmentRecord>) {
      this.error = undefined
      try {
        const updated = await $fetch<RemoteEnvironmentRecord>(`/api/remote/environments/${id}`, {
          method: 'PUT',
          body: payload,
        })
        const index = this.environments.findIndex(env => env.id === id)
        if (index !== -1) this.environments[index] = updated
        return updated
      } catch (err: any) {
        this.error = err?.message || '更新远程环境失败'
        throw err
      }
    },

    async deleteEnvironment(id: string) {
      this.error = undefined
      try {
        await $fetch(`/api/remote/environments/${id}`, { method: 'DELETE' })
        this.environments = this.environments.filter(env => env.id !== id)
      } catch (err: any) {
        this.error = err?.message || '删除远程环境失败'
        throw err
      }
    },

    async testConnection(id: string) {
      this.error = undefined
      try {
        const result = await $fetch<RemoteTestConnectionResult>(
          `/api/remote/environments/${id}/test`,
          { method: 'POST' },
        )

        // 直接用后端返回结果更新本地测试信息
        const index = this.environments.findIndex(env => env.id === id)
        if (index !== -1) {
          const env = this.environments[index]
          this.environments[index] = {
            ...env,
            lastTestStatus: result.ok ? 'ok' : result.timeout ? 'timeout' : 'error',
            lastTestLatencyMs: result.latencyMs,
            lastTestAt: result.testedAt,
            lastTestError: result.error,
          }
        }

        return result
      } catch (err: any) {
        this.error = err?.message || '测试连接失败'
        throw err
      }
    },
  },
})
