/**
 * DELETE /api/:scope/claude/mcp/:id
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'
  const id = getRouterParam(event, 'id')

  try {
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少 MCP ID' })
    }

    if (scope === 'local') {
      await deleteClaudeMcp(id)
    } else {
      await deleteRemoteClaudeMcp(scope, id)
    }

    return { success: true }
  } catch (error) {
    return handleApiError(error)
  }
})

