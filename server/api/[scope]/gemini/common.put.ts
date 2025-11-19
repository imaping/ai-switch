/**
 * PUT /api/:scope/gemini/common
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    const { content } = await readBody(event)
    if (typeof content !== 'string') {
      throw createError({ statusCode: 400, message: '配置必须是字符串' })
    }

    if (scope === 'local') {
      return await saveGeminiGeneralConfig(content)
    }
    return await saveRemoteGeminiGeneralConfig(scope, content)
  } catch (error) {
    return handleApiError(error)
  }
})

