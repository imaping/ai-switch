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

  throw createError({
    statusCode: resolvedStatus,
    message
  })
}
