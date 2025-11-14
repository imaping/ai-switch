/**
 * PUT /api/:scope/codex/environments/:id
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'
  const id = getRouterParam(event, 'id')

  try {
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少环境 ID' })
    }
    const payload = await readBody(event)
    if (scope === 'local') {
      return await updateCodexEnvironment(id, payload)
    }
    return await updateRemoteCodexEnvironment(scope, id, payload)
  } catch (error) {
    return handleApiError(error)
  }
})

