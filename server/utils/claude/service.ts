import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import type {
  ClaudeCodeConfig,
  ClaudeEnvironmentPayload,
  ClaudeEnvironmentRecord,
  ClaudeGeneralConfig,
  ClaudeMcpPayload,
  ClaudeMcpRecord
} from '#shared/types/claude'
import { claudeServiceLogger } from '../logger'

const EMPTY_ENV_STORE = { environments: [] as ClaudeEnvironmentRecord[] }
const EMPTY_MCP_STORE = { servers: [] as ClaudeMcpRecord[] }

interface ClaudeEnvironmentStoreFile {
  environments: ClaudeEnvironmentRecord[]
}

interface ClaudeMcpStoreFile {
  servers: ClaudeMcpRecord[]
}

interface ClaudeMcpConfigFile {
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}


// ========== Claude Settings 读写 ==========

async function readClaudeSettings(): Promise<ClaudeCodeConfig | null> {
  try {
    const raw = await fs.readFile(CLAUDE_SETTINGS_PATH, 'utf-8')
    return JSON.parse(raw) as ClaudeCodeConfig
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    claudeServiceLogger.error({ error, path: CLAUDE_SETTINGS_PATH }, '读取 Claude 配置文件失败')
    throw error
  }
}

async function writeClaudeSettings(config: ClaudeCodeConfig) {
  await ensureDirExists(CLAUDE_SETTINGS_PATH)
  await fs.writeFile(
    CLAUDE_SETTINGS_PATH,
    JSON.stringify(config, null, 2),
    'utf-8'
  )
}

// ========== Claude MCP Config 读写 ==========

async function readClaudeMcpConfig(): Promise<ClaudeMcpConfigFile> {
  return readJsonFile<ClaudeMcpConfigFile>(CLAUDE_MCP_CONFIG_PATH, {})
}

async function writeClaudeMcpConfig(
  updater: (current: ClaudeMcpConfigFile) => ClaudeMcpConfigFile
) {
  const current = await readClaudeMcpConfig()
  const next = updater(current)
  await ensureDirExists(CLAUDE_MCP_CONFIG_PATH)
  await fs.writeFile(
    CLAUDE_MCP_CONFIG_PATH,
    JSON.stringify(next, null, 2),
    'utf-8'
  )
}

// ========== Environment Store 读写 ==========

async function readEnvironmentStore() {
  const file = await readJsonFile<ClaudeEnvironmentStoreFile>(
    CLAUDE_ENV_STORE_PATH,
    EMPTY_ENV_STORE
  )
  return file.environments ?? []
}

async function writeEnvironmentStore(environments: ClaudeEnvironmentRecord[]) {
  await writeJsonFile(CLAUDE_ENV_STORE_PATH, { environments })
}

// ========== General Config Store 读写 ==========

async function readGeneralConfigStore(): Promise<ClaudeGeneralConfig | undefined> {
  const record = await readJsonFile<ClaudeGeneralConfig | null>(
    CLAUDE_COMMON_STORE_PATH,
    null
  )
  return record ?? undefined
}

async function writeGeneralConfigStore(
  payload: Record<string, unknown>
): Promise<ClaudeGeneralConfig> {
  const record: ClaudeGeneralConfig = {
    id: 'claude-general',
    payload,
    updatedAt: new Date().toISOString()
  }
  await writeJsonFile(CLAUDE_COMMON_STORE_PATH, record)
  return record
}

// ========== MCP Store 读写 ==========

async function readMcpStore(): Promise<ClaudeMcpRecord[]> {
  const file = await readJsonFile<ClaudeMcpStoreFile>(
    CLAUDE_MCP_STORE_PATH,
    EMPTY_MCP_STORE
  )
  return file.servers ?? []
}

async function writeMcpStore(servers: ClaudeMcpRecord[]) {
  await writeJsonFile(CLAUDE_MCP_STORE_PATH, { servers })
}


// ========== 同步函数 ==========

async function syncActiveEnvironment(
  environments: ClaudeEnvironmentRecord[]
) {
  const settings = await readClaudeSettings()
  if (!settings?.env) {
    return environments
  }

  const requestUrl = settings.env.ANTHROPIC_BASE_URL
  const apiKey = settings.env.ANTHROPIC_AUTH_TOKEN
  if (!requestUrl || !apiKey) {
    return environments
  }

  const now = new Date().toISOString()
  let updated = environments.map((env) =>
    env.requestUrl === requestUrl && env.apiKey === apiKey
      ? {
          ...env,
          status: 'active' as const,
          codeConfig: settings,
          updatedAt: now
        }
      : { ...env, status: 'inactive' as const }
  )

  const exists = updated.some(
    (env) => env.requestUrl === requestUrl && env.apiKey === apiKey
  )

  if (!exists) {
    updated = [
      ...updated,
      {
        id: randomUUID(),
        title: '当前环境',
        requestUrl,
        apiKey,
        status: 'active',
        codeConfig: settings,
        createdAt: now,
        updatedAt: now
      }
    ]
  }

  await writeEnvironmentStore(updated)
  return updated
}

async function syncMcpRecords(records: ClaudeMcpRecord[]) {
  const claudeConfig = await readClaudeMcpConfig()
  const fileServers = claudeConfig.mcpServers ?? {}
  const nameSet = new Set(Object.keys(fileServers))
  const now = new Date().toISOString()

  const updated = records.map((record) => {
    if (nameSet.has(record.name)) {
      return {
        ...record,
        enabled: true,
        config: fileServers[record.name] as Record<string, unknown>,
        updatedAt: now
      }
    }
    return { ...record, enabled: false }
  })

  for (const [name, config] of Object.entries(fileServers)) {
    const existing = updated.find((item) => item.name === name)
    if (!existing) {
      updated.push({
        id: randomUUID(),
        name,
        displayName: name,
        docUrl: '',
        config: config as Record<string, unknown>,
        enabled: true,
        createdAt: now,
        updatedAt: now
      })
    }
  }

  await writeMcpStore(updated)
  return updated
}

// ========== 验证函数 ==========

function validateEnvironmentPayload(payload: ClaudeEnvironmentPayload) {
  if (!payload.requestUrl?.trim()) {
    throw new Error('请求地址必填')
  }
  if (!payload.apiKey?.trim()) {
    throw new Error('API KEY 必填')
  }
  if (!payload.codeConfig || typeof payload.codeConfig !== 'object') {
    throw new Error('Claude Code 配置格式不正确')
  }
}

// ========== 导出的服务函数 ==========

export async function getClaudeOverview() {
  const [environments, generalConfig, mcpRecords] = await Promise.all([
    readEnvironmentStore(),
    readGeneralConfigStore(),
    readMcpStore()
  ])

  const syncedEnvironments = await syncActiveEnvironment(environments)
  const syncedMcp = await syncMcpRecords(mcpRecords)

  return {
    environments: syncedEnvironments,
    generalConfig,
    mcpServers: syncedMcp
  }
}


async function persistEnvironmentList(
  environments: ClaudeEnvironmentRecord[]
) {
  await writeEnvironmentStore(environments)
}

export async function createClaudeEnvironment(
  payload: ClaudeEnvironmentPayload
) {
  validateEnvironmentPayload(payload)
  const now = new Date().toISOString()
  const environments = await readEnvironmentStore()
  const codeConfig = payload.codeConfig
  const record: ClaudeEnvironmentRecord = {
    id: randomUUID(),
    title: payload.title,
    homepage: payload.homepage,
    description: payload.description,
    writeToCommon: payload.writeToCommon,
    requestUrl: payload.requestUrl,
    apiKey: payload.apiKey,
    balanceUrl: payload.balanceUrl,
    balanceRequest: payload.balanceRequest,
    balanceJsonPath: payload.balanceJsonPath,
    balanceFormula: payload.balanceFormula,
    status: payload.status ?? 'inactive',
    codeConfig,
    createdAt: now,
    updatedAt: now
  }

  const updated = [...environments, record]
  await persistEnvironmentList(updated)

  if (record.status === 'active') {
    await activateClaudeEnvironment(record.id)
  }

  return record
}

export async function updateClaudeEnvironment(
  id: string,
  payload: ClaudeEnvironmentPayload
) {
  validateEnvironmentPayload(payload)
  const environments = await readEnvironmentStore()
  const index = environments.findIndex((env) => env.id === id)
  if (index === -1) {
    throw new Error('未找到指定环境')
  }

  const now = new Date().toISOString()
  const codeConfig = payload.codeConfig
  const nextRecord: ClaudeEnvironmentRecord = {
    id:environments[index].id,
    ...payload,
    codeConfig,
    status: payload.status ?? environments[index].status,
    createdAt:environments[index].id,
    updatedAt: now
  }

  environments[index] = nextRecord
  await persistEnvironmentList(environments)

  if (nextRecord.status === 'active') {
    await activateClaudeEnvironment(id)
  }

  return nextRecord
}

export async function getClaudeEnvironment(id: string) {
  const environments = await readEnvironmentStore()
  const record = environments.find((env) => env.id === id)
  if (!record) {
    claudeServiceLogger.warn({ id }, 'Claude 环境不存在')
    throw new Error('环境不存在')
  }
  return record
}

export async function deleteClaudeEnvironment(id: string) {
  const environments = await readEnvironmentStore()
  const record = environments.find((env) => env.id === id)
  if (!record) {
    claudeServiceLogger.warn({ id }, '删除失败：Claude 环境不存在')
    throw new Error('环境不存在')
  }
  if (record.status === 'active') {
    claudeServiceLogger.warn({ id, status: record.status }, '删除失败：Claude 环境处于启用状态')
    throw new Error('启用状态不可删除')
  }
  const updated = environments.filter((env) => env.id !== id)
  await persistEnvironmentList(updated)
  claudeServiceLogger.info({ id, title: record.title }, 'Claude 环境已删除')
}

export async function activateClaudeEnvironment(id: string) {
  const environments = await readEnvironmentStore()
  const record = environments.find((env) => env.id === id)
  if (!record) {
    claudeServiceLogger.warn({ id }, '激活失败：Claude 环境不存在')
    throw new Error('环境不存在')
  }

  await writeClaudeSettings(record.codeConfig)

  const now = new Date().toISOString()
  const updated = environments.map((env) =>
    env.id === id
      ? { ...env, status: 'active' as const, updatedAt: now }
      : { ...env, status: 'inactive' as const }
  )
  await persistEnvironmentList(updated)

  claudeServiceLogger.info({ id, title: record.title }, 'Claude 环境已激活')
  return { ...record, status: 'active' as const, updatedAt: now }
}

export async function saveClaudeGeneralConfig(
  payload: Record<string, unknown>
) {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('通用配置必须是 JSON 对象')
  }
  const record = await writeGeneralConfigStore(payload)
  return record
}

export async function upsertClaudeMcp(payload: ClaudeMcpPayload) {
  if (!payload.name?.trim()) {
    throw new Error('名称必填')
  }
  if (!payload.config || typeof payload.config !== 'object') {
    throw new Error('MCP 配置必须是 JSON 对象')
  }

  const servers = await readMcpStore()
  const now = new Date().toISOString()
  let record: ClaudeMcpRecord | undefined

  if (payload.id) {
    const index = servers.findIndex((item) => item.id === payload.id)
    if (index === -1) {
      claudeServiceLogger.warn({ id: payload.id }, '更新失败：Claude MCP 不存在')
      throw new Error('未找到指定 MCP')
    }
    record = {
      ...servers[index],
      ...payload,
      enabled: payload.enabled ?? servers[index].enabled,
      updatedAt: now
    }
    servers[index] = record
  } else {
    record = {
      id: randomUUID(),
      name: payload.name,
      displayName: payload.displayName ?? payload.name,
      docUrl: payload.docUrl,
      config: payload.config,
      enabled: payload.enabled ?? false,
      createdAt: now,
      updatedAt: now
    }
    servers.push(record)
  }

  await writeMcpStore(servers)
  if (record.enabled) {
    await writeClaudeMcpConfig((current) => ({
      ...current,
      mcpServers: {
        ...(current.mcpServers ?? {}),
        [record!.name]: record!.config
      }
    }))
  }
  return record
}

export async function toggleClaudeMcp(id: string, enabled: boolean) {
  const servers = await readMcpStore()
  const index = servers.findIndex((item) => item.id === id)
  if (index === -1) {
    claudeServiceLogger.warn({ id }, '切换失败：Claude MCP 不存在')
    throw new Error('未找到指定 MCP')
  }

  servers[index] = {
    ...servers[index],
    enabled,
    updatedAt: new Date().toISOString()
  }
  await writeMcpStore(servers)
  claudeServiceLogger.info({ id, name: servers[index].name, enabled }, 'Claude MCP 状态已切换')

  if (enabled) {
    await writeClaudeMcpConfig((current) => ({
      ...current,
      mcpServers: {
        ...(current.mcpServers ?? {}),
        [servers[index].name]: servers[index].config
      }
    }))
  } else {
    await writeClaudeMcpConfig((current) => {
      const nextServers = { ...(current.mcpServers ?? {}) }
      delete nextServers[servers[index].name]
      return {
        ...current,
        mcpServers: nextServers
      }
    })
  }

  return servers[index]
}

export async function deleteClaudeMcp(id: string) {
  const servers = await readMcpStore()
  const record = servers.find((item) => item.id === id)
  if (!record) {
    claudeServiceLogger.warn({ id }, '删除失败：Claude MCP 不存在')
    throw new Error('MCP 配置不存在')
  }
  if (record.enabled) {
    claudeServiceLogger.warn({ id, name: record.name }, '删除失败：Claude MCP 处于启用状态')
    throw new Error('启用状态不可删除')
  }
  const updated = servers.filter((item) => item.id !== id)
  await writeMcpStore(updated)
  claudeServiceLogger.info({ id, name: record.name }, 'Claude MCP 已删除')
}
