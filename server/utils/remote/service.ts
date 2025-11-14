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

export async function listRemoteEnvironments() {
  return readStore()
}

export async function getRemoteEnvironment(
  id: string
): Promise<RemoteEnvironmentRecord> {
  const list = await readStore()
  const record = list.find((e) => e.id === id)
  if (!record) throw new Error('远程环境不存在')
  return record
}

export async function getConnectConfigByRemoteId(id: string) {
  const rec = await getRemoteEnvironment(id)
  return {
    host: rec.host,
    port: rec.port,
    username: rec.username,
    password: rec.auth.type === 'password' ? rec.auth.password : undefined,
    privateKey: rec.auth.type === 'privateKey' ? rec.auth.privateKey : undefined,
    // @ts-ignore 供连接池从路径读取
    privateKeyPath:
      rec.auth.type === 'privateKey' ? rec.auth.privateKeyPath : undefined,
    passphrase: rec.auth.passphrase
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
    if (index === -1) throw new Error('未找到指定环境')
    const record: RemoteEnvironmentRecord = {
      ...environments[index],
      ...payload,
      port: payload.port ?? 22,
      updatedAt: now
    }
    environments[index] = record
    await writeStore(environments)
    return record
  }

  const record: RemoteEnvironmentRecord = {
    id: randomUUID(),
    title: payload.title ?? payload.host,
    description: payload.description,
    homepage: payload.homepage,
    host: payload.host,
    port: payload.port ?? 22,
    username: payload.username,
    auth: payload.auth,
    createdAt: now,
    updatedAt: now
  }
  environments.push(record)
  await writeStore(environments)
  return record
}

export async function deleteRemoteEnvironment(id: string) {
  const environments = await readStore()
  const record = environments.find((e) => e.id === id)
  if (!record) throw new Error('环境不存在')

  const updated = environments.filter((e) => e.id !== id)
  await writeStore(updated)

  // 关闭相关连接
  if (record.host && record.port && record.username) {
    const connId = `${record.username}@${record.host}:${record.port}`
    sshPool.close(connId)
  }
}

export async function testRemoteConnection(id: string): Promise<RemoteTestConnectionResult> {
  const environments = await readStore()
  const index = environments.findIndex((e) => e.id === id)
  if (index === -1) {
    throw new Error('远程环境不存在')
  }
  const record = environments[index]

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
      password: record.auth.type === 'password' ? record.auth.password : undefined,
      privateKey:
        record.auth.type === 'privateKey' ? record.auth.privateKey : undefined,
      // @ts-ignore - 自定义属性供 pool 使用
      privateKeyPath:
        record.auth.type === 'privateKey' ? record.auth.privateKeyPath : undefined,
      passphrase: record.auth.passphrase,
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
