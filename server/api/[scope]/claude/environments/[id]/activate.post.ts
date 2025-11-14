/**
 * POST /api/:scope/claude/environments/:id/activate
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'
  const id = getRouterParam(event, 'id')

  try {
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少环境 ID' })
    }

    if (scope === 'local') {
      return await activateClaudeEnvironment(id)
    }
    return await activateRemoteClaudeEnvironment(scope, id)
  } catch (error) {
    return handleApiError(error)
  }
})

