import os from 'os'
import path from 'path'

const homeDir = os.homedir()

// Claude 配置路径
export const CLAUDE_SETTINGS_PATH = path.join(homeDir, '.claude', 'settings.json')
export const CLAUDE_MCP_CONFIG_PATH = path.join(homeDir, '.claude.json')

// Gemini 配置路径
export const GEMINI_ENV_PATH = path.join(homeDir, '.gemini', '.env')
export const GEMINI_MCP_CONFIG_PATH = path.join(homeDir, '.gemini', 'settings.json')

// Codex 配置路径
export const CODEX_CONFIG_PATH = path.join(homeDir, '.codex', 'config.toml')
export const CODEX_AUTH_PATH = path.join(homeDir, '.codex', 'auth.json')

// AI Switch 存储目录
export const AI_SWITCH_DIR = path.join(homeDir, '.ai-switch')

// Claude 存储路径
export const CLAUDE_ENV_STORE_PATH = path.join(AI_SWITCH_DIR, 'claude-environments.json')
export const CLAUDE_COMMON_STORE_PATH = path.join(AI_SWITCH_DIR, 'claude-common.json')
export const CLAUDE_MCP_STORE_PATH = path.join(AI_SWITCH_DIR, 'claude-mcp.json')

// Gemini 存储路径
export const GEMINI_ENV_STORE_PATH = path.join(AI_SWITCH_DIR, 'gemini-environments.json')
export const GEMINI_COMMON_STORE_PATH = path.join(AI_SWITCH_DIR, 'gemini-common.json')
export const GEMINI_MCP_STORE_PATH = path.join(AI_SWITCH_DIR, 'gemini-mcp.json')

// Codex 存储路径
export const CODEX_ENV_STORE_PATH = path.join(AI_SWITCH_DIR, 'codex-environments.json')
export const CODEX_COMMON_STORE_PATH = path.join(AI_SWITCH_DIR, 'codex-common.json')
export const CODEX_MCP_STORE_PATH = path.join(AI_SWITCH_DIR, 'codex-mcp.json')

// Remote 存储路径
export const REMOTE_ENV_STORE_PATH = path.join(AI_SWITCH_DIR, 'remote-environments.json')
