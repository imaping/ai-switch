import type { ClaudeEnvironmentRecord } from '#shared/types/claude'
import type { CodexEnvironmentRecord } from '#shared/types/codex'
import type { GeminiEnvironmentRecord } from '#shared/types/gemini'

export interface BalanceRequestConfig {
  url?: string
  request?: {
    method?: string
    headers?: Record<string, string>
    body?: string
  }
  jsonPath?: string // dot path, e.g., data.quota.quotaRemaining
  formula?: string // e.g., value/1000000
}

export type EnvWithBalance =
  | (Pick<ClaudeEnvironmentRecord, 'apiKey'> & BalanceRequestConfig)
  | (Pick<CodexEnvironmentRecord, 'apiKey'> & BalanceRequestConfig)
  | (Pick<GeminiEnvironmentRecord, 'apiKey'> & BalanceRequestConfig)

function substitutePlaceholders(input: string, apiKey: string) {
  return input.split('{{apiKey}}').join(apiKey)
}

function buildFetchInit(cfg: BalanceRequestConfig, apiKey: string): RequestInit {
  const method = (
    cfg.request?.method ||
    (cfg.request?.body ? 'POST' : 'GET')
  ).toUpperCase()
  const headers: Record<string, string> = { ...(cfg.request?.headers || {}) }

  // If no auth header provided, default to Bearer token
  const hasAuth = Object.keys(headers).some(
    (k) => k.toLowerCase() === 'authorization'
  )
  if (!hasAuth) {
    headers['authorization'] = `Bearer ${apiKey}`
  }

  let body: string | undefined = cfg.request?.body
  if (typeof body === 'string') {
    body = substitutePlaceholders(body, apiKey)
  }

  // Content-Type for JSON body
  if (body && !Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
    headers['content-type'] = 'application/json'
  }

  // placeholder substitution in headers
  for (const [k, v] of Object.entries(headers)) {
    headers[k] = substitutePlaceholders(String(v), apiKey)
  }

  const init: RequestInit = { method, headers }
  if (body) init.body = body
  return init
}

function getByDotPath(obj: unknown, path?: string): unknown {
  if (!path) return obj
  const parts = path.split('.').filter(Boolean)
  let cur: any = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function applyFormula(value: number, formula?: string): number {
  if (!formula) return value
  const trimmed = formula.trim()
  if (!trimmed) return value

  // only allow digits, spaces, operators, dots, parentheses and the identifier 'value'
  const safe = /^[0-9+\-*/().\s]*value[0-9+\-*/().\s]*$|^[0-9+\-*/().\s]+$/
  if (!safe.test(trimmed)) return value

  try {
    // replace standalone 'value' tokens with the numeric literal
    const expr = trimmed.replace(/\bvalue\b/g, String(value))
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr});`)()
    const num = Number(result)
    if (Number.isFinite(num)) return num
    return value
  } catch {
    return value
  }
}

export async function fetchBalance(
  env: EnvWithBalance
): Promise<{ balance?: number; raw?: number; updatedAt: string; error?: string }> {
  const updatedAt = new Date().toISOString()
  const url = env.url?.trim()
  if (!url) {
    return { updatedAt, error: '未配置余额请求地址' }
  }

  try {
    const init = buildFetchInit(
      { url, request: env.request, jsonPath: env.jsonPath, formula: env.formula },
      env.apiKey
    )
    const resp = await fetch(url, init)
    if (!resp.ok) {
      return { updatedAt, error: `请求失败: ${resp.status}` }
    }

    const data = await resp.json()
    const extracted = getByDotPath(data, env.jsonPath)
    const raw = Number(extracted)
    if (!Number.isFinite(raw)) {
      return { updatedAt, error: 'JsonPath 提取非数值' }
    }

    const balance = applyFormula(raw, env.formula)
    return { balance, raw, updatedAt }
  } catch (error) {
    return { updatedAt, error: (error as Error).message }
  }
}
