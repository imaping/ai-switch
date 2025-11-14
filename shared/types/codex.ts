export interface CodexEnvironmentMeta {
  title: string;
  homepage?: string;
  description?: string;
  writeToCommon?: boolean;
}

export interface CodexEnvironmentRecord extends CodexEnvironmentMeta {
  id: string;
  baseUrl: string;
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
  configToml: string;
  createdAt: string;
  updatedAt: string;
}

export interface CodexEnvironmentPayload extends CodexEnvironmentMeta {
  baseUrl: string;
  apiKey: string;
  balanceUrl?: string;
  balanceRequest?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  };
  balanceJsonPath?: string;
  balanceFormula?: string;
  configToml: string;
  status?: "active" | "inactive";
}

export interface CodexGeneralConfig {
  id: string;
  payload: string;
  updatedAt: string;
}

export interface CodexMcpRecord {
  id: string;
  name: string;
  displayName: string;
  docUrl?: string;
  tomlConfig: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CodexMcpPayload {
  id?: string;
  name: string;
  displayName: string;
  docUrl?: string;
  tomlConfig: string;
  enabled?: boolean;
}
