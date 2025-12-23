export type RemoteAuthType = "password" | "privateKey";

// 远程环境类型
export type RemoteEnvironmentType = 'ssh' | 'wsl';

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

// WSL 特定配置
export interface WslConfig {
  distroName: string;        // WSL 分发版名称，如 "Ubuntu-22.04"
  isDefault?: boolean;       // 是否为默认分发版
  wslVersion?: 1 | 2;        // WSL 版本
  state?: 'Running' | 'Stopped'; // 运行状态
}

export interface RemoteEnvironmentRecord extends RemoteEnvironmentMeta {
  id: string;

  // 环境类型
  type: RemoteEnvironmentType;

  // SSH 配置（当 type === 'ssh' 时必填）
  host?: string;
  port?: number;
  username?: string;
  auth?: RemoteAuthConfig;

  // WSL 配置（当 type === 'wsl' 时必填）
  wslConfig?: WslConfig;

  createdAt: string;
  updatedAt: string;
  // 最近一次连接测试信息（可选）
  lastTestStatus?: RemoteTestStatus;
  lastTestLatencyMs?: number;
  lastTestAt?: string;
  lastTestError?: string;
}

export interface RemoteEnvironmentPayload extends RemoteEnvironmentMeta {
  type: RemoteEnvironmentType;

  // SSH 配置
  host?: string;
  port?: number;
  username?: string;
  auth?: RemoteAuthConfig;

  // WSL 配置
  wslConfig?: WslConfig;
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

// WSL 分发版发现结果
export interface WslDistroInfo {
  name: string;              // 分发版名称
  state: 'Running' | 'Stopped';
  version: 1 | 2;
  isDefault: boolean;
  homePath?: string;         // Windows 路径，如 \\wsl$\Ubuntu\home\user
}

