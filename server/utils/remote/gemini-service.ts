import { randomUUID } from 'crypto'
import path from 'path'
import type {
  GeminiEnvironmentPayload,
  GeminiEnvironmentRecord,
  GeminiGeneralConfig,
  GeminiMcpPayload,
  GeminiMcpRecord,
} from '#shared/types/gemini'
import {
  getRemoteHome,
  readRemoteJson,
  writeRemoteJson,
  sftpWriteFile,
} from './sftp'

const EMPTY_ENV_STORE = { environments: [] as GeminiEnvironmentRecord[] }
const EMPTY_MCP_STORE = { servers: [] as GeminiMcpRecord[] }

interface GeminiEnvironmentStoreFile {
  environments: GeminiEnvironmentRecord[]
}

interface GeminiMcpStoreFile {
  servers: GeminiMcpRecord[]
}

interface GeminiMcpConfigFile {
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}

function buildEnvContent(baseUrl: string, apiKey: string, model?: string): string {
  const lines = [
    `GOOGLE_GEMINI_BASE_URL=${baseUrl}`,
    `GEMINI_API_KEY=${apiKey}`,
  ]
  if (model && model.trim()) {
    lines.push(`GEMINI_MODEL=${model}`)
  }
  return lines.join('\n') + '\n'
}

function composeEnvContent(
  baseUrl: string,
  apiKey: string,
  model: string | undefined,
  commonSnippet?: string,
): string {
  const coreLines = buildEnvContent(baseUrl, apiKey, model).split(/\r?\n/)
  const presentKeys = new Set<string>()
  const out: string[] = []
  for (const line of coreLines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    out.push(line)
    const eq = trimmed.indexOf('=')
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim()
      if (key) presentKeys.add(key)
    }
  }

  if (commonSnippet && commonSnippet.trim()) {
    const lines = commonSnippet.split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        out.push(line)
        continue
      }
      const eq = trimmed.indexOf('=')
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim()
        if (presentKeys.has(key)) {
          continue
        }
      }
      out.push(line)
    }
  }

  return out.join('\n') + '\n'
}

async function getPaths(remoteId: string) {
  const home = await getRemoteHome(remoteId)
  const aiSwitchDir = path.posix.join(home, '.ai-switch')
  return {
    envStore: path.posix.join(aiSwitchDir, 'gemini-environments.json'),
    commonStore: path.posix.join(aiSwitchDir, 'gemini-common.json'),
    mcpStore: path.posix.join(aiSwitchDir, 'gemini-mcp.json'),
    envPath: path.posix.join(home, '.gemini', '.env'),
    mcpConfigPath: path.posix.join(home, '.gemini', 'settings.json'),
  }
}

// ========== .env 读写 ==========

async function writeGeminiEnvFile(remoteId: string, content: string) {
  const { envPath } = await getPaths(remoteId)
  await sftpWriteFile(remoteId, envPath, content)
}

// ========== Gemini MCP Config 读写 ==========

async function readGeminiMcpConfig(remoteId: string): Promise<GeminiMcpConfigFile> {
  const { mcpConfigPath } = await getPaths(remoteId)
  return await readRemoteJson<GeminiMcpConfigFile>(remoteId, mcpConfigPath, {})
}

async function writeGeminiMcpConfig(
  remoteId: string,
  updater: (current: GeminiMcpConfigFile) => GeminiMcpConfigFile,
) {
  const current = await readGeminiMcpConfig(remoteId)
  const next = updater(current)
  const { mcpConfigPath } = await getPaths(remoteId)
  await sftpWriteFile(remoteId, mcpConfigPath, JSON.stringify(next, null, 2))
}

// ========== Environment Store 读写 ==========

async function readEnvironmentStore(remoteId: string): Promise<GeminiEnvironmentRecord[]> {
  const { envStore } = await getPaths(remoteId)
  const file = await readRemoteJson<GeminiEnvironmentStoreFile>(
    remoteId,
    envStore,
    EMPTY_ENV_STORE,
  )
  return file.environments ?? []
}

async function writeEnvironmentStore(
  remoteId: string,
  environments: GeminiEnvironmentRecord[],
) {
  const { envStore } = await getPaths(remoteId)
  await writeRemoteJson(remoteId, envStore, { environments })
}

// ========== General Config Store 读写 ==========

async function readGeneralConfigStore(
  remoteId: string,
): Promise<GeminiGeneralConfig | undefined> {
  const { commonStore } = await getPaths(remoteId)
  const record = await readRemoteJson<GeminiGeneralConfig | null>(
    remoteId,
    commonStore,
    null,
  )
  return record ?? undefined
}

async function writeGeneralConfigStore(
  remoteId: string,
  payload: string,
): Promise<GeminiGeneralConfig> {
  const { commonStore } = await getPaths(remoteId)
  const record: GeminiGeneralConfig = {
    id: 'gemini-general',
    payload,
    updatedAt: new Date().toISOString(),
  }
  await writeRemoteJson(remoteId, commonStore, record)
  return record
}

// ========== MCP Store 读写 ==========

async function readMcpStore(remoteId: string): Promise<GeminiMcpRecord[]> {
  const { mcpStore } = await getPaths(remoteId)
  const file = await readRemoteJson<GeminiMcpStoreFile>(
    remoteId,
    mcpStore,
    EMPTY_MCP_STORE,
  )
  return file.servers ?? []
}

async function writeMcpStore(remoteId: string, servers: GeminiMcpRecord[]) {
  const { mcpStore } = await getPaths(remoteId)
  await writeRemoteJson(remoteId, mcpStore, { servers })
}

// ========== 验证函数 ==========

function validateEnvironmentPayload(payload: GeminiEnvironmentPayload) {
  if (!payload.baseUrl?.trim()) {
    throw new Error('请求地址必填')
  }
  if (!payload.apiKey?.trim()) {
    throw new Error('API KEY 必填')
  }
}

// ========== 导出服务函数（远程版）==========

export async function getRemoteGeminiOverview(remoteId: string) {
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

export async function createRemoteGeminiEnvironment(
  remoteId: string,
  payload: GeminiEnvironmentPayload,
) {
  validateEnvironmentPayload(payload)
  const now = new Date().toISOString()
  const environments = await readEnvironmentStore(remoteId)
  const general = await readGeneralConfigStore(remoteId)

  const record: GeminiEnvironmentRecord = {
    id: randomUUID(),
    title: payload.title,
    homepage: payload.homepage,
    description: payload.description,
    writeToCommon: payload.writeToCommon,
    baseUrl: payload.baseUrl,
    apiKey: payload.apiKey,
    model: payload.model,
    balanceUrl: payload.balanceUrl,
    balanceRequest: payload.balanceRequest,
    balanceJsonPath: payload.balanceJsonPath,
    balanceFormula: payload.balanceFormula,
    envContent: composeEnvContent(
      payload.baseUrl,
      payload.apiKey,
      payload.model,
      general?.payload,
    ),
    status: payload.status ?? 'inactive',
    createdAt: now,
    updatedAt: now,
  }

  const updated = [...environments, record]
  await writeEnvironmentStore(remoteId, updated)

  if (record.status === 'active') {
    await activateRemoteGeminiEnvironment(remoteId, record.id)
  }

  return record
}

export async function updateRemoteGeminiEnvironment(
  remoteId: string,
  id: string,
  payload: GeminiEnvironmentPayload,
) {
  validateEnvironmentPayload(payload)
  const environments = await readEnvironmentStore(remoteId)
  const index = environments.findIndex((env) => env.id === id)
  if (index === -1) {
    throw new Error('未找到指定环境')
  }

  const now = new Date().toISOString()
  const prev = environments[index]

  const nextRecord: GeminiEnvironmentRecord = {
    id: prev.id,
    title: payload.title,
    homepage: payload.homepage,
    description: payload.description,
    writeToCommon: payload.writeToCommon,
    baseUrl: payload.baseUrl,
    apiKey: payload.apiKey,
    model: payload.model,
    balanceUrl: payload.balanceUrl,
    balanceRequest: payload.balanceRequest,
    balanceJsonPath: payload.balanceJsonPath,
    balanceFormula: payload.balanceFormula,
    envContent: composeEnvContent(
      payload.baseUrl,
      payload.apiKey,
      payload.model,
      (await readGeneralConfigStore(remoteId))?.payload,
    ),
    status: payload.status ?? prev.status,
    createdAt: prev.createdAt,
    updatedAt: now,
  }

  environments[index] = nextRecord
  await writeEnvironmentStore(remoteId, environments)

  if (nextRecord.status === 'active') {
    await activateRemoteGeminiEnvironment(remoteId, id)
  }

  return nextRecord
}

export async function getRemoteGeminiEnvironment(
  remoteId: string,
  id: string,
): Promise<GeminiEnvironmentRecord> {
  const environments = await readEnvironmentStore(remoteId)
  const record = environments.find((env) => env.id === id)
  if (!record) {
    throw new Error('环境不存在')
  }
  return record
}

export async function deleteRemoteGeminiEnvironment(
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

export async function activateRemoteGeminiEnvironment(
  remoteId: string,
  id: string,
) {
  const environments = await readEnvironmentStore(remoteId)
  const record = environments.find((env) => env.id === id)
  if (!record) {
    throw new Error('环境不存在')
  }

  const general = await readGeneralConfigStore(remoteId)
  const newEnvContent = composeEnvContent(
    record.baseUrl,
    record.apiKey,
    record.model,
    general?.payload,
  )
  await writeGeminiEnvFile(remoteId, newEnvContent)

  const now = new Date().toISOString()
  const updated = environments.map((env) =>
    env.id === id
      ? {
          ...env,
          status: 'active' as const,
          envContent: newEnvContent,
          updatedAt: now,
        }
      : { ...env, status: 'inactive' as const },
  )
  await writeEnvironmentStore(remoteId, updated)

  return { ...record, status: 'active' as const, updatedAt: now }
}

export async function saveRemoteGeminiGeneralConfig(
  remoteId: string,
  content: string,
) {
  if (typeof content !== 'string') {
    throw new Error('通用配置必须是字符串 (.env 片段)')
  }
  return writeGeneralConfigStore(remoteId, content)
}

export async function upsertRemoteGeminiMcp(
  remoteId: string,
  payload: GeminiMcpPayload,
) {
  if (!payload.name?.trim()) {
    throw new Error('名称必填')
  }
  if (!payload.config || typeof payload.config !== 'object') {
    throw new Error('MCP 配置必须是 JSON 对象')
  }

  const servers = await readMcpStore(remoteId)
  const now = new Date().toISOString()
  let record: GeminiMcpRecord | undefined

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
    await writeGeminiMcpConfig(remoteId, (current) => ({
      ...current,
      mcpServers: {
        ...(current.mcpServers ?? {}),
        [record!.name]: record!.config,
      },
    }))
  }
  return record
}

export async function toggleRemoteGeminiMcp(
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
    await writeGeminiMcpConfig(remoteId, (current) => ({
      ...current,
      mcpServers: {
        ...(current.mcpServers ?? {}),
        [servers[index].name]: servers[index].config,
      },
    }))
  } else {
    await writeGeminiMcpConfig(remoteId, (current) => {
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

export async function deleteRemoteGeminiMcp(
  remoteId: string,
  id: string,
) {
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
