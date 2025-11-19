export interface GeminiEnvironmentMeta {
  title: string;
  homepage?: string;
  description?: string;
  writeToCommon?: boolean;
}

export interface GeminiEnvironmentRecord extends GeminiEnvironmentMeta {
  id: string;
  baseUrl: string;
  apiKey: string;
  model?: string;
  // 可选：余额查询配置（通用实现）
  balanceUrl?: string;
  balanceRequest?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  };
  balanceJsonPath?: string;
  balanceFormula?: string;
  // 运行时字段（不持久化，接口可返回）
  currentBalance?: number;
  balanceUpdatedAt?: string;
  status: 'active' | 'inactive';
  /**
   * 关联 ~/.gemini/.env 的内容，由前端表单生成
   */
  envContent: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeminiEnvironmentPayload extends GeminiEnvironmentMeta {
  baseUrl: string;
  apiKey: string;
  model?: string;
  balanceUrl?: string;
  balanceRequest?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  };
  balanceJsonPath?: string;
  balanceFormula?: string;
  status?: 'active' | 'inactive';
}

export interface GeminiGeneralConfig {
  id: string;
  /**
   * 通用 .env 片段文本
   */
  payload: string;
  updatedAt: string;
}

export interface GeminiMcpRecord {
  id: string;
  name: string;
  displayName: string;
  docUrl?: string;
  /**
   * MCP 配置 JSON（写入 ~/.gemini/settings.json 的 mcpServers[name]）
   */
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeminiMcpPayload {
  id?: string;
  name: string;
  displayName: string;
  docUrl?: string;
  config: Record<string, unknown>;
  enabled?: boolean;
}
