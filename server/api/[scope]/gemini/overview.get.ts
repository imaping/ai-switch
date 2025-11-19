/**
 * GET /api/:scope/gemini/overview
 * scope = local | 远程环境 ID
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    if (scope === 'local') {
      return await getGeminiOverview()
    }
    return await getRemoteGeminiOverview(scope)
  } catch (error) {
    return handleApiError(error)
  }
})

