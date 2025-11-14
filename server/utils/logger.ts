import pino from 'pino'

/**
 * 日志配置
 */
const isDevelopment = process.env.NODE_ENV === 'development'
const isWindows = process.platform === 'win32'

/**
 * 判断是否使用美化输出
 * Windows 控制台默认使用 GBK 编码，pino-pretty 的 UTF-8 输出会乱码
 * 可以通过环境变量 USE_PRETTY_LOG=true 强制启用美化输出
 */
const usePrettyLog = process.env.USE_PRETTY_LOG === 'true' ||
  (isDevelopment && !isWindows)

/**
 * 创建基础日志记录器
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: usePrettyLog
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },
})

/**
 * 创建 SSH 连接池专用日志记录器
 */
export const sshPoolLogger = logger.child({
  module: 'ssh-pool',
})

/**
 * 创建远程环境服务日志记录器
 */
export const remoteServiceLogger = logger.child({
  module: 'remote-service',
})

/**
 * 创建 SFTP 服务日志记录器
 */
export const sftpLogger = logger.child({
  module: 'sftp',
})

/**
 * 创建 Claude 服务日志记录器
 */
export const claudeServiceLogger = logger.child({
  module: 'claude-service',
})

/**
 * 创建 Codex 服务日志记录器
 */
export const codexServiceLogger = logger.child({
  module: 'codex-service',
})

/**
 * 创建 API 错误日志记录器
 */
export const apiErrorLogger = logger.child({
  module: 'api-error',
})

/**
 * 导出日志级别枚举
 */
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const

export type LogLevelType = typeof LogLevel[keyof typeof LogLevel]
