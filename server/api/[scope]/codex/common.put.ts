/**
 * PUT /api/:scope/codex/common
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    const { content } = await readBody(event)
    if (typeof content !== 'string' && typeof content !== 'object') {
      throw createError({ statusCode: 400, message: '配置格式不正确' })
    }

    if (scope === 'local') {
      return await saveCodexGeneralConfig(content as any)
    }
    return await saveRemoteCodexGeneralConfig(scope, content as any)
  } catch (error) {
    return handleApiError(error)
  }
})

