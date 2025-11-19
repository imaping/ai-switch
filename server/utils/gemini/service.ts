import { randomUUID } from 'crypto'
import type {
  GeminiEnvironmentPayload,
  GeminiEnvironmentRecord,
  GeminiGeneralConfig,
  GeminiMcpPayload,
  GeminiMcpRecord,
} from '#shared/types/gemini'
import {
  GEMINI_ENV_PATH,
  GEMINI_MCP_CONFIG_PATH,
  GEMINI_ENV_STORE_PATH,
  GEMINI_COMMON_STORE_PATH,
  GEMINI_MCP_STORE_PATH,
} from '../paths'
import {
  ensureDirExists,
  readJsonFile,
  writeJsonFile,
  readTextFile,
  writeTextFile,
} from '../fs'
import { geminiServiceLogger } from '../logger'

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

interface ParsedEnvFile {
  raw: string
  baseUrl?: string
  apiKey?: string
  model?: string
}

// ========== .env 解析工具 ==========

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex <= 0) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1)
    }
    if (!key) continue
    result[key] = value
  }
  return result
}

function extractFromEnvFile(raw: string): ParsedEnvFile {
  const map = parseEnv(raw)
  return {
    raw,
    baseUrl: map.GOOGLE_GEMINI_BASE_URL,
    apiKey: map.GEMINI_API_KEY,
    model: map.GEMINI_MODEL,
  }
}

// 构造仅包含核心变量的 .env 内容
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

// 将核心变量与通用 .env 片段合并，环境级变量优先
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

// ========== Gemini .env 读写 ==========

async function readGeminiEnvFile(): Promise<ParsedEnvFile | null> {
  try {
    const raw = await readTextFile(GEMINI_ENV_PATH)
    return extractFromEnvFile(raw)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    geminiServiceLogger.error({ error, path: GEMINI_ENV_PATH }, '读取 Gemini .env 失败')
    throw error
  }
}

async function writeGeminiEnvFile(content: string) {
  await ensureDirExists(GEMINI_ENV_PATH)
  await writeTextFile(GEMINI_ENV_PATH, content)
}

// ========== Gemini MCP Config 读写 ==========

async function readGeminiMcpConfig(): Promise<GeminiMcpConfigFile> {
  return readJsonFile<GeminiMcpConfigFile>(GEMINI_MCP_CONFIG_PATH, {})
}

async function writeGeminiMcpConfig(
  updater: (current: GeminiMcpConfigFile) => GeminiMcpConfigFile,
) {
  const current = await readGeminiMcpConfig()
  const next = updater(current)
  await ensureDirExists(GEMINI_MCP_CONFIG_PATH)
  await writeJsonFile(GEMINI_MCP_CONFIG_PATH, next)
}

// ========== Environment Store 读写 ==========

async function readEnvironmentStore(): Promise<GeminiEnvironmentRecord[]> {
  const file = await readJsonFile<GeminiEnvironmentStoreFile>(
    GEMINI_ENV_STORE_PATH,
    EMPTY_ENV_STORE,
  )
  return file.environments ?? []
}

async function writeEnvironmentStore(environments: GeminiEnvironmentRecord[]) {
  await writeJsonFile(GEMINI_ENV_STORE_PATH, { environments })
}

// ========== General Config Store 读写 ==========

async function readGeneralConfigStore(): Promise<GeminiGeneralConfig | undefined> {
  const record = await readJsonFile<GeminiGeneralConfig | null>(
    GEMINI_COMMON_STORE_PATH,
    null,
  )
  return record ?? undefined
}

async function writeGeneralConfigStore(payload: string): Promise<GeminiGeneralConfig> {
  const record: GeminiGeneralConfig = {
    id: 'gemini-general',
    payload,
    updatedAt: new Date().toISOString(),
  }
  await writeJsonFile(GEMINI_COMMON_STORE_PATH, record)
  return record
}

// ========== MCP Store 读写 ==========

async function readMcpStore(): Promise<GeminiMcpRecord[]> {
  const file = await readJsonFile<GeminiMcpStoreFile>(
    GEMINI_MCP_STORE_PATH,
    EMPTY_MCP_STORE,
  )
  return file.servers ?? []
}

async function writeMcpStore(servers: GeminiMcpRecord[]) {
  await writeJsonFile(GEMINI_MCP_STORE_PATH, { servers })
}

// ========== 同步函数 ==========

async function syncActiveEnvironment(
  environments: GeminiEnvironmentRecord[],
): Promise<GeminiEnvironmentRecord[]> {
  const parsed = await readGeminiEnvFile()
  if (!parsed?.baseUrl || !parsed.apiKey) {
    return environments
  }

  const { baseUrl, apiKey, model = '' } = parsed
  const now = new Date().toISOString()

  let updated = environments.map((env) =>
    env.baseUrl === baseUrl &&
    env.apiKey === apiKey &&
    env.model === model
      ? {
          ...env,
          status: 'active' as const,
          envContent: parsed.raw,
          updatedAt: now,
        }
      : { ...env, status: 'inactive' as const },
  )

  const exists = updated.some(
    (env) =>
      env.baseUrl === baseUrl &&
      env.apiKey === apiKey &&
      env.model === model,
  )

  if (!exists) {
    updated = [
      ...updated,
      {
        id: randomUUID(),
        title: '当前环境',
        baseUrl,
        apiKey,
        model,
        status: 'active',
        envContent: parsed.raw,
        createdAt: now,
        updatedAt: now,
      },
    ]
  }

  await writeEnvironmentStore(updated)
  return updated
}

async function syncMcpRecords(records: GeminiMcpRecord[]): Promise<GeminiMcpRecord[]> {
  const cfg = await readGeminiMcpConfig()
  const fileServers = cfg.mcpServers ?? {}
  const nameSet = new Set(Object.keys(fileServers))
  const now = new Date().toISOString()

  const updated = records.map((record) => {
    if (nameSet.has(record.name)) {
      return {
        ...record,
        enabled: true,
        config: fileServers[record.name] as Record<string, unknown>,
        updatedAt: now,
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
        updatedAt: now,
      })
    }
  }

  await writeMcpStore(updated)
  return updated
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

// ========== 导出的服务函数 ==========

export async function getGeminiOverview() {
  const [environments, generalConfig, mcpRecords] = await Promise.all([
    readEnvironmentStore(),
    readGeneralConfigStore(),
    readMcpStore(),
  ])

  const syncedEnvironments = await syncActiveEnvironment(environments)
  const syncedMcp = await syncMcpRecords(mcpRecords)

  return {
    environments: syncedEnvironments,
    generalConfig,
    mcpServers: syncedMcp,
  }
}

async function persistEnvironmentList(environments: GeminiEnvironmentRecord[]) {
  await writeEnvironmentStore(environments)
}

export async function createGeminiEnvironment(
  payload: GeminiEnvironmentPayload,
): Promise<GeminiEnvironmentRecord> {
  validateEnvironmentPayload(payload)
  const now = new Date().toISOString()
  const environments = await readEnvironmentStore()
  const general = await readGeneralConfigStore()

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
    status: payload.status ?? 'inactive',
    envContent: composeEnvContent(
      payload.baseUrl,
      payload.apiKey,
      payload.model,
      general?.payload,
    ),
    createdAt: now,
    updatedAt: now,
  }

  const updated = [...environments, record]
  await persistEnvironmentList(updated)

  if (record.status === 'active') {
    await activateGeminiEnvironment(record.id)
  }

  return record
}

export async function updateGeminiEnvironment(
  id: string,
  payload: GeminiEnvironmentPayload,
): Promise<GeminiEnvironmentRecord> {
  validateEnvironmentPayload(payload)
  const environments = await readEnvironmentStore()
  const index = environments.findIndex((env) => env.id === id)
  if (index === -1) {
    throw new Error('未找到指定环境')
  }

  const now = new Date().toISOString()
  const prev = environments[index]
  const general = await readGeneralConfigStore()

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
    status: payload.status ?? prev.status,
    envContent: composeEnvContent(
      payload.baseUrl,
      payload.apiKey,
      payload.model,
      general?.payload,
    ),
    createdAt: prev.createdAt,
    updatedAt: now,
  }

  environments[index] = nextRecord
  await persistEnvironmentList(environments)

  if (nextRecord.status === 'active') {
    await activateGeminiEnvironment(id)
  }

  return nextRecord
}

export async function getGeminiEnvironment(id: string): Promise<GeminiEnvironmentRecord> {
  const environments = await readEnvironmentStore()
  const record = environments.find((env) => env.id === id)
  if (!record) {
    geminiServiceLogger.warn({ id }, 'Gemini 环境不存在')
    throw new Error('环境不存在')
  }
  return record
}

export async function deleteGeminiEnvironment(id: string): Promise<void> {
  const environments = await readEnvironmentStore()
  const record = environments.find((env) => env.id === id)
  if (!record) {
    geminiServiceLogger.warn({ id }, '删除失败：Gemini 环境不存在')
    throw new Error('环境不存在')
  }
  if (record.status === 'active') {
    geminiServiceLogger.warn(
      { id, status: record.status },
      '删除失败：Gemini 环境处于启用状态',
    )
    throw new Error('启用状态不可删除')
  }
  const updated = environments.filter((env) => env.id !== id)
  await persistEnvironmentList(updated)
  geminiServiceLogger.info({ id, title: record.title }, 'Gemini 环境已删除')
}

export async function activateGeminiEnvironment(
  id: string,
): Promise<GeminiEnvironmentRecord> {
  const environments = await readEnvironmentStore()
  const record = environments.find((env) => env.id === id)
  if (!record) {
    geminiServiceLogger.warn({ id }, '激活失败：Gemini 环境不存在')
    throw new Error('环境不存在')
  }

  const general = await readGeneralConfigStore()
  const newEnvContent = composeEnvContent(
    record.baseUrl,
    record.apiKey,
    record.model,
    general?.payload,
  )

  await writeGeminiEnvFile(newEnvContent)

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
  await persistEnvironmentList(updated)

  geminiServiceLogger.info({ id, title: record.title }, 'Gemini 环境已激活')
  return { ...record, status: 'active' as const, updatedAt: now }
}

export async function saveGeminiGeneralConfig(
  content: string,
): Promise<GeminiGeneralConfig> {
  if (typeof content !== 'string') {
    throw new Error('通用配置必须是字符串 (.env 片段)')
  }
  const record = await writeGeneralConfigStore(content)
  return record
}

export async function upsertGeminiMcp(
  payload: GeminiMcpPayload,
): Promise<GeminiMcpRecord> {
  if (!payload.name?.trim()) {
    throw new Error('名称必填')
  }
  if (!payload.config || typeof payload.config !== 'object') {
    throw new Error('MCP 配置必须是 JSON 对象')
  }

  const servers = await readMcpStore()
  const now = new Date().toISOString()
  let record: GeminiMcpRecord | undefined

  if (payload.id) {
    const index = servers.findIndex((item) => item.id === payload.id)
    if (index === -1) {
      geminiServiceLogger.warn({ id: payload.id }, '更新失败：Gemini MCP 不存在')
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

  await writeMcpStore(servers)
  if (record.enabled) {
    await writeGeminiMcpConfig((current) => ({
      ...current,
      mcpServers: {
        ...(current.mcpServers ?? {}),
        [record!.name]: record!.config,
      },
    }))
  }
  return record
}

export async function toggleGeminiMcp(
  id: string,
  enabled: boolean,
): Promise<GeminiMcpRecord> {
  const servers = await readMcpStore()
  const index = servers.findIndex((item) => item.id === id)
  if (index === -1) {
    geminiServiceLogger.warn({ id }, '切换失败：Gemini MCP 不存在')
    throw new Error('未找到指定 MCP')
  }

  servers[index] = {
    ...servers[index],
    enabled,
    updatedAt: new Date().toISOString(),
  }
  await writeMcpStore(servers)

  if (enabled) {
    await writeGeminiMcpConfig((current) => ({
      ...current,
      mcpServers: {
        ...(current.mcpServers ?? {}),
        [servers[index].name]: servers[index].config,
      },
    }))
  } else {
    await writeGeminiMcpConfig((current) => {
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

export async function deleteGeminiMcp(id: string): Promise<void> {
  const servers = await readMcpStore()
  const record = servers.find((item) => item.id === id)
  if (!record) {
    geminiServiceLogger.warn({ id }, '删除失败：Gemini MCP 不存在')
    throw new Error('MCP 配置不存在')
  }
  if (record.enabled) {
    geminiServiceLogger.warn(
      { id, name: record.name },
      '删除失败：Gemini MCP 处于启用状态',
    )
    throw new Error('启用状态不可删除')
  }
  const updated = servers.filter((item) => item.id !== id)
  await writeMcpStore(updated)
  geminiServiceLogger.info({ id, name: record.name }, 'Gemini MCP 已删除')
}
