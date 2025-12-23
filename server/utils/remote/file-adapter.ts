import type { RemoteEnvironmentRecord } from '#shared/types/remote'
import { getRemoteEnvironment } from './service'
import { sftpReadFile, sftpWriteFile, sftpUnlink, readRemoteJson, writeRemoteJson } from './sftp'
import { wslReadFile, wslWriteFile, wslUnlink, readWslJson, writeWslJson } from './wsl'
import { remoteServiceLogger } from '../logger'

/**
 * 统一的远程文件读取接口
 * 根据环境类型自动选择 SSH 或 WSL 方式
 */
export async function readRemoteFile(remoteId: string, absPath: string): Promise<string> {
  const env = await getRemoteEnvironment(remoteId)

  remoteServiceLogger.debug({
    remoteId,
    type: env.type,
    path: absPath
  }, '读取远程文件')

  if (env.type === 'wsl' && env.wslConfig) {
    return await wslReadFile(env.wslConfig.distroName, absPath)
  } else if (env.type === 'ssh') {
    return await sftpReadFile(remoteId, absPath)
  }

  throw new Error(`不支持的远程环境类型: ${env.type}`)
}

/**
 * 统一的远程文件写入接口
 * 根据环境类型自动选择 SSH 或 WSL 方式
 */
export async function writeRemoteFile(
  remoteId: string,
  absPath: string,
  content: string
): Promise<void> {
  const env = await getRemoteEnvironment(remoteId)

  remoteServiceLogger.debug({
    remoteId,
    type: env.type,
    path: absPath,
    size: content.length
  }, '写入远程文件')

  if (env.type === 'wsl' && env.wslConfig) {
    await wslWriteFile(env.wslConfig.distroName, absPath, content)
  } else if (env.type === 'ssh') {
    await sftpWriteFile(remoteId, absPath, content)
  } else {
    throw new Error(`不支持的远程环境类型: ${env.type}`)
  }
}

/**
 * 统一的远程文件删除接口
 * 根据环境类型自动选择 SSH 或 WSL 方式
 */
export async function unlinkRemoteFile(remoteId: string, absPath: string): Promise<void> {
  const env = await getRemoteEnvironment(remoteId)

  remoteServiceLogger.debug({
    remoteId,
    type: env.type,
    path: absPath
  }, '删除远程文件')

  if (env.type === 'wsl' && env.wslConfig) {
    await wslUnlink(env.wslConfig.distroName, absPath)
  } else if (env.type === 'ssh') {
    await sftpUnlink(remoteId, absPath)
  } else {
    throw new Error(`不支持的远程环境类型: ${env.type}`)
  }
}

/**
 * 统一的远程 JSON 读取接口
 * 根据环境类型自动选择 SSH 或 WSL 方式
 */
export async function readRemoteJsonFile<T>(
  remoteId: string,
  absPath: string,
  fallback: T
): Promise<T> {
  const env = await getRemoteEnvironment(remoteId)

  remoteServiceLogger.debug({
    remoteId,
    type: env.type,
    path: absPath
  }, '读取远程 JSON 文件')

  if (env.type === 'wsl' && env.wslConfig) {
    return await readWslJson(env.wslConfig.distroName, absPath, fallback)
  } else if (env.type === 'ssh') {
    return await readRemoteJson(remoteId, absPath, fallback)
  }

  return fallback
}

/**
 * 统一的远程 JSON 写入接口
 * 根据环境类型自动选择 SSH 或 WSL 方式
 */
export async function writeRemoteJsonFile(
  remoteId: string,
  absPath: string,
  data: unknown
): Promise<void> {
  const env = await getRemoteEnvironment(remoteId)

  remoteServiceLogger.debug({
    remoteId,
    type: env.type,
    path: absPath
  }, '写入远程 JSON 文件')

  if (env.type === 'wsl' && env.wslConfig) {
    await writeWslJson(env.wslConfig.distroName, absPath, data)
  } else if (env.type === 'ssh') {
    await writeRemoteJson(remoteId, absPath, data)
  } else {
    throw new Error(`不支持的远程环境类型: ${env.type}`)
  }
}

/**
 * 获取远程 Home 目录路径
 * 根据环境类型自动选择 SSH 或 WSL 方式
 */
export async function getRemoteHomePath(remoteId: string): Promise<string> {
  const env = await getRemoteEnvironment(remoteId)

  if (env.type === 'wsl' && env.wslConfig) {
    const { getWslHomePathLinux } = await import('./wsl')
    return getWslHomePathLinux(env.wslConfig.distroName)
  } else if (env.type === 'ssh') {
    const { getRemoteHome } = await import('./sftp')
    return await getRemoteHome(remoteId)
  }

  throw new Error(`不支持的远程环境类型: ${env.type}`)
}
