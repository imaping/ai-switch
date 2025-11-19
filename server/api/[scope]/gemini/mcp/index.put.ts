/**
 * PUT /api/:scope/gemini/mcp
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    const payload = await readBody(event)
    if (scope === 'local') {
      return await upsertGeminiMcp(payload)
    }
    return await upsertRemoteGeminiMcp(scope, payload)
  } catch (error) {
    return handleApiError(error)
  }
})

