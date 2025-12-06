import type { ConnectConfig } from 'ssh2'
import { Client } from 'ssh2'
import fs from 'fs'
import * as genericPool from 'generic-pool'
import { sshPoolLogger } from '../logger'

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
    sshPoolLogger.info({
      defaultOptions: this.defaultOptions
    }, 'SSH连接池初始化完成')
  }

  private getOrCreatePool(
    host: string,
    port: number,
    username: string,
    config: ConnectConfig & { poolOptions?: PoolOptions }
  ): genericPool.Pool<Client> {
    const id = makeKey(host, port, username)

    let pool = this.pools.get(id)
    if (pool) {
      sshPoolLogger.debug({ id, poolInfo: this.getPoolInfo(id) }, '复用现有连接池')
      return pool
    }

    sshPoolLogger.info({ id, host, port, username }, '创建新的SSH连接池')

    // 合并配置选项
    const poolOptions = { ...this.defaultOptions, ...config.poolOptions }

    // 创建 factory
    const factory: genericPool.Factory<Client> = {
      create: async () => {
        const startTime = Date.now()
        sshPoolLogger.debug({ id, host, port, username }, '开始创建SSH连接')

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
            sshPoolLogger.debug({ id, privateKeyPath: p }, '读取私钥文件')
            connectConfig.privateKey = fs.readFileSync(p)
          } catch (e) {
            sshPoolLogger.error({ id, privateKeyPath: (config as any).privateKeyPath, error: e }, '读取私钥文件失败')
          }
        }

        // 建立连接
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup()
            const duration = Date.now() - startTime
            sshPoolLogger.info({ id, host, port, username, duration }, 'SSH连接建立成功')
            resolve()
          }
          const onError = (err: Error) => {
            cleanup()
            const duration = Date.now() - startTime
            sshPoolLogger.error({
              id, host, port, username, duration,
              error: {
                message: err.message,
                name: err.name,
                stack: err.stack
              }
            }, 'SSH连接建立失败')
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

        // 添加持久的异常事件监听器，用于检测连接异常断开
        const onClose = (hadError: boolean) => {
          sshPoolLogger.warn({
            id,
            hadError,
            poolInfo: this.getPoolInfo(id)
          }, 'SSH连接意外关闭，将从连接池中移除')

          // 异步销毁该连接，从连接池中移除
          pool.destroy(client).catch((err) => {
            sshPoolLogger.error({
              id,
              error: err instanceof Error ? {
                message: err.message,
                name: err.name
              } : err
            }, '销毁异常关闭的SSH连接失败')
          })
        }

        const onEnd = () => {
          sshPoolLogger.warn({
            id,
            poolInfo: this.getPoolInfo(id)
          }, 'SSH连接已结束，将从连接池中移除')

          // 异步销毁该连接，从连接池中移除
          pool.destroy(client).catch((err) => {
            sshPoolLogger.error({
              id,
              error: err instanceof Error ? {
                message: err.message,
                name: err.name
              } : err
            }, '销毁已结束的SSH连接失败')
          })
        }

        const onRuntimeError = (err: Error) => {
          sshPoolLogger.error({
            id,
            error: {
              message: err.message,
              name: err.name,
              stack: err.stack
            },
            poolInfo: this.getPoolInfo(id)
          }, 'SSH连接运行时错误，将从连接池中移除')

          // 异步销毁该连接，从连接池中移除
          pool.destroy(client).catch((destroyErr) => {
            sshPoolLogger.error({
              id,
              error: destroyErr instanceof Error ? {
                message: destroyErr.message,
                name: destroyErr.name
              } : destroyErr
            }, '销毁错误的SSH连接失败')
          })
        }

        // 监听连接异常事件
        client.on('close', onClose)
        client.on('end', onEnd)
        client.on('error', onRuntimeError)

        return client
      },

      destroy: async (client: Client) => {
        sshPoolLogger.debug({ id }, '开始销毁SSH连接')

        // 移除所有事件监听器，避免内存泄漏
        client.removeAllListeners('close')
        client.removeAllListeners('end')
        client.removeAllListeners('error')

        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            sshPoolLogger.warn({ id }, 'SSH连接销毁超时（5秒），强制完成')
            resolve()
          }, 5000)

          client.once('close', () => {
            clearTimeout(timeout)
            sshPoolLogger.info({ id }, 'SSH连接已销毁')
            resolve()
          })
          client.end()
        })
      },

      validate: async (client: Client) => {
        // 检查连接是否仍然有效
        return new Promise<boolean>((resolve) => {
          const sock = (client as any)._sock
          const hasSocket = !!sock
          const isReadable = sock?.readable === true
          const isWritable = sock?.writable === true
          const isDestroyed = sock?.destroyed === true

          // 基础检查：socket 必须存在、可读、可写且未销毁
          const basicCheck = hasSocket && isReadable && isWritable && !isDestroyed

          if (!basicCheck) {
            sshPoolLogger.debug({
              id,
              isValid: false,
              hasSocket,
              isReadable,
              isWritable,
              isDestroyed
            }, '验证SSH连接有效性 - 基础检查失败')
            resolve(false)
            return
          }

          // 进阶检查：尝试发送一个轻量级命令验证连接真正可用
          // 使用 exec 'true' 命令，这是一个无副作用的快速命令
          const timeout = setTimeout(() => {
            sshPoolLogger.debug({
              id,
              isValid: false,
              reason: 'validation_timeout'
            }, '验证SSH连接有效性 - 验证超时')
            resolve(false)
          }, 3000) // 3秒超时

          client.exec('true', (err, stream) => {
            clearTimeout(timeout)

            if (err) {
              sshPoolLogger.debug({
                id,
                isValid: false,
                error: {
                  message: err.message,
                  name: err.name
                }
              }, '验证SSH连接有效性 - 命令执行失败')
              resolve(false)
              return
            }

            // 命令执行成功，连接有效
            stream.on('close', () => {
              sshPoolLogger.debug({
                id,
                isValid: true
              }, '验证SSH连接有效性 - 验证成功')
              resolve(true)
            })

            stream.on('error', () => {
              sshPoolLogger.debug({
                id,
                isValid: false,
                reason: 'stream_error'
              }, '验证SSH连接有效性 - 流错误')
              resolve(false)
            })

            // 消费输出流
            stream.stderr.resume()
            stream.resume()
          })
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

    sshPoolLogger.info({
      id,
      poolOptions: {
        max: poolOptions.max,
        min: poolOptions.min,
        idleTimeoutMillis: poolOptions.idleTimeoutMillis,
        acquireTimeoutMillis: poolOptions.acquireTimeoutMillis,
        testOnBorrow: poolOptions.testOnBorrow
      }
    }, 'SSH连接池创建成功')

    this.pools.set(id, pool)
    return pool
  }

  async acquire(config: ConnectConfig & { poolOptions?: PoolOptions }): Promise<Client> {
    const host = config.host ?? 'localhost'
    const port = config.port ?? 22
    const username = (config.username ?? '').toString()
    const id = makeKey(host, port, username)

    const startTime = Date.now()
    sshPoolLogger.debug({ id, host, port, username }, '请求获取SSH连接')

    try {
      const pool = this.getOrCreatePool(host, port, username, config)
      const client = await pool.acquire()
      const duration = Date.now() - startTime

      sshPoolLogger.info({
        id,
        duration,
        poolInfo: this.getPoolInfo(id)
      }, 'SSH连接获取成功')

      return client
    } catch (error) {
      const duration = Date.now() - startTime
      sshPoolLogger.error({
        id,
        duration,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      }, 'SSH连接获取失败')
      throw error
    }
  }

  async release(client: Client, config: { host?: string; port?: number; username?: string }) {
    const host = config.host ?? 'localhost'
    const port = config.port ?? 22
    const username = (config.username ?? '').toString()
    const id = makeKey(host, port, username)

    sshPoolLogger.debug({ id }, '释放SSH连接回连接池')

    const pool = this.pools.get(id)
    if (pool) {
      await pool.release(client)
      sshPoolLogger.info({
        id,
        poolInfo: this.getPoolInfo(id)
      }, 'SSH连接已释放')
    } else {
      sshPoolLogger.warn({ id }, '未找到对应的连接池，无法释放连接')
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
    const id = makeKey(host, port, username)

    const startTime = Date.now()
    sshPoolLogger.debug({ id }, '使用连接池执行操作')

    const pool = this.getOrCreatePool(host, port, username, config)
    const client = await pool.acquire()

    try {
      const result = await callback(client)
      const duration = Date.now() - startTime
      sshPoolLogger.debug({ id, duration }, '连接池操作执行成功')
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      sshPoolLogger.error({
        id,
        duration,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      }, '连接池操作执行失败')
      throw error
    } finally {
      await pool.release(client)
      sshPoolLogger.debug({ id, poolInfo: this.getPoolInfo(id) }, '连接已归还连接池')
    }
  }

  async destroy(client: Client, config: { host?: string; port?: number; username?: string }) {
    const host = config.host ?? 'localhost'
    const port = config.port ?? 22
    const username = (config.username ?? '').toString()
    const id = makeKey(host, port, username)

    sshPoolLogger.debug({ id }, '请求销毁SSH连接')

    const pool = this.pools.get(id)
    if (pool) {
      await pool.destroy(client)
      sshPoolLogger.info({
        id,
        poolInfo: this.getPoolInfo(id)
      }, 'SSH连接已从连接池中销毁')
    } else {
      sshPoolLogger.warn({ id }, '未找到对应的连接池，无法销毁连接')
    }
  }

  getActiveIds(): string[] {
    return Array.from(this.pools.keys())
  }

  async close(id: string) {
    const pool = this.pools.get(id)
    if (!pool) {
      sshPoolLogger.warn({ id }, '未找到对应的连接池，无法关闭')
      return
    }

    sshPoolLogger.info({ id, poolInfo: this.getPoolInfo(id) }, '开始关闭SSH连接池')

    const startTime = Date.now()
    await pool.drain()
    await pool.clear()
    this.pools.delete(id)

    const duration = Date.now() - startTime
    sshPoolLogger.info({ id, duration }, 'SSH连接池已关闭')
  }

  async closeAll() {
    const poolIds = Array.from(this.pools.keys())
    sshPoolLogger.info({
      poolCount: poolIds.length,
      poolIds,
      allPoolsInfo: this.getAllPoolsInfo()
    }, '开始关闭所有SSH连接池')

    const startTime = Date.now()
    const closePromises = Array.from(this.pools.entries()).map(async ([id, pool]) => {
      await pool.drain()
      await pool.clear()
      this.pools.delete(id)
      sshPoolLogger.debug({ id }, 'SSH连接池已关闭')
    })
    await Promise.all(closePromises)

    const duration = Date.now() - startTime
    sshPoolLogger.info({
      poolCount: poolIds.length,
      duration
    }, '所有SSH连接池已关闭')
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
