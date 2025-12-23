import { randomUUID } from 'crypto'
import type { ClientChannel } from 'ssh2'
import type {
  RemoteEnvironmentPayload,
  RemoteEnvironmentRecord,
  RemoteTestConnectionResult
} from '#shared/types/remote'
import { REMOTE_ENV_STORE_PATH } from '../paths'
import { readJsonFile, writeJsonFile } from '../fs'
import { sshPool } from './ssh-pool'
import { remoteServiceLogger } from '../logger'

const EMPTY_STORE = { environments: [] as RemoteEnvironmentRecord[] }

interface RemoteStoreFile {
  environments: RemoteEnvironmentRecord[]
}

async function readStore(): Promise<RemoteEnvironmentRecord[]> {
  const file = await readJsonFile<RemoteStoreFile>(REMOTE_ENV_STORE_PATH, EMPTY_STORE)
  return file.environments ?? []
}

async function writeStore(environments: RemoteEnvironmentRecord[]) {
  await writeJsonFile(REMOTE_ENV_STORE_PATH, { environments })
}

function validatePayload(payload: RemoteEnvironmentPayload) {
  // 验证环境类型
  if (!payload.type) {
    throw new Error('环境类型必填')
  }

  // SSH 环境验证
  if (payload.type === 'ssh') {
    if (!payload.host?.trim()) throw new Error('主机地址必填')
    if (!payload.username?.trim()) throw new Error('用户名必填')
    if (!payload.auth?.type) throw new Error('认证方式必选')
    if (payload.auth.type === 'password' && !payload.auth.password) {
      throw new Error('密码必填')
    }
    if (
      payload.auth.type === 'privateKey' &&
      !payload.auth.privateKey &&
      !payload.auth.privateKeyPath
    ) {
      throw new Error('需要提供私钥路径或私钥内容')
    }
  }

  // WSL 环境验证
  if (payload.type === 'wsl') {
    if (!payload.wslConfig?.distroName?.trim()) {
      throw new Error('WSL 分发版名称必填')
    }
  }
}

export async function listRemoteEnvironments() {
  return readStore()
}

export async function getRemoteEnvironment(
  id: string
): Promise<RemoteEnvironmentRecord> {
  const list = await readStore()
  const record = list.find((e) => e.id === id)
  if (!record) {
    remoteServiceLogger.warn({ id }, '远程环境不存在')
    throw new Error('远程环境不存在')
  }
  return record
}

export async function getConnectConfigByRemoteId(id: string) {
  const rec = await getRemoteEnvironment(id)

  // 只支持 SSH 类型
  if (rec.type !== 'ssh') {
    throw new Error('此函数仅支持 SSH 环境')
  }

  return {
    host: rec.host,
    port: rec.port,
    username: rec.username,
    password: rec.auth?.type === 'password' ? rec.auth.password : undefined,
    privateKey: rec.auth?.type === 'privateKey' ? rec.auth.privateKey : undefined,
    // @ts-ignore 供连接池从路径读取
    privateKeyPath:
      rec.auth?.type === 'privateKey' ? rec.auth.privateKeyPath : undefined,
    passphrase: rec.auth?.passphrase
  } as any
}

export async function upsertRemoteEnvironment(
  payload: RemoteEnvironmentPayload,
  id?: string
) {
  validatePayload(payload)
  const environments = await readStore()
  const now = new Date().toISOString()

  if (id) {
    const index = environments.findIndex((e) => e.id === id)
    if (index === -1) {
      remoteServiceLogger.warn({ id }, '更新失败：远程环境不存在')
      throw new Error('未找到指定环境')
    }
    const record: RemoteEnvironmentRecord = {
      ...environments[index],
      ...payload,
      type: payload.type,
      port: payload.type === 'ssh' ? (payload.port ?? 22) : undefined,
      updatedAt: now
    }
    environments[index] = record
    await writeStore(environments)
    remoteServiceLogger.info({ id, title: record.title, type: record.type }, '远程环境已更新')
    return record
  }

  const record: RemoteEnvironmentRecord = {
    id: randomUUID(),
    title: payload.title ?? (payload.type === 'wsl' ? payload.wslConfig?.distroName : payload.host) ?? '未命名',
    description: payload.description,
    homepage: payload.homepage,
    type: payload.type,
    // SSH 配置
    host: payload.host,
    port: payload.type === 'ssh' ? (payload.port ?? 22) : undefined,
    username: payload.username,
    auth: payload.auth,
    // WSL 配置
    wslConfig: payload.wslConfig,
    createdAt: now,
    updatedAt: now
  }
  environments.push(record)
  await writeStore(environments)

  const logInfo = record.type === 'wsl'
    ? { id: record.id, title: record.title, distroName: record.wslConfig?.distroName }
    : { id: record.id, title: record.title, host: record.host }

  remoteServiceLogger.info(logInfo, '远程环境已创建')
  return record
}

export async function deleteRemoteEnvironment(id: string) {
  const environments = await readStore()
  const record = environments.find((e) => e.id === id)
  if (!record) {
    remoteServiceLogger.warn({ id }, '删除失败：远程环境不存在')
    throw new Error('环境不存在')
  }

  const updated = environments.filter((e) => e.id !== id)
  await writeStore(updated)

  // 关闭相关连接
  if (record.host && record.port && record.username) {
    const connId = `${record.username}@${record.host}:${record.port}`
    sshPool.close(connId)
  }

  remoteServiceLogger.info({ id, title: record.title, host: record.host }, '远程环境已删除')
}

export async function testRemoteConnection(id: string): Promise<RemoteTestConnectionResult> {
  const environments = await readStore()
  const index = environments.findIndex((e) => e.id === id)
  if (index === -1) {
    remoteServiceLogger.warn({ id }, '测试连接失败：远程环境不存在')
    throw new Error('远程环境不存在')
  }
  const record = environments[index]

  // WSL 环境测试
  if (record.type === 'wsl' && record.wslConfig) {
    const { testWslConnection } = await import('./wsl')
    const result = await testWslConnection(record.wslConfig.distroName)

    const testedAt = new Date().toISOString()
    const updatedRecord: RemoteEnvironmentRecord = {
      ...record,
      lastTestStatus: result.ok ? 'ok' : 'error',
      lastTestLatencyMs: result.latencyMs,
      lastTestAt: testedAt,
      lastTestError: result.error
    }
    environments[index] = updatedRecord
    await writeStore(environments)

    return {
      ok: result.ok,
      latencyMs: result.latencyMs,
      error: result.error,
      testedAt
    }
  }

  // SSH 环境测试
  remoteServiceLogger.info({ id, host: record.host, username: record.username }, '开始测试远程连接')

  const started = Date.now()
  const timeoutMs = 5000

  let ok = false
  let latencyMs: number | undefined
  let errorMessage: string | undefined
  let isTimeout = false

  try {
    const connectPromise = sshPool.use({
      host: record.host,
      port: record.port,
      username: record.username,
      password: record.auth?.type === 'password' ? record.auth.password : undefined,
      privateKey:
        record.auth?.type === 'privateKey' ? record.auth.privateKey : undefined,
      // @ts-ignore - 自定义属性供 pool 使用
      privateKeyPath:
        record.auth?.type === 'privateKey' ? record.auth.privateKeyPath : undefined,
      passphrase: record.auth?.passphrase,
      // 测试连接时缩短 SSH 握手和池获取超时时间
      readyTimeout: timeoutMs,
      poolOptions: {
        acquireTimeoutMillis: timeoutMs
      }
    } as any, async (client) => {
      // 简单执行一条 no-op 命令以验证会话
      await new Promise<void>((resolve, reject) => {
        client.exec('true', (err: Error | undefined | null, stream: ClientChannel) => {
          if (err) return reject(err)
          stream.on('close', () => resolve())
          stream.stderr.resume()
          stream.resume()
        })
      })
    })

    await Promise.race([
      connectPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          isTimeout = true
          reject(new Error('连接测试超时'))
        }, timeoutMs)
      })
    ])

    ok = true
    latencyMs = Date.now() - started
  } catch (error) {
    errorMessage = (error as Error).message || '连接测试失败'
    if (errorMessage.toLowerCase().includes('timeout') || errorMessage.includes('超时')) {
      isTimeout = true
    }
    remoteServiceLogger.error({
      id,
      host: record.host,
      username: record.username,
      error: errorMessage,
      isTimeout
    }, '远程连接测试失败')
  }

  const testedAt = new Date().toISOString()
  const updatedRecord: RemoteEnvironmentRecord = {
    ...record,
    lastTestStatus: ok ? 'ok' : isTimeout ? 'timeout' : 'error',
    lastTestLatencyMs: latencyMs,
    lastTestAt: testedAt,
    lastTestError: errorMessage
  }
  environments[index] = updatedRecord
  await writeStore(environments)

  if (ok) {
    remoteServiceLogger.info({
      id,
      host: record.host,
      username: record.username,
      latencyMs
    }, '远程连接测试成功')
    return { ok: true, latencyMs, testedAt }
  }

  return {
    ok: false,
    error: errorMessage,
    timeout: isTimeout,
    testedAt
  }
}

export async function ensureRemoteConnected(id: string) {
  const record = await getRemoteEnvironment(id)
  await sshPool.use({
    host: record.host,
    port: record.port,
    username: record.username,
    password: record.auth.type === 'password' ? record.auth.password : undefined,
    privateKey: record.auth.type === 'privateKey' ? record.auth.privateKey : undefined,
    // @ts-ignore - 自定义属性供 pool 使用
    privateKeyPath:
      record.auth.type === 'privateKey' ? record.auth.privateKeyPath : undefined,
    passphrase: record.auth.passphrase
  } as any, async () => {
    // 连接成功即可，什么都不做
  })
  return { connected: true } as const
}

export async function execRemoteCommand(id: string, command: string) {
  const record = await getRemoteEnvironment(id)
  return await sshPool.use({
    host: record.host,
    port: record.port,
    username: record.username,
    password: record.auth.type === 'password' ? record.auth.password : undefined,
    privateKey: record.auth.type === 'privateKey' ? record.auth.privateKey : undefined,
    // @ts-ignore - 自定义属性供 pool 使用
    privateKeyPath:
      record.auth.type === 'privateKey' ? record.auth.privateKeyPath : undefined,
    passphrase: record.auth.passphrase
  } as any, async (client) => {
    return await new Promise<{ code: number; stdout: string; stderr: string }>(
      (resolve, reject) => {
        client.exec(command, (err: Error | undefined | null, stream: ClientChannel) => {
          if (err) return reject(err)
          let stdout = ''
          let stderr = ''
          stream
            .on('close', (code: number) => {
              resolve({ code: code ?? 0, stdout, stderr })
            })
            .on('data', (data: Buffer) => {
              stdout += data.toString()
            })
          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString()
          })
        })
      }
    )
  })
}

// ========== WSL 相关函数 ==========

/**
 * 检查 WSL 是否可用
 */
export async function checkWslAvailable() {
  const { checkWslAvailable: checkWsl } = await import('./wsl')
  return await checkWsl()
}

/**
 * 发现所有 WSL 分发版
 */
export async function listWslDistros() {
  const { discoverWslDistros } = await import('./wsl')
  return await discoverWslDistros()
}

/**
 * 创建 WSL 环境
 */
export async function createWslEnvironment(distroName: string, title?: string) {
  const { discoverWslDistros } = await import('./wsl')
  const distros = await discoverWslDistros()
  const distro = distros.find(d => d.name === distroName)

  if (!distro) {
    throw new Error(`WSL 分发版 ${distroName} 不存在`)
  }

  const environments = await readStore()
  const now = new Date().toISOString()

  const record: RemoteEnvironmentRecord = {
    id: randomUUID(),
    type: 'wsl',
    title: title || `WSL ${distroName}`,
    wslConfig: {
      distroName: distro.name,
      isDefault: distro.isDefault,
      wslVersion: distro.version,
      state: distro.state
    },
    createdAt: now,
    updatedAt: now
  }

  environments.push(record)
  await writeStore(environments)

  remoteServiceLogger.info({ id: record.id, distroName }, 'WSL 环境已创建')
  return record
}

/**
 * 获取 WSL 配置（用于文件操作）
 */
export async function getWslConfigById(id: string) {
  const record = await getRemoteEnvironment(id)

  if (record.type !== 'wsl' || !record.wslConfig) {
    throw new Error('不是 WSL 环境')
  }

  const { getWslHomePathLinux } = await import('./wsl')

  return {
    distroName: record.wslConfig.distroName,
    homePath: getWslHomePathLinux(record.wslConfig.distroName)
  }
}
