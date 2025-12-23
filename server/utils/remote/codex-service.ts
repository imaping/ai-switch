import { randomUUID } from 'crypto'
import * as TOML from '@iarna/toml'
import path from 'path'
import type {
  CodexEnvironmentPayload,
  CodexEnvironmentRecord,
  CodexGeneralConfig,
  CodexMcpPayload,
  CodexMcpRecord,
} from '#shared/types/codex'
import {
  getRemoteHomePath,
  readRemoteJsonFile,
  writeRemoteJsonFile,
  readRemoteFile,
  writeRemoteFile,
} from './file-adapter'

type TomlObject = Record<string, unknown>

const EMPTY_ENV_STORE = { environments: [] as CodexEnvironmentRecord[] }
const EMPTY_MCP_STORE = { servers: [] as CodexMcpRecord[] }

interface CodexEnvironmentStoreFile {
  environments: CodexEnvironmentRecord[]
}

interface CodexMcpStoreFile {
  servers: CodexMcpRecord[]
}

interface CodexAuthFile {
  OPENAI_API_KEY?: string
  [key: string]: unknown
}

interface CodexConfigFile {
  raw: string
  parsed: TomlObject
}

const GENERAL_CONFIG_ID = 'codex-general'

const isPlainObject = (value: unknown): value is TomlObject =>
  Object.prototype.toString.call(value) === '[object Object]'

const parseToml = (content: string): TomlObject =>
  (TOML.parse(content || '') as TomlObject) ?? {}

const stringifyToml = (content: TomlObject): string =>
  TOML.stringify(content as any)

async function getPaths(remoteId: string) {
  const home = await getRemoteHomePath(remoteId)
  const aiSwitchDir = path.posix.join(home, '.ai-switch')
  return {
    configPath: path.posix.join(home, '.codex', 'config.toml'),
    authPath: path.posix.join(home, '.codex', 'auth.json'),
    envStore: path.posix.join(aiSwitchDir, 'codex-environments.json'),
    commonStore: path.posix.join(aiSwitchDir, 'codex-common.json'),
    mcpStore: path.posix.join(aiSwitchDir, 'codex-mcp.json'),
  }
}

// ========== Codex Config File 读写 ==========

async function readCodexConfigFile(
  remoteId: string,
): Promise<CodexConfigFile | null> {
  const { configPath } = await getPaths(remoteId)
  try {
    const raw = await readRemoteFile(remoteId, configPath)
    return { raw, parsed: parseToml(raw) }
  } catch {
    return null
  }
}

async function writeCodexConfigString(
  remoteId: string,
  content: string,
): Promise<void> {
  const { configPath } = await getPaths(remoteId)
  await writeRemoteFile(remoteId, configPath, content)
}

async function writeCodexConfigObject(
  remoteId: string,
  object: TomlObject,
): Promise<void> {
  const serialized = stringifyToml(object)
  await writeCodexConfigString(remoteId, serialized)
}

// ========== Codex Auth File 读写 ==========

async function readCodexAuthFile(remoteId: string): Promise<CodexAuthFile> {
  const { authPath } = await getPaths(remoteId)
  return await readRemoteJsonFile<CodexAuthFile>(remoteId, authPath, {})
}

async function writeCodexAuthFile(
  remoteId: string,
  updater: (current: CodexAuthFile) => CodexAuthFile,
): Promise<void> {
  const { authPath } = await getPaths(remoteId)
  const current = await readCodexAuthFile(remoteId)
  const next = updater(current)
  await writeRemoteJsonFile(remoteId, authPath, next)
}

// ========== Environment Store 读写 ==========

async function readEnvironmentStore(
  remoteId: string,
): Promise<CodexEnvironmentRecord[]> {
  const { envStore } = await getPaths(remoteId)
  const file = await readRemoteJsonFile<CodexEnvironmentStoreFile>(
    remoteId,
    envStore,
    EMPTY_ENV_STORE,
  )
  return file.environments ?? []
}

async function writeEnvironmentStore(
  remoteId: string,
  environments: CodexEnvironmentRecord[],
): Promise<void> {
  const { envStore } = await getPaths(remoteId)
  await writeRemoteJsonFile(remoteId, envStore, { environments })
}

// ========== General Config Store 读写 ==========

async function readGeneralConfigStore(
  remoteId: string,
): Promise<CodexGeneralConfig | undefined> {
  const { commonStore } = await getPaths(remoteId)
  const record = await readRemoteJsonFile<CodexGeneralConfig | null>(
    remoteId,
    commonStore,
    null,
  )
  return record ?? undefined
}

async function writeGeneralConfigStore(
  remoteId: string,
  payload: string,
): Promise<CodexGeneralConfig> {
  const { commonStore } = await getPaths(remoteId)
  const record: CodexGeneralConfig = {
    id: GENERAL_CONFIG_ID,
    payload,
    updatedAt: new Date().toISOString(),
  }
  await writeRemoteJsonFile(remoteId, commonStore, record)
  return record
}

// ========== MCP Store 读写 ==========

async function readMcpStore(remoteId: string): Promise<CodexMcpRecord[]> {
  const { mcpStore } = await getPaths(remoteId)
  const file = await readRemoteJsonFile<CodexMcpStoreFile>(
    remoteId,
    mcpStore,
    EMPTY_MCP_STORE,
  )
  return file.servers ?? []
}

async function writeMcpStore(
  remoteId: string,
  servers: CodexMcpRecord[],
): Promise<void> {
  const { mcpStore } = await getPaths(remoteId)
  await writeRemoteJsonFile(remoteId, mcpStore, { servers })
}

// ========== BaseUrl 处理函数 ==========

function getBaseUrl(config: TomlObject): string | undefined {
  const direct = (config as any).base_url
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim()
  }
  const providers = (config as any).model_providers
  if (isPlainObject(providers)) {
    for (const value of Object.values(providers)) {
      if (
        isPlainObject(value) &&
        typeof (value as any).base_url === 'string' &&
        (value as any).base_url.trim()
      ) {
        return (value as any).base_url.trim()
      }
    }
  }
  return undefined
}

function collectBaseUrlTargets(config: TomlObject) {
  const targets: Array<{ scope: 'root' } | { scope: 'provider'; name: string }> =
    []
  if ('base_url' in config) {
    targets.push({ scope: 'root' })
  }
  const providers = (config as any).model_providers
  if (isPlainObject(providers)) {
    Object.entries(providers).forEach(([name, provider]) => {
      if (isPlainObject(provider) && 'base_url' in (provider as TomlObject)) {
        targets.push({ scope: 'provider', name })
      }
    })
  }
  return targets
}

function applyBaseUrl(config: TomlObject, baseUrl: string) {
  const targets = collectBaseUrlTargets(config)
  if (targets.length === 0) {
    ;(config as any).base_url = baseUrl
    return
  }
  const providers = (config as any).model_providers
  targets.forEach((target) => {
    if (target.scope === 'root') {
      ;(config as any).base_url = baseUrl
      return
    }
    if (
      isPlainObject(providers) &&
      isPlainObject((providers as any)[target.name]) &&
      'base_url' in ((providers as any)[target.name] as TomlObject)
    ) {
      ;((providers as any)[target.name] as TomlObject).base_url = baseUrl
    }
  })
}

function normalizeConfigToml(configToml: string, baseUrl: string) {
  if (!baseUrl?.trim()) {
    throw new Error('请求地址必填')
  }
  const parsed = parseToml(configToml)
  applyBaseUrl(parsed, baseUrl.trim())
  return { serialized: stringifyToml(parsed) }
}

// ========== 验证函数 ==========

function validateEnvironmentPayload(payload: CodexEnvironmentPayload) {
  if (!payload.baseUrl?.trim()) {
    throw new Error('请求地址必填')
  }
  if (!payload.apiKey?.trim()) {
    throw new Error('API KEY 必填')
  }
  if (typeof payload.configToml !== 'string') {
    throw new Error('Codex 配置格式不正确')
  }
}

function normalizeMcpSnippet(content: string): string {
  try {
    const parsed = parseToml(content)
    return stringifyToml(parsed)
  } catch (error) {
    throw new Error(`MCP TOML 配置无效: ${(error as Error).message}`)
  }
}

// ========== MCP 合并函数 ==========

async function mergeMcpIntoConfig(
  remoteId: string,
  config: TomlObject,
  servers?: CodexMcpRecord[],
) {
  const records = servers ?? (await readMcpStore(remoteId))
  if (records.length === 0) {
    delete (config as any).mcp_servers
    return config
  }
  const managedNames = new Set(records.map((record) => record.name))
  const existing = isPlainObject((config as any).mcp_servers)
    ? { ...((config as any).mcp_servers as TomlObject) }
    : {}
  const preserved: TomlObject = {}

  Object.entries(existing).forEach(([name, value]) => {
    if (!managedNames.has(name)) {
      preserved[name] = value
    }
  })

  records.forEach((record) => {
    if (!record.enabled) return
    preserved[record.name] = parseToml(record.tomlConfig)
  })

  if (Object.keys(preserved).length > 0) {
    ;(config as any).mcp_servers = preserved
  } else {
    delete (config as any).mcp_servers
  }
  return config
}

async function rewriteConfigMcpSection(
  remoteId: string,
  servers?: CodexMcpRecord[],
) {
  const base = (await readCodexConfigFile(remoteId))?.parsed ?? {}
  const merged = await mergeMcpIntoConfig(remoteId, base, servers)
  await writeCodexConfigObject(remoteId, merged)
}

// ========== 导出服务函数（远程版）==========

export async function getRemoteCodexOverview(remoteId: string) {
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

export async function createRemoteCodexEnvironment(
  remoteId: string,
  payload: CodexEnvironmentPayload,
) {
  validateEnvironmentPayload(payload)
  const now = new Date().toISOString()
  const environments = await readEnvironmentStore(remoteId)
  const normalized = normalizeConfigToml(payload.configToml, payload.baseUrl)

  const record: CodexEnvironmentRecord = {
    id: randomUUID(),
    title: payload.title,
    homepage: payload.homepage,
    description: payload.description,
    writeToCommon: payload.writeToCommon,
    baseUrl: payload.baseUrl,
    apiKey: payload.apiKey,
    balanceUrl: payload.balanceUrl,
    balanceRequest: payload.balanceRequest,
    balanceJsonPath: payload.balanceJsonPath,
    balanceFormula: payload.balanceFormula,
    configToml: normalized.serialized,
    status: payload.status ?? 'inactive',
    createdAt: now,
    updatedAt: now,
  }

  const updated = [...environments, record]
  await writeEnvironmentStore(remoteId, updated)

  if (record.status === 'active') {
    await activateRemoteCodexEnvironment(remoteId, record.id)
  }

  return record
}

export async function updateRemoteCodexEnvironment(
  remoteId: string,
  id: string,
  payload: CodexEnvironmentPayload,
) {
  validateEnvironmentPayload(payload)
  const environments = await readEnvironmentStore(remoteId)
  const index = environments.findIndex((env) => env.id === id)
  if (index === -1) {
    throw new Error('未找到指定环境')
  }

  const now = new Date().toISOString()
  const normalized = normalizeConfigToml(payload.configToml, payload.baseUrl)
  const existing = environments[index]
  const nextRecord: CodexEnvironmentRecord = {
    ...existing,
    ...payload,
    configToml: normalized.serialized,
    status: payload.status ?? existing.status,
    updatedAt: now,
  }

  environments[index] = nextRecord
  await writeEnvironmentStore(remoteId, environments)

  if (nextRecord.status === 'active') {
    await activateRemoteCodexEnvironment(remoteId, id)
  }

  return nextRecord
}

export async function getRemoteCodexEnvironment(
  remoteId: string,
  id: string,
) {
  const environments = await readEnvironmentStore(remoteId)
  const record = environments.find((env) => env.id === id)
  if (!record) throw new Error('环境不存在')
  return record
}

export async function deleteRemoteCodexEnvironment(
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

export async function activateRemoteCodexEnvironment(
  remoteId: string,
  id: string,
) {
  const environments = await readEnvironmentStore(remoteId)
  const record = environments.find((env) => env.id === id)
  if (!record) {
    throw new Error('环境不存在')
  }

  const parsed = parseToml(record.configToml)
  applyBaseUrl(parsed, record.baseUrl)
  const merged = await mergeMcpIntoConfig(remoteId, parsed)
  await writeCodexConfigObject(remoteId, merged)
  await writeCodexAuthFile(remoteId, (current) => ({
    ...current,
    OPENAI_API_KEY: record.apiKey,
  }))

  const now = new Date().toISOString()
  const updated = environments.map((env) =>
    env.id === id
      ? { ...env, status: 'active' as const, updatedAt: now }
      : { ...env, status: 'inactive' as const },
  )
  await writeEnvironmentStore(remoteId, updated)

  return { ...record, status: 'active' as const, updatedAt: now }
}

export async function saveRemoteCodexGeneralConfig(
  remoteId: string,
  content: string,
) {
  const parsed = parseToml(content)
  const serialized = stringifyToml(parsed)
  return writeGeneralConfigStore(remoteId, serialized)
}

export async function upsertRemoteCodexMcp(
  remoteId: string,
  payload: CodexMcpPayload,
) {
  if (!payload.name?.trim()) {
    throw new Error('名称必填')
  }
  if (typeof payload.tomlConfig !== 'string') {
    throw new Error('MCP 配置必须是 TOML 字符串')
  }

  const servers = await readMcpStore(remoteId)
  const now = new Date().toISOString()
  let record: CodexMcpRecord | undefined

  if (payload.id) {
    const index = servers.findIndex((item) => item.id === payload.id)
    if (index === -1) {
      throw new Error('未找到指定 MCP')
    }
    record = {
      ...servers[index],
      ...payload,
      tomlConfig: normalizeMcpSnippet(payload.tomlConfig),
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
      tomlConfig: normalizeMcpSnippet(payload.tomlConfig),
      enabled: payload.enabled ?? false,
      createdAt: now,
      updatedAt: now,
    }
    servers.push(record)
  }

  await writeMcpStore(remoteId, servers)
  if (record.enabled) {
    await rewriteConfigMcpSection(remoteId, servers)
  }
  return record
}

export async function toggleRemoteCodexMcp(
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
  await rewriteConfigMcpSection(remoteId, servers)

  return servers[index]
}

export async function deleteRemoteCodexMcp(
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
  await rewriteConfigMcpSection(remoteId, updated)
}

