import type { ClaudeCodeConfig } from '#shared/types/claude'

export const DEFAULT_CLAUDE_CODE_CONFIG: ClaudeCodeConfig = {
  env: {
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_AUTH_TOKEN: ''
  }
}
