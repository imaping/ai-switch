import { randomUUID } from 'crypto'
import path from 'path'
import type {
  ClaudeCodeConfig,
  ClaudeEnvironmentPayload,
  ClaudeEnvironmentRecord,
  ClaudeGeneralConfig,
  ClaudeMcpPayload,
  ClaudeMcpRecord,
} from '#shared/types/claude'
import {
  getRemoteHome,
  readRemoteJson,
  writeRemoteJson,
  sftpWriteFile,
} from './sftp'

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

async function getPaths(remoteId: string) {
  const home = await getRemoteHome(remoteId)
  const aiSwitchDir = path.posix.join(home, '.ai-switch')
  return {
    envStore: path.posix.join(aiSwitchDir, 'claude-environments.json'),
    commonStore: path.posix.join(aiSwitchDir, 'claude-common.json'),
    mcpStore: path.posix.join(aiSwitchDir, 'claude-mcp.json'),
    settingsPath: path.posix.join(home, '.claude', 'settings.json'),
    mcpConfigPath: path.posix.join(home, '.claude.json'),
  }
}

// ========== Claude Settings / MCP Config 读写 ==========

async function writeClaudeSettings(remoteId: string, config: ClaudeCodeConfig) {
  const { settingsPath } = await getPaths(remoteId)
  await sftpWriteFile(remoteId, settingsPath, JSON.stringify(config, null, 2))
}

async function readClaudeMcpConfig(
  remoteId: string,
): Promise<ClaudeMcpConfigFile> {
  const { mcpConfigPath } = await getPaths(remoteId)
  return await readRemoteJson<ClaudeMcpConfigFile>(remoteId, mcpConfigPath, {})
}

async function writeClaudeMcpConfig(
  remoteId: string,
  updater: (current: ClaudeMcpConfigFile) => ClaudeMcpConfigFile,
) {
  const current = await readClaudeMcpConfig(remoteId)
  const next = updater(current)
  const { mcpConfigPath } = await getPaths(remoteId)
  await sftpWriteFile(remoteId, mcpConfigPath, JSON.stringify(next, null, 2))
}

// ========== Environment Store 读写 ==========

async function readEnvironmentStore(
  remoteId: string,
): Promise<ClaudeEnvironmentRecord[]> {
  const { envStore } = await getPaths(remoteId)
  const file = await readRemoteJson<ClaudeEnvironmentStoreFile>(
    remoteId,
    envStore,
    EMPTY_ENV_STORE,
  )
  return file.environments ?? []
}

async function writeEnvironmentStore(
  remoteId: string,
  environments: ClaudeEnvironmentRecord[],
) {
  const { envStore } = await getPaths(remoteId)
  await writeRemoteJson(remoteId, envStore, { environments })
}

// ========== General Config Store 读写 ==========

async function readGeneralConfigStore(
  remoteId: string,
): Promise<ClaudeGeneralConfig | undefined> {
  const { commonStore } = await getPaths(remoteId)
  const record = await readRemoteJson<ClaudeGeneralConfig | null>(
    remoteId,
    commonStore,
    null,
  )
  return record ?? undefined
}

async function writeGeneralConfigStore(
  remoteId: string,
  payload: Record<string, unknown>,
): Promise<ClaudeGeneralConfig> {
  const { commonStore } = await getPaths(remoteId)
  const record: ClaudeGeneralConfig = {
    id: 'claude-general',
    payload,
    updatedAt: new Date().toISOString(),
  }
  await writeRemoteJson(remoteId, commonStore, record)
  return record
}

// ========== MCP Store 读写 ==========

async function readMcpStore(remoteId: string): Promise<ClaudeMcpRecord[]> {
  const { mcpStore } = await getPaths(remoteId)
  const file = await readRemoteJson<ClaudeMcpStoreFile>(
    remoteId,
    mcpStore,
    EMPTY_MCP_STORE,
  )
  return file.servers ?? []
}

async function writeMcpStore(
  remoteId: string,
  servers: ClaudeMcpRecord[],
): Promise<void> {
  const { mcpStore } = await getPaths(remoteId)
  await writeRemoteJson(remoteId, mcpStore, { servers })
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

// ========== 导出服务函数（远程版）==========

export async function getRemoteClaudeOverview(remoteId: string) {
  const [environments, generalConfig, mcpServers] = await Promise.all([
    readEnvironmentStore(remoteId),
    readGeneralConfigStore(remoteId),
    readMcpStore(remoteId),
  ])

  return {
    environments,
    generalConfig,
    mcpServers,
  }
}

export async function createRemoteClaudeEnvironment(
  remoteId: string,
  payload: ClaudeEnvironmentPayload,
) {
  validateEnvironmentPayload(payload)
  const now = new Date().toISOString()
  const environments = await readEnvironmentStore(remoteId)
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
    codeConfig: payload.codeConfig,
    createdAt: now,
    updatedAt: now,
  }

  const updated = [...environments, record]
  await writeEnvironmentStore(remoteId, updated)

  if (record.status === 'active') {
    await activateRemoteClaudeEnvironment(remoteId, record.id)
  }

  return record
}

export async function updateRemoteClaudeEnvironment(
  remoteId: string,
  id: string,
  payload: ClaudeEnvironmentPayload,
) {
  validateEnvironmentPayload(payload)
  const environments = await readEnvironmentStore(remoteId)
  const index = environments.findIndex((env) => env.id === id)
  if (index === -1) {
    throw new Error('未找到指定环境')
  }

  const now = new Date().toISOString()
  const existing = environments[index]
  const nextRecord: ClaudeEnvironmentRecord = {
    ...existing,
    ...payload,
    status: payload.status ?? existing.status,
    codeConfig: payload.codeConfig,
    updatedAt: now,
  }

  environments[index] = nextRecord
  await writeEnvironmentStore(remoteId, environments)

  if (nextRecord.status === 'active') {
    await activateRemoteClaudeEnvironment(remoteId, id)
  }

  return nextRecord
}

export async function getRemoteClaudeEnvironment(
  remoteId: string,
  id: string,
) {
  const environments = await readEnvironmentStore(remoteId)
  const record = environments.find((env) => env.id === id)
  if (!record) throw new Error('环境不存在')
  return record
}

export async function deleteRemoteClaudeEnvironment(
  remoteId: string,
  id: string,
) {
  const environments = await readEnvironmentStore(remoteId)
  const record = environments.find((env) => env.id === id)
  if (!record) {
    throw new Error('环境不存在')
  }
  if (record.status === 'active') {
    throw new Error('启用状态不可删除')
  }
  const updated = environments.filter((env) => env.id !== id)
  await writeEnvironmentStore(remoteId, updated)
}

export async function activateRemoteClaudeEnvironment(
  remoteId: string,
  id: string,
) {
  const environments = await readEnvironmentStore(remoteId)
  const record = environments.find((env) => env.id === id)
  if (!record) {
    throw new Error('环境不存在')
  }

  await writeClaudeSettings(remoteId, record.codeConfig)

  const now = new Date().toISOString()
  const updated = environments.map((env) =>
    env.id === id
      ? { ...env, status: 'active' as const, updatedAt: now }
      : { ...env, status: 'inactive' as const },
  )
  await writeEnvironmentStore(remoteId, updated)

  return { ...record, status: 'active' as const, updatedAt: now }
}

export async function saveRemoteClaudeGeneralConfig(
  remoteId: string,
  payload: Record<string, unknown>,
) {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('通用配置必须是 JSON 对象')
  }
  const record = await writeGeneralConfigStore(remoteId, payload)
  return record
}

export async function upsertRemoteClaudeMcp(
  remoteId: string,
  payload: ClaudeMcpPayload,
) {
  if (!payload.name?.trim()) {
    throw new Error('名称必填')
  }
  if (!payload.config || typeof payload.config !== 'object') {
    throw new Error('MCP 配置必须是 JSON 对象')
  }

  const servers = await readMcpStore(remoteId)
  const now = new Date().toISOString()
  let record: ClaudeMcpRecord | undefined

  if (payload.id) {
    const index = servers.findIndex((item) => item.id === payload.id)
    if (index === -1) {
      throw new Error('未找到指定 MCP')
    }
    record = {
      ...servers[index],
      ...payload,
      enabled: payload.enabled ?? servers[index].enabled,
      updatedAt: now,
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
      updatedAt: now,
    }
    servers.push(record)
  }

  await writeMcpStore(remoteId, servers)
  if (record.enabled) {
    await writeClaudeMcpConfig(remoteId, (current) => ({
      ...current,
      mcpServers: {
        ...(current.mcpServers ?? {}),
        [record!.name]: record!.config,
      },
    }))
  }
  return record
}

export async function toggleRemoteClaudeMcp(
  remoteId: string,
  id: string,
  enabled: boolean,
) {
  const servers = await readMcpStore(remoteId)
  const index = servers.findIndex((item) => item.id === id)
  if (index === -1) {
    throw new Error('未找到指定 MCP')
  }

  servers[index] = {
    ...servers[index],
    enabled,
    updatedAt: new Date().toISOString(),
  }
  await writeMcpStore(remoteId, servers)

  if (enabled) {
    await writeClaudeMcpConfig(remoteId, (current) => ({
      ...current,
      mcpServers: {
        ...(current.mcpServers ?? {}),
        [servers[index].name]: servers[index].config,
      },
    }))
  } else {
    await writeClaudeMcpConfig(remoteId, (current) => {
      const nextServers = { ...(current.mcpServers ?? {}) }
      delete nextServers[servers[index].name]
      return {
        ...current,
        mcpServers: nextServers,
      }
    })
  }

  return servers[index]
}

export async function deleteRemoteClaudeMcp(
  remoteId: string,
  id: string,
): Promise<void> {
  const servers = await readMcpStore(remoteId)
  const record = servers.find((item) => item.id === id)
  if (!record) {
    throw new Error('MCP 配置不存在')
  }
  if (record.enabled) {
    throw new Error('启用状态不可删除')
  }
  const updated = servers.filter((item) => item.id !== id)
  await writeMcpStore(remoteId, updated)
}

