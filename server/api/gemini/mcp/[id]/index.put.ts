/**
 * PUT /api/gemini/mcp/:id
 * 创建或更新 Gemini MCP 服务
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少 MCP ID' })
    }

    const payload = await readBody(event)
    const record = await upsertGeminiMcp({ ...payload, id })
    return record
  } catch (error) {
    return handleApiError(error)
  }
})

