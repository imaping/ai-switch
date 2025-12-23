import { defineStore } from 'pinia'
import type {
  RemoteEnvironmentRecord,
  RemoteTestConnectionResult,
  WslDistroInfo,
} from '#shared/types/remote'
import { $fetch } from 'ofetch'

interface RemoteOverview {
  environments: RemoteEnvironmentRecord[]
}

interface WslDiscoverResult {
  available: boolean
  distros: WslDistroInfo[]
}

export const useRemoteStore = defineStore('remote', {
  state: () => ({
    environments: [] as RemoteEnvironmentRecord[],
    error: undefined as string | undefined,
    wslAvailable: false,
    wslDistros: [] as WslDistroInfo[],
    wslLoading: false,
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

    // ========== WSL 相关 Actions ==========

    async checkWslAvailable() {
      this.error = undefined
      try {
        const result = await $fetch<{ success: boolean; data: { available: boolean } }>(
          '/api/remote/wsl/available'
        )
        this.wslAvailable = result.data.available
        return result.data.available
      } catch (err: any) {
        this.error = err?.message || '检查 WSL 可用性失败'
        this.wslAvailable = false
        return false
      }
    },

    async discoverWslDistros() {
      this.error = undefined
      this.wslLoading = true
      try {
        const result = await $fetch<{ success: boolean; data: WslDiscoverResult }>(
          '/api/remote/wsl/discover'
        )

        if (result.success && result.data) {
          this.wslAvailable = result.data.available
          this.wslDistros = result.data.distros || []
        } else {
          this.wslAvailable = false
          this.wslDistros = []
        }

        return this.wslDistros
      } catch (err: any) {
        this.error = err?.message || '发现 WSL 分发版失败'
        this.wslAvailable = false
        this.wslDistros = []
        throw err
      } finally {
        this.wslLoading = false
      }
    },

    async createWslEnvironment(distroName: string, title?: string) {
      this.error = undefined
      try {
        const result = await $fetch<{ success: boolean; data: RemoteEnvironmentRecord }>(
          '/api/remote/wsl/environments',
          {
            method: 'POST',
            body: { distroName, title },
          }
        )

        if (result.success && result.data) {
          this.environments.push(result.data)
          return result.data
        }

        throw new Error('创建 WSL 环境失败')
      } catch (err: any) {
        this.error = err?.message || '创建 WSL 环境失败'
        throw err
      }
    },
  },

  getters: {
    sshEnvironments: (state) => state.environments.filter(env => env.type === 'ssh'),
    wslEnvironments: (state) => state.environments.filter(env => env.type === 'wsl'),
  },
})
