/**
 * PUT /api/:scope/claude/common
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    const { content } = await readBody(event)

    if (typeof content !== 'object') {
      throw createError({ statusCode: 400, message: '配置必须是 JSON 对象' })
    }

    if (scope === 'local') {
      return await saveClaudeGeneralConfig(content)
    }
    return await saveRemoteClaudeGeneralConfig(scope, content)
  } catch (error) {
    return handleApiError(error)
  }
})

