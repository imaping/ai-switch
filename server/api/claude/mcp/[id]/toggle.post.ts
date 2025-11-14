/**
 * POST /api/claude/mcp/:id/toggle
 * 切换 Claude MCP 服务启用状态
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少 MCP ID' })
    }

    const { enabled } = await readBody(event)

    if (typeof enabled !== 'boolean') {
      throw createError({ statusCode: 400, message: '缺少 enabled 参数' })
    }

    const record = await toggleClaudeMcp(id, enabled)
    return record
  } catch (error) {
    return handleApiError(error)
  }
})
