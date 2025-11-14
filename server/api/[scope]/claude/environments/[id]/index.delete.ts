/**
 * DELETE /api/:scope/claude/environments/:id
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'
  const id = getRouterParam(event, 'id')

  try {
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少环境 ID' })
    }

    if (scope === 'local') {
      await deleteClaudeEnvironment(id)
    } else {
      await deleteRemoteClaudeEnvironment(scope, id)
    }

    return { success: true }
  } catch (error) {
    return handleApiError(error)
  }
})

