/**
 * DELETE /api/:scope/codex/environments/:id
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'
  const id = getRouterParam(event, 'id')

  try {
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少环境 ID' })
    }

    if (scope === 'local') {
      await deleteCodexEnvironment(id)
    } else {
      await deleteRemoteCodexEnvironment(scope, id)
    }

    return { success: true }
  } catch (error) {
    return handleApiError(error)
  }
})

