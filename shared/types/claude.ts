export interface ClaudeCodeConfig {
  env?: {
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: number;
    ANTHROPIC_BASE_URL: string;
    ANTHROPIC_AUTH_TOKEN: string;
    [key: string]: unknown;
  };
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  [key: string]: unknown;
}

export interface ClaudeEnvironmentMeta {
  title: string;
  homepage?: string;
  description?: string;
  writeToCommon?: boolean;
}

export interface ClaudeEnvironmentRecord
  extends ClaudeEnvironmentMeta {
  id: string;
  requestUrl: string;
  apiKey: string;
  // 可选：余额查询配置（通用实现）
  balanceUrl?: string; // 余额请求地址
  balanceRequest?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  };
  balanceJsonPath?: string; // 例如：data.quota.quotaRemaining（点分路径）
  balanceFormula?: string; // 例如：value/1000000
  // 运行时字段（不持久化，接口可返回）
  currentBalance?: number;
  balanceUpdatedAt?: string;
  status: "active" | "inactive";
  codeConfig: ClaudeCodeConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ClaudeEnvironmentPayload
  extends ClaudeEnvironmentMeta {
  requestUrl: string;
  apiKey: string;
  balanceUrl?: string;
  balanceRequest?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  };
  balanceJsonPath?: string;
  balanceFormula?: string;
  codeConfig: ClaudeCodeConfig;
  status?: "active" | "inactive";
}

export interface ClaudeGeneralConfig {
  id: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface ClaudeMcpRecord {
  id: string;
  name: string;
  displayName: string;
  docUrl?: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClaudeMcpPayload {
  id?: string;
  name: string;
  displayName: string;
  docUrl?: string;
  config: Record<string, unknown>;
  enabled?: boolean;
}
