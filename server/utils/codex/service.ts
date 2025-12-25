import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import * as TOML from '@iarna/toml'
import type {
  CodexEnvironmentPayload,
  CodexEnvironmentRecord,
  CodexGeneralConfig,
  CodexMcpPayload,
  CodexMcpRecord
} from '#shared/types/codex'
import { codexServiceLogger } from '../logger'

type TomlObject = Record<string, unknown>
type BaseUrlTarget = { scope: 'root' } | { scope: 'provider'; name: string }

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

const stringifyToml = (content: TomlObject): string => {
  const raw = TOML.stringify(content as any)
  // 移除 @iarna/toml 自动添加的缩进
  // 将所有以空格开头的行（表头和键值对）移到行首
  return raw.replace(/^[ \t]+(\[|[A-Za-z_])/gm, '$1')
}

function stripMcpServers(content: string): string {
  try {
    const parsed = parseToml(content)
    if (!('mcp_servers' in parsed)) {
      return content
    }
    delete parsed.mcp_servers
    return stringifyToml(parsed)
  } catch {
    return content
  }
}

// ========== Codex Config File 读写 ==========

async function readCodexConfigFile(): Promise<CodexConfigFile | null> {
  try {
    const raw = await fs.readFile(CODEX_CONFIG_PATH, 'utf-8')
    return { raw, parsed: parseToml(raw) }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    codexServiceLogger.error({ error, path: CODEX_CONFIG_PATH }, '读取 Codex 配置文件失败')
    throw error
  }
}

async function writeCodexConfigString(content: string) {
  await ensureDirExists(CODEX_CONFIG_PATH)
  await fs.writeFile(CODEX_CONFIG_PATH, content, 'utf-8')
}

async function writeCodexConfigObject(object: TomlObject) {
  const serialized = stringifyToml(object)
  await writeCodexConfigString(serialized)
}

// ========== Codex Auth File 读写 ==========

async function readCodexAuthFile(): Promise<CodexAuthFile> {
  return readJsonFile<CodexAuthFile>(CODEX_AUTH_PATH, {})
}

async function writeCodexAuthFile(updater: (current: CodexAuthFile) => CodexAuthFile) {
  const current = await readCodexAuthFile()
  const next = updater(current)
  await writeJsonFile(CODEX_AUTH_PATH, next)
}

// ========== Environment Store 读写 ==========

async function readEnvironmentStore() {
  const file = await readJsonFile<CodexEnvironmentStoreFile>(
    CODEX_ENV_STORE_PATH,
    EMPTY_ENV_STORE
  )
  return file.environments ?? []
}

async function writeEnvironmentStore(environments: CodexEnvironmentRecord[]) {
  await writeJsonFile(CODEX_ENV_STORE_PATH, { environments })
}

// ========== General Config Store 读写 ==========

async function readGeneralConfigStore(): Promise<CodexGeneralConfig | undefined> {
  const record = await readJsonFile<CodexGeneralConfig | null>(
    CODEX_COMMON_STORE_PATH,
    null
  )
  return record ?? undefined
}

async function writeGeneralConfigStore(payload: string) {
  const record: CodexGeneralConfig = {
    id: GENERAL_CONFIG_ID,
    payload,
    updatedAt: new Date().toISOString()
  }
  await writeJsonFile(CODEX_COMMON_STORE_PATH, record)
  return record
}

// ========== MCP Store 读写 ==========

async function readMcpStore(): Promise<CodexMcpRecord[]> {
  const file = await readJsonFile<CodexMcpStoreFile>(
    CODEX_MCP_STORE_PATH,
    EMPTY_MCP_STORE
  )
  return file.servers ?? []
}

async function writeMcpStore(servers: CodexMcpRecord[]) {
  await writeJsonFile(CODEX_MCP_STORE_PATH, { servers })
}

// ========== BaseUrl 处理函数 ==========

function getBaseUrl(config: TomlObject): string | undefined {
  const direct = config.base_url
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim()
  }
  const providers = config.model_providers
  if (isPlainObject(providers)) {
    for (const value of Object.values(providers)) {
      if (
        isPlainObject(value) &&
        typeof value.base_url === 'string' &&
        value.base_url.trim()
      ) {
        return value.base_url.trim()
      }
    }
  }
  return undefined
}

function collectBaseUrlTargets(config: TomlObject): BaseUrlTarget[] {
  const targets: BaseUrlTarget[] = []
  if ('base_url' in config) {
    targets.push({ scope: 'root' })
  }
  const providers = config.model_providers
  if (isPlainObject(providers)) {
    Object.entries(providers).forEach(([name, provider]) => {
      if (isPlainObject(provider) && 'base_url' in provider) {
        targets.push({ scope: 'provider', name })
      }
    })
  }
  return targets
}

function applyBaseUrl(config: TomlObject, baseUrl: string) {
  const targets = collectBaseUrlTargets(config)
  if (targets.length === 0) {
    config.base_url = baseUrl
    return
  }
  const providers = config.model_providers
  targets.forEach((target) => {
    if (target.scope === 'root') {
      config.base_url = baseUrl
      return
    }
    if (
      isPlainObject(providers) &&
      isPlainObject(providers[target.name]) &&
      'base_url' in (providers[target.name] as TomlObject)
    ) {
      ;(providers[target.name] as TomlObject).base_url = baseUrl
    }
  })
}

function normalizeConfigToml(
  configToml: string,
  baseUrl: string
): { serialized: string } {
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
  config: TomlObject,
  servers?: CodexMcpRecord[]
) {
  const records = servers ?? (await readMcpStore())
  if (records.length === 0) {
    delete config.mcp_servers
    return config
  }
  const managedNames = new Set(records.map((record) => record.name))
  const existing = isPlainObject(config.mcp_servers)
    ? { ...(config.mcp_servers as TomlObject) }
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
    config.mcp_servers = preserved
  } else {
    delete config.mcp_servers
  }
  return config
}

async function rewriteConfigMcpSection(servers?: CodexMcpRecord[]) {
  const base = (await readCodexConfigFile())?.parsed ?? {}
  const merged = await mergeMcpIntoConfig(base, servers)
  await writeCodexConfigObject(merged)
}

// ========== 同步函数 ==========

async function syncActiveEnvironment(environments: CodexEnvironmentRecord[]) {
  const configFile = await readCodexConfigFile()
  const authFile = await readCodexAuthFile()
  if (!configFile?.parsed || !authFile.OPENAI_API_KEY) {
    return environments
  }

  const sanitizedConfigToml = stripMcpServers(configFile.raw)
  const baseUrl = getBaseUrl(configFile.parsed)
  const apiKey = authFile.OPENAI_API_KEY?.toString() ?? ''
  if (!baseUrl || !apiKey) {
    return environments
  }

  const now = new Date().toISOString()
  let updated = environments.map((env) =>
    env.baseUrl === baseUrl && env.apiKey === apiKey
      ? {
          ...env,
          status: 'active' as const,
          configToml: sanitizedConfigToml,
          updatedAt: now
        }
      : { ...env, status: 'inactive' as const }
  )

  const exists = updated.some(
    (env) => env.baseUrl === baseUrl && env.apiKey === apiKey
  )

  if (!exists) {
    updated = [
      ...updated,
      {
        id: randomUUID(),
        title: '当前环境',
        baseUrl,
        apiKey,
        status: 'active',
        configToml: sanitizedConfigToml,
        createdAt: now,
        updatedAt: now
      }
    ]
  }

  await writeEnvironmentStore(updated)
  return updated
}

async function syncMcpRecords(records: CodexMcpRecord[]) {
  const config = await readCodexConfigFile()
  const fromFile = isPlainObject(config?.parsed?.mcp_servers)
    ? (config!.parsed!.mcp_servers as TomlObject)
    : {}
  const now = new Date().toISOString()
  const updated = records.map((record) => {
    if (record.name in fromFile) {
      return {
        ...record,
        enabled: true,
        tomlConfig: stringifyToml(fromFile[record.name] as TomlObject),
        updatedAt: now
      }
    }
    return { ...record, enabled: false }
  })

  Object.entries(fromFile).forEach(([name, value]) => {
    if (updated.some((item) => item.name === name)) {
      return
    }
    updated.push({
      id: randomUUID(),
      name,
      displayName: name,
      docUrl: '',
      tomlConfig: stringifyToml(value as TomlObject),
      enabled: true,
      createdAt: now,
      updatedAt: now
    })
  })

  await writeMcpStore(updated)
  return updated
}

// ========== 导出的服务函数 ==========

export async function getCodexOverview() {
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

export async function createCodexEnvironment(payload: CodexEnvironmentPayload) {
  validateEnvironmentPayload(payload)
  const now = new Date().toISOString()
  const environments = await readEnvironmentStore()
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
    updatedAt: now
  }

  const updated = [...environments, record]
  await writeEnvironmentStore(updated)

  if (record.status === 'active') {
    await activateCodexEnvironment(record.id)
  }

  return record
}

export async function updateCodexEnvironment(
  id: string,
  payload: CodexEnvironmentPayload
) {
  validateEnvironmentPayload(payload)
  const environments = await readEnvironmentStore()
  const index = environments.findIndex((env) => env.id === id)
  if (index === -1) {
    throw new Error('未找到指定环境')
  }

  const now = new Date().toISOString()
  const normalized = normalizeConfigToml(payload.configToml, payload.baseUrl)
  const nextRecord: CodexEnvironmentRecord = {
    id:environments[index].id,
    ...payload,
    configToml: normalized.serialized,
    status: payload.status ?? environments[index].status,
    createdAt:environments[index].createdAt,
    updatedAt: now
  }

  environments[index] = nextRecord
  await writeEnvironmentStore(environments)

  if (nextRecord.status === 'active') {
    await activateCodexEnvironment(id)
  }

  return nextRecord
}

export async function getCodexEnvironment(id: string) {
  const environments = await readEnvironmentStore()
  const record = environments.find((env) => env.id === id)
  if (!record) {
    codexServiceLogger.warn({ id }, 'Codex 环境不存在')
    throw new Error('环境不存在')
  }
  return record
}

export async function deleteCodexEnvironment(id: string) {
  const environments = await readEnvironmentStore()
  const record = environments.find((env) => env.id === id)
  if (!record) {
    codexServiceLogger.warn({ id }, '删除失败：Codex 环境不存在')
    throw new Error('环境不存在')
  }
  if (record.status === 'active') {
    codexServiceLogger.warn({ id, status: record.status }, '删除失败：Codex 环境处于启用状态')
    throw new Error('启用状态不可删除')
  }
  const updated = environments.filter((env) => env.id !== id)
  await writeEnvironmentStore(updated)
  codexServiceLogger.info({ id, title: record.title }, 'Codex 环境已删除')
}

export async function activateCodexEnvironment(id: string) {
  const environments = await readEnvironmentStore()
  const record = environments.find((env) => env.id === id)
  if (!record) {
    codexServiceLogger.warn({ id }, '激活失败：Codex 环境不存在')
    throw new Error('环境不存在')
  }

  const parsed = parseToml(record.configToml)
  applyBaseUrl(parsed, record.baseUrl)
  const merged = await mergeMcpIntoConfig(parsed)
  await writeCodexConfigObject(merged)
  await writeCodexAuthFile((current) => ({
    ...current,
    OPENAI_API_KEY: record.apiKey
  }))

  const now = new Date().toISOString()
  const updated = environments.map((env) =>
    env.id === id
      ? { ...env, status: 'active' as const, updatedAt: now }
      : { ...env, status: 'inactive' as const }
  )
  await writeEnvironmentStore(updated)

  codexServiceLogger.info({ id, title: record.title }, 'Codex 环境已激活')
  return { ...record, status: 'active' as const, updatedAt: now }
}

export async function saveCodexGeneralConfig(content: string) {
  const parsed = parseToml(content)
  const serialized = stringifyToml(parsed)
  return writeGeneralConfigStore(serialized)
}

export async function upsertCodexMcp(payload: CodexMcpPayload) {
  if (!payload.name?.trim()) {
    throw new Error('名称必填')
  }
  if (typeof payload.tomlConfig !== 'string') {
    throw new Error('MCP 配置必须是 TOML 字符串')
  }

  const servers = await readMcpStore()
  const now = new Date().toISOString()
  let record: CodexMcpRecord | undefined

  if (payload.id) {
    const index = servers.findIndex((item) => item.id === payload.id)
    if (index === -1) {
      codexServiceLogger.warn({ id: payload.id }, '更新失败：Codex MCP 不存在')
      throw new Error('未找到指定 MCP')
    }
    record = {
      ...servers[index],
      ...payload,
      tomlConfig: normalizeMcpSnippet(payload.tomlConfig),
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
      tomlConfig: normalizeMcpSnippet(payload.tomlConfig),
      enabled: payload.enabled ?? false,
      createdAt: now,
      updatedAt: now
    }
    servers.push(record)
  }

  await writeMcpStore(servers)
  if (record.enabled) {
    await rewriteConfigMcpSection(servers)
  }
  return record
}

export async function toggleCodexMcp(id: string, enabled: boolean) {
  const servers = await readMcpStore()
  const index = servers.findIndex((item) => item.id === id)
  if (index === -1) {
    codexServiceLogger.warn({ id }, '切换失败：Codex MCP 不存在')
    throw new Error('未找到指定 MCP')
  }

  servers[index] = {
    ...servers[index],
    enabled,
    updatedAt: new Date().toISOString()
  }
  await writeMcpStore(servers)
  await rewriteConfigMcpSection(servers)

  codexServiceLogger.info({ id, name: servers[index].name, enabled }, 'Codex MCP 状态已切换')
  return servers[index]
}

export async function deleteCodexMcp(id: string) {
  const servers = await readMcpStore()
  const record = servers.find((item) => item.id === id)
  if (!record) {
    codexServiceLogger.warn({ id }, '删除失败：Codex MCP 不存在')
    throw new Error('MCP 配置不存在')
  }
  if (record.enabled) {
    codexServiceLogger.warn({ id, name: record.name }, '删除失败：Codex MCP 处于启用状态')
    throw new Error('启用状态不可删除')
  }
  const updated = servers.filter((item) => item.id !== id)
  await writeMcpStore(updated)
  await rewriteConfigMcpSection(updated)
  codexServiceLogger.info({ id, name: record.name }, 'Codex MCP 已删除')
}
