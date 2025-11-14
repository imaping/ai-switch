/**
 * PUT /api/codex/mcp/:id
 * 创建或更新 Codex MCP 服务
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少 MCP ID' })
    }

    const payload = await readBody(event)
    const record = await upsertCodexMcp({ ...payload, id })
    return record
  } catch (error) {
    return handleApiError(error)
  }
})

