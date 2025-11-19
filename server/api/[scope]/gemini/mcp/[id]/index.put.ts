/**
 * PUT /api/:scope/gemini/mcp/:id
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'
  const id = getRouterParam(event, 'id')

  try {
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少 MCP ID' })
    }

    const payload = await readBody(event)
    if (scope === 'local') {
      return await upsertGeminiMcp({ ...payload, id })
    }
    return await upsertRemoteGeminiMcp(scope, { ...payload, id })
  } catch (error) {
    return handleApiError(error)
  }
})

