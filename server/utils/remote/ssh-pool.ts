import type { ConnectConfig } from 'ssh2'
import { Client } from 'ssh2'
import fs from 'fs'
import * as genericPool from 'generic-pool'

export interface SshKey {
  id: string // 连接唯一键
  host: string
  port: number
  username: string
}

export interface PoolOptions {
  max?: number // 最大连接数，默认 10
  min?: number // 最小连接数，默认 0
  idleTimeoutMillis?: number // 空闲连接超时时间，默认 120000 (2分钟)
  acquireTimeoutMillis?: number // 获取连接超时时间，默认 30000 (30秒)
  testOnBorrow?: boolean // 获取连接时验证，默认 true
}

function makeKey(host: string, port: number, username: string): string {
  return `${username}@${host}:${port}`
}

export class SshConnectionPool {
  private pools = new Map<string, genericPool.Pool<Client>>()
  private defaultOptions: PoolOptions

  constructor(options: PoolOptions = {}) {
    this.defaultOptions = {
      max: options.max ?? 10,
      min: options.min ?? 0,
      idleTimeoutMillis: options.idleTimeoutMillis ?? 2 * 60_000,
      acquireTimeoutMillis: options.acquireTimeoutMillis ?? 30_000,
      testOnBorrow: options.testOnBorrow ?? true
    }
  }

  private getOrCreatePool(
    host: string,
    port: number,
    username: string,
    config: ConnectConfig & { poolOptions?: PoolOptions }
  ): genericPool.Pool<Client> {
    const id = makeKey(host, port, username)

    let pool = this.pools.get(id)
    if (pool) return pool

    // 合并配置选项
    const poolOptions = { ...this.defaultOptions, ...config.poolOptions }

    // 创建 factory
    const factory: genericPool.Factory<Client> = {
      create: async () => {
        const client = new Client()

        const connectConfig: ConnectConfig = {
          tryKeyboard: false,
          keepaliveInterval: 15_000,
          keepaliveCountMax: 6,
          readyTimeout: 20_000,
          ...config
        }

        // 如果提供了 privateKeyPath，则读取为 Buffer
        if (!connectConfig.privateKey && (config as any).privateKeyPath) {
          try {
            const p = (config as any).privateKeyPath as string
            connectConfig.privateKey = fs.readFileSync(p)
          } catch (e) {
            // 读取失败，留给下游错误处理
          }
        }

        // 建立连接
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup()
            resolve()
          }
          const onError = (err: Error) => {
            cleanup()
            reject(err)
          }
          const cleanup = () => {
            client.off('ready', onReady)
            client.off('error', onError)
          }
          client.once('ready', onReady)
          client.once('error', onError)
          client.connect(connectConfig)
        })

        return client
      },

      destroy: async (client: Client) => {
        return new Promise<void>((resolve) => {
          client.once('close', () => resolve())
          client.end()
          // 设置超时，避免永久等待
          setTimeout(() => resolve(), 5000)
        })
      },

      validate: async (client: Client) => {
        // 检查连接是否仍然有效
        return new Promise<boolean>((resolve) => {
          if (!(client as any)._sock || !(client as any)._sock.readable) {
            resolve(false)
            return
          }
          resolve(true)
        })
      }
    }

    // 创建连接池
    pool = genericPool.createPool(factory, {
      max: poolOptions.max,
      min: poolOptions.min,
      idleTimeoutMillis: poolOptions.idleTimeoutMillis,
      acquireTimeoutMillis: poolOptions.acquireTimeoutMillis,
      testOnBorrow: poolOptions.testOnBorrow,
      autostart: true
    })

    this.pools.set(id, pool)
    return pool
  }

  async acquire(config: ConnectConfig & { poolOptions?: PoolOptions }): Promise<Client> {
    const host = config.host ?? 'localhost'
    const port = config.port ?? 22
    const username = (config.username ?? '').toString()

    const pool = this.getOrCreatePool(host, port, username, config)
    return await pool.acquire()
  }

  async release(client: Client, config: { host?: string; port?: number; username?: string }) {
    const host = config.host ?? 'localhost'
    const port = config.port ?? 22
    const username = (config.username ?? '').toString()
    const id = makeKey(host, port, username)

    const pool = this.pools.get(id)
    if (pool) {
      await pool.release(client)
    }
  }

  /**
   * 使用连接执行操作，自动管理连接的获取和释放
   * @param config SSH连接配置
   * @param callback 使用连接执行的回调函数
   * @returns 回调函数的返回值
   */
  async use<T>(
    config: ConnectConfig & { poolOptions?: PoolOptions },
    callback: (client: Client) => Promise<T> | T
  ): Promise<T> {
    const host = config.host ?? 'localhost'
    const port = config.port ?? 22
    const username = (config.username ?? '').toString()

    const pool = this.getOrCreatePool(host, port, username, config)
    const client = await pool.acquire()

    try {
      return await callback(client)
    } finally {
      await pool.release(client)
    }
  }

  async destroy(client: Client, config: { host?: string; port?: number; username?: string }) {
    const host = config.host ?? 'localhost'
    const port = config.port ?? 22
    const username = (config.username ?? '').toString()
    const id = makeKey(host, port, username)

    const pool = this.pools.get(id)
    if (pool) {
      await pool.destroy(client)
    }
  }

  getActiveIds(): string[] {
    return Array.from(this.pools.keys())
  }

  async close(id: string) {
    const pool = this.pools.get(id)
    if (!pool) return

    await pool.drain()
    await pool.clear()
    this.pools.delete(id)
  }

  async closeAll() {
    const closePromises = Array.from(this.pools.entries()).map(async ([id, pool]) => {
      await pool.drain()
      await pool.clear()
      this.pools.delete(id)
    })
    await Promise.all(closePromises)
  }

  // 获取连接池状态信息
  getPoolInfo(id: string) {
    const pool = this.pools.get(id)
    if (!pool) return null

    return {
      size: pool.size,
      available: pool.available,
      pending: pool.pending,
      max: pool.max,
      min: pool.min
    }
  }

  getAllPoolsInfo() {
    const info: Record<string, any> = {}
    for (const [id, pool] of this.pools) {
      info[id] = {
        size: pool.size,
        available: pool.available,
        pending: pool.pending,
        max: pool.max,
        min: pool.min
      }
    }
    return info
  }
}

// 进程级单例
export const sshPool = new SshConnectionPool()
