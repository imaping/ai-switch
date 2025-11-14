/**
 * POST /api/:scope/codex/environments
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    const payload = await readBody(event)
    if (scope === 'local') {
      return await createCodexEnvironment(payload)
    }
    return await createRemoteCodexEnvironment(scope, payload)
  } catch (error) {
    return handleApiError(error)
  }
})

