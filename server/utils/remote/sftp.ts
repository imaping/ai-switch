import type { Client, ClientChannel, SFTPWrapper } from 'ssh2'
import path from 'path'
import { sshPool } from './ssh-pool'

type SFTP = SFTPWrapper

const homeCache = new Map<string, string>()

async function getClient(remoteId: string, cfg: any): Promise<Client> {
  // 使用连接池获取连接
  return sshPool.acquire(cfg as any)
}

async function releaseClient(client: Client, cfg: any) {
  // 释放连接回连接池
  await sshPool.release(client, {
    host: cfg.host,
    port: cfg.port,
    username: cfg.username
  })
}

export async function getSftp(
  remoteId: string
): Promise<{ sftp: SFTP; dispose: () => Promise<void>; client: Client }> {
  const cfg = await getConnectConfigByRemoteId(remoteId)
  const client = await getClient(remoteId, cfg)
  const sftp = await new Promise<SFTP>((resolve, reject) => {
    client.sftp((err: Error | undefined | null, sftp: SFTP) =>
      err ? reject(err) : resolve(sftp)
    )
  })
  const dispose = async () => {
    try {
      sftp.end()
    } catch {}
    // 释放连接回池
    await releaseClient(client, cfg)
  }
  return { sftp, dispose, client }
}

export async function getRemoteHome(remoteId: string): Promise<string> {
  const cached = homeCache.get(remoteId)
  if (cached) return cached
  
  const cfg = await getConnectConfigByRemoteId(remoteId)
  const home = await sshPool.use(cfg as any, async (client) => {
    return await new Promise<string>((resolve, reject) => {
      client.exec('printf $HOME', (err: Error | undefined | null, stream: ClientChannel) => {
        if (err) return reject(err)
        let out = ''
        stream
          .on('data', (d: Buffer) => (out += d.toString()))
          .on('close', () => resolve(out.trim()))
          .stderr.on('data', () => {})
      })
    })
  })

  const normalized = home || '/home/' + remoteId.split('@')[0]
  homeCache.set(remoteId, normalized)
  return normalized
}

export async function sftpReadFile(remoteId: string, absPath: string): Promise<string> {
  const { sftp, dispose } = await getSftp(remoteId)
  try {
    const stream = sftp.createReadStream(absPath)
    return await new Promise<string>((resolve, reject) => {
      let data = ''
      stream
        .on('data', (chunk: Buffer) => (data += chunk.toString()))
        .on('error', (err: Error) => reject(err))
        .on('close', () => resolve(data))
    })
  } finally {
    await dispose()
  }
}

export async function sftpWriteFile(
  remoteId: string,
  absPath: string,
  content: string
) {
  const { sftp, dispose } = await getSftp(remoteId)
  try {
    await sftpMkdirp(sftp, path.dirname(absPath))
    await new Promise<void>((resolve, reject) => {
      const ws = sftp.createWriteStream(absPath, { flags: 'w' })
      ws.on('error', (err: Error) => reject(err)).on('close', () => resolve())
      ws.end(content)
    })
  } finally {
    await dispose()
  }
}

export async function sftpUnlink(remoteId: string, absPath: string) {
  const { sftp, dispose } = await getSftp(remoteId)
  try {
    await new Promise<void>((resolve, reject) => {
      sftp.unlink(absPath, (err: Error | undefined | null) =>
        err ? reject(err) : resolve()
      )
    })
  } catch (e) {
    // ignore if not exists
  } finally {
    await dispose()
  }
}

export async function sftpMkdirp(sftp: SFTP, dir: string) {
  const parts = dir.split('/').filter(Boolean)
  let acc = dir.startsWith('/') ? '/' : ''
  for (const p of parts) {
    acc = path.posix.join(acc, p)
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve) => {
      sftp.mkdir(acc, (_err: Error | undefined | null) => resolve())
    })
  }
}

export async function readRemoteJson<T>(
  remoteId: string,
  absPath: string,
  fallback: T
): Promise<T> {
  try {
    const text = await sftpReadFile(remoteId, absPath)
    return JSON.parse(text) as T
  } catch (e) {
    return fallback
  }
}

export async function writeRemoteJson(
  remoteId: string,
  absPath: string,
  data: unknown
) {
  await sftpWriteFile(remoteId, absPath, JSON.stringify(data, null, 2))
}

// 导入 remote service 的函数（需要在 service.ts 中定义）
async function getConnectConfigByRemoteId(remoteId: string) {
  const { getRemoteEnvironment } = await import('./service')
  return getRemoteEnvironment(remoteId)
}
