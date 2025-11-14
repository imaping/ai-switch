export type RemoteAuthType = "password" | "privateKey";

export interface RemoteEnvironmentMeta {
  title: string;
  description?: string;
  homepage?: string;
}

// 远程连接测试状态
export type RemoteTestStatus = 'ok' | 'error' | 'timeout';

export interface RemoteAuthConfig {
  type: RemoteAuthType;
  password?: string; // 当 type === 'password'
  privateKeyPath?: string; // 当 type === 'privateKey'，推荐使用路径
  privateKey?: string; // 可选：直接保存私钥文本（谨慎）
  passphrase?: string; // 加密私钥的口令
}

export interface RemoteEnvironmentRecord extends RemoteEnvironmentMeta {
  id: string;
  host: string;
  port: number;
  username: string;
  auth: RemoteAuthConfig;
  createdAt: string;
  updatedAt: string;
  // 最近一次连接测试信息（可选）
  lastTestStatus?: RemoteTestStatus;
  lastTestLatencyMs?: number;
  lastTestAt?: string;
  lastTestError?: string;
}

export interface RemoteEnvironmentPayload extends RemoteEnvironmentMeta {
  host: string;
  port?: number;
  username: string;
  auth: RemoteAuthConfig;
}

export interface RemoteOverviewResponse {
  environments: RemoteEnvironmentRecord[];
}

// 远程连接测试接口返回
export interface RemoteTestConnectionResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
  timeout?: boolean;
  testedAt: string;
}

