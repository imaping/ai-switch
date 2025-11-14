/**
 * GET /api/:scope/codex/overview
 * scope = local | 远程环境 ID
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    if (scope === 'local') {
      return await getCodexOverview()
    }
    return await getRemoteCodexOverview(scope)
  } catch (error) {
    return handleApiError(error)
  }
})

