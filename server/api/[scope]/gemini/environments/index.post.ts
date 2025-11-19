/**
 * POST /api/:scope/gemini/environments
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    const payload = await readBody(event)
    if (scope === 'local') {
      return await createGeminiEnvironment(payload)
    }
    return await createRemoteGeminiEnvironment(scope, payload)
  } catch (error) {
    return handleApiError(error)
  }
})

