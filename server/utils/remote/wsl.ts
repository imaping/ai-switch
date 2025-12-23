import { execSync } from 'child_process'
import path from 'path'
import type { WslDistroInfo } from '#shared/types/remote'
import { remoteServiceLogger } from '../logger'

// ========== 路径缓存 ==========

const homePathCache = new Map<string, { path: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟

// ========== 安全验证 ==========

/**
 * 验证分发版名称格式（防止命令注入）
 */
function validateDistroName(name: string): boolean {
  return /^[a-zA-Z0-9\-_.]+$/.test(name)
}

/**
 * 验证 Linux 路径（防止路径遍历）
 */
function validateLinuxPath(filePath: string): boolean {
  // 防止路径遍历攻击
  return !filePath.includes('..') && filePath.startsWith('/')
}

// ========== WSL 可用性检测 ==========

/**
 * 检查 WSL 是否可用
 */
export async function checkWslAvailable(): Promise<boolean> {
  try {
    execSync('wsl --version', { encoding: 'utf8', timeout: 3000 })
    return true
  } catch {
    return false
  }
}

// ========== WSL 分发版发现 ==========

/**
 * 发现所有 WSL 分发版
 */
export async function discoverWslDistros(): Promise<WslDistroInfo[]> {
  try {
    remoteServiceLogger.info('开始发现 WSL 分发版')

    // 执行 wsl -l -v 获取分发版列表
    const output = execSync('wsl -l -v', { encoding: 'utf16le', timeout: 5000 })

    const lines = output.split('\n').slice(1) // 跳过标题行
    const distros: WslDistroInfo[] = []

    for (const line of lines) {
      if (!line.trim()) continue

      // 解析格式：  * Ubuntu-22.04    Running         2
      // 注意：可能有多个空格分隔
      const match = line.match(/^\s*(\*)?\s*(\S+)\s+(Running|Stopped)\s+(\d+)/)
      if (match) {
        const distroName = match[2]
        const distro: WslDistroInfo = {
          name: distroName,
          state: match[3] as 'Running' | 'Stopped',
          version: parseInt(match[4]) as 1 | 2,
          isDefault: !!match[1]
        }

        // 尝试获取 Home 路径
        try {
          distro.homePath = getWslHomePath(distroName)
        } catch (error) {
          remoteServiceLogger.warn({ distroName, error: (error as Error).message }, '无法获取 WSL Home 路径')
        }

        distros.push(distro)
      }
    }

    remoteServiceLogger.info({ count: distros.length }, `发现 ${distros.length} 个 WSL 分发版`)
    return distros
  } catch (error) {
    remoteServiceLogger.error({ error: (error as Error).message }, '发现 WSL 分发版失败')
    throw new Error(`无法获取 WSL 分发版列表: ${(error as Error).message}`)
  }
}

/**
 * 确保分发版正在运行
 */
export async function ensureDistroRunning(distroName: string): Promise<void> {
  if (!validateDistroName(distroName)) {
    throw new Error('无效的分发版名称')
  }

  const distros = await discoverWslDistros()
  const distro = distros.find(d => d.name === distroName)

  if (!distro) {
    throw new Error(`WSL 分发版 ${distroName} 不存在`)
  }

  if (distro.state === 'Stopped') {
    remoteServiceLogger.info({ distroName }, '正在启动 WSL 分发版')
    // 自动启动分发版
    execSync(`wsl -d ${distroName} -e true`, { timeout: 10000 })
  }
}

// ========== WSL 路径操作 ==========

/**
 * 获取 WSL 分发版的 Home 目录（Windows UNC 路径）
 */
export function getWslHomePath(distroName: string): string {
  if (!validateDistroName(distroName)) {
    throw new Error('无效的分发版名称')
  }

  try {
    const cmd = `wsl -d ${distroName} -e sh -c "wslpath -w ~"`
    const output = execSync(cmd, { encoding: 'utf8', timeout: 5000 })
    return output.trim()
  } catch (error) {
    throw new Error(`无法获取 WSL Home 路径: ${(error as Error).message}`)
  }
}

/**
 * 获取 WSL 分发版的 Home 目录（Linux 路径）- 带缓存
 */
export function getWslHomePathLinux(distroName: string): string {
  if (!validateDistroName(distroName)) {
    throw new Error('无效的分发版名称')
  }

  const cached = homePathCache.get(distroName)
  const now = Date.now()

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.path
  }

  try {
    const cmd = `wsl -d ${distroName} -e sh -c "echo $HOME"`
    const output = execSync(cmd, { encoding: 'utf8', timeout: 5000 })
    const homePath = output.trim()

    homePathCache.set(distroName, { path: homePath, timestamp: now })
    return homePath
  } catch (error) {
    throw new Error(`无法获取 WSL Home 路径: ${(error as Error).message}`)
  }
}

// ========== WSL 文件操作 ==========

/**
 * 读取 WSL 文件内容
 */
export async function wslReadFile(distroName: string, linuxPath: string): Promise<string> {
  if (!validateDistroName(distroName)) {
    throw new Error('无效的分发版名称')
  }

  if (!validateLinuxPath(linuxPath)) {
    throw new Error('无效的文件路径')
  }

  try {
    // 通过 wsl 命令读取文件
    const cmd = `wsl -d ${distroName} -e cat "${linuxPath}"`
    const content = execSync(cmd, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 10000
    })

    remoteServiceLogger.debug({ distroName, linuxPath }, '读取 WSL 文件成功')
    return content
  } catch (error) {
    remoteServiceLogger.error({
      distroName,
      linuxPath,
      error: (error as Error).message
    }, '读取 WSL 文件失败')
    throw new Error(`读取文件失败 ${linuxPath}: ${(error as Error).message}`)
  }
}

/**
 * 写入 WSL 文件内容
 */
export async function wslWriteFile(
  distroName: string,
  linuxPath: string,
  content: string
): Promise<void> {
  if (!validateDistroName(distroName)) {
    throw new Error('无效的分发版名称')
  }

  if (!validateLinuxPath(linuxPath)) {
    throw new Error('无效的文件路径')
  }

  try {
    // 确保目录存在
    const dir = path.posix.dirname(linuxPath)
    execSync(`wsl -d ${distroName} -e mkdir -p "${dir}"`, {
      encoding: 'utf8',
      timeout: 5000
    })

    // 写入文件（使用 heredoc 避免转义问题）
    // 注意：需要转义内容中的单引号
    const escapedContent = content.replace(/'/g, "'\\''")
    const cmd = `wsl -d ${distroName} -e sh -c 'cat > "${linuxPath}" << '"'"'EOF'"'"'\n${escapedContent}\nEOF'`

    execSync(cmd, {
      encoding: 'utf8',
      timeout: 10000,
      maxBuffer: 10 * 1024 * 1024
    })

    remoteServiceLogger.debug({ distroName, linuxPath }, '写入 WSL 文件成功')
  } catch (error) {
    remoteServiceLogger.error({
      distroName,
      linuxPath,
      error: (error as Error).message
    }, '写入 WSL 文件失败')
    throw new Error(`写入文件失败 ${linuxPath}: ${(error as Error).message}`)
  }
}

/**
 * 删除 WSL 文件
 */
export async function wslUnlink(distroName: string, linuxPath: string): Promise<void> {
  if (!validateDistroName(distroName)) {
    throw new Error('无效的分发版名称')
  }

  if (!validateLinuxPath(linuxPath)) {
    throw new Error('无效的文件路径')
  }

  try {
    const cmd = `wsl -d ${distroName} -e rm -f "${linuxPath}"`
    execSync(cmd, { encoding: 'utf8', timeout: 5000 })

    remoteServiceLogger.debug({ distroName, linuxPath }, '删除 WSL 文件成功')
  } catch (error) {
    // 忽略文件不存在的错误
    remoteServiceLogger.debug({
      distroName,
      linuxPath,
      error: (error as Error).message
    }, '删除 WSL 文件失败（可能不存在）')
  }
}

/**
 * 读取 WSL JSON 文件
 */
export async function readWslJson<T>(
  distroName: string,
  linuxPath: string,
  fallback: T
): Promise<T> {
  try {
    const text = await wslReadFile(distroName, linuxPath)
    return JSON.parse(text) as T
  } catch (error) {
    remoteServiceLogger.debug({
      distroName,
      linuxPath,
      error: (error as Error).message
    }, '读取 WSL JSON 失败，使用默认值')
    return fallback
  }
}

/**
 * 写入 WSL JSON 文件
 */
export async function writeWslJson(
  distroName: string,
  linuxPath: string,
  data: unknown
): Promise<void> {
  await wslWriteFile(distroName, linuxPath, JSON.stringify(data, null, 2))
}

// ========== WSL 连接测试 ==========

/**
 * 测试 WSL 连接
 */
export async function testWslConnection(distroName: string): Promise<{
  ok: boolean
  latencyMs?: number
  error?: string
}> {
  if (!validateDistroName(distroName)) {
    return {
      ok: false,
      error: '无效的分发版名称'
    }
  }

  const started = Date.now()
  try {
    remoteServiceLogger.info({ distroName }, '开始测试 WSL 连接')

    // 执行简单命令测试
    execSync(`wsl -d ${distroName} -e true`, {
      encoding: 'utf8',
      timeout: 5000
    })

    const latencyMs = Date.now() - started
    remoteServiceLogger.info({ distroName, latencyMs }, 'WSL 连接测试成功')

    return {
      ok: true,
      latencyMs
    }
  } catch (error) {
    const errorMessage = (error as Error).message
    remoteServiceLogger.error({
      distroName,
      error: errorMessage
    }, 'WSL 连接测试失败')

    return {
      ok: false,
      error: errorMessage
    }
  }
}

// ========== WSL 分发版管理（扩展功能）==========

/**
 * 启动 WSL 分发版
 */
export async function startWslDistro(distroName: string): Promise<void> {
  if (!validateDistroName(distroName)) {
    throw new Error('无效的分发版名称')
  }

  try {
    remoteServiceLogger.info({ distroName }, '正在启动 WSL 分发版')
    execSync(`wsl -d ${distroName} -e true`, { timeout: 10000 })
    remoteServiceLogger.info({ distroName }, 'WSL 分发版启动成功')
  } catch (error) {
    throw new Error(`启动分发版失败: ${(error as Error).message}`)
  }
}

/**
 * 停止 WSL 分发版
 */
export async function stopWslDistro(distroName: string): Promise<void> {
  if (!validateDistroName(distroName)) {
    throw new Error('无效的分发版名称')
  }

  try {
    remoteServiceLogger.info({ distroName }, '正在停止 WSL 分发版')
    execSync(`wsl -t ${distroName}`, { timeout: 5000 })
    remoteServiceLogger.info({ distroName }, 'WSL 分发版停止成功')
  } catch (error) {
    throw new Error(`停止分发版失败: ${(error as Error).message}`)
  }
}

/**
 * 设置默认 WSL 分发版
 */
export async function setDefaultWslDistro(distroName: string): Promise<void> {
  if (!validateDistroName(distroName)) {
    throw new Error('无效的分发版名称')
  }

  try {
    remoteServiceLogger.info({ distroName }, '正在设置默认 WSL 分发版')
    execSync(`wsl -s ${distroName}`, { timeout: 3000 })
    remoteServiceLogger.info({ distroName }, '设置默认 WSL 分发版成功')
  } catch (error) {
    throw new Error(`设置默认分发版失败: ${(error as Error).message}`)
  }
}
