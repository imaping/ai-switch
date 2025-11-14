import { apiErrorLogger } from '../logger'

/**
 * API 响应辅助函数（Nuxt 版本）
 */

export function handleApiSuccess<T>(data: T) {
  return data
}

export function handleApiError(error: unknown, statusCode = 400) {
  const message =
    error instanceof Error ? error.message : '服务器内部错误，请稍后重试'
  const resolvedStatus = error instanceof Error ? statusCode : 500

  // 记录错误日志
  if (error instanceof Error) {
    apiErrorLogger.error({
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      statusCode: resolvedStatus
    }, `API错误: ${message}`)
  } else {
    apiErrorLogger.error({
      error,
      statusCode: resolvedStatus
    }, '未知API错误')
  }

  throw createError({
    statusCode: resolvedStatus,
    message
  })
}
