/**
 * DELETE /api/claude/mcp/:id
 * 删除 Claude MCP 服务
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少 MCP ID' })
    }

    await deleteClaudeMcp(id)
    return { success: true }
  } catch (error) {
    return handleApiError(error)
  }
})
