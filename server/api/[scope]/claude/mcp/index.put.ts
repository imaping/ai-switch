/**
 * PUT /api/:scope/claude/mcp
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    const payload = await readBody(event)
    if (scope === 'local') {
      return await upsertClaudeMcp(payload)
    }
    return await upsertRemoteClaudeMcp(scope, payload)
  } catch (error) {
    return handleApiError(error)
  }
})

