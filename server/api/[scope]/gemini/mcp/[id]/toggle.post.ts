/**
 * POST /api/:scope/gemini/mcp/:id/toggle
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'
  const id = getRouterParam(event, 'id')

  try {
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少 MCP ID' })
    }

    const { enabled } = await readBody(event)
    if (typeof enabled !== 'boolean') {
      throw createError({ statusCode: 400, message: '缺少 enabled 参数' })
    }

    if (scope === 'local') {
      return await toggleGeminiMcp(id, enabled)
    }
    return await toggleRemoteGeminiMcp(scope, id, enabled)
  } catch (error) {
    return handleApiError(error)
  }
})

