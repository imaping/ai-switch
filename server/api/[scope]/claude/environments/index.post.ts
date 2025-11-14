/**
 * POST /api/:scope/claude/environments
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    const payload = await readBody(event)
    if (scope === 'local') {
      return await createClaudeEnvironment(payload)
    }
    return await createRemoteClaudeEnvironment(scope, payload)
  } catch (error) {
    return handleApiError(error)
  }
})

